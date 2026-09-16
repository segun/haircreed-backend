import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { createHash } from "crypto";
import db, { id } from "../database/database";
import { MailService } from "../mail/mail.service";
import { Receipt } from "../types";
import { ResolveReceiptDraftDto } from "./dto/resolve-receipt-draft.dto";
import { SendReceiptDto } from "./dto/send-receipt.dto";
import { ReceiptCalculator } from "./receipt-calculator";
import {
  ReceiptRendererService,
  RenderReceiptPayload,
} from "./receipt-renderer.service";

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly calculator: ReceiptCalculator,
    private readonly renderer: ReceiptRendererService,
    private readonly mailService: MailService,
  ) {}

  async resolveDraft(
    request: ResolveReceiptDraftDto,
  ): Promise<{ receipt: Receipt; created: boolean }> {
    const orderResponse = await db.query({
      Orders: {
        $: { where: { id: request.orderId } },
        customer: {},
      },
    });
    const order = orderResponse.Orders[0];
    if (!order) {
      throw this.notFound("ORDER_NOT_FOUND", "Order not found");
    }
    if (order.paymentStatus !== "PAID") {
      throw new ConflictException({
        message: "A receipt can only be created for a paid order",
        code: "ORDER_NOT_PAID",
        fieldErrors: {},
      });
    }

    const existing = await this.findByOrderId(request.orderId);
    if (existing) {
      return { receipt: existing, created: false };
    }
    if (!order.customer) {
      throw this.notFound("CUSTOMER_NOT_FOUND", "Order customer not found");
    }

    const settingsResponse = await db.query({ AppSettings: {} });
    const settings = settingsResponse.AppSettings[0]?.settings as any;
    if (
      !settings?.businessName?.trim() ||
      !settings?.businessAddress?.trim() ||
      !settings?.currency?.trim()
    ) {
      throw new UnprocessableEntityException({
        message: "Receipt defaults are incomplete",
        code: "RECEIPT_DEFAULTS_INCOMPLETE",
        fieldErrors: {},
      });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const receiptsResponse = await db.query({ Receipts: {} });
      const receiptNumber =
        receiptsResponse.Receipts.reduce(
          (maximum, receipt) => Math.max(maximum, receipt.receiptNumber),
          0,
        ) + 1;
      const receiptId = id();
      const now = Date.now();
      const receiptData = {
        receiptNumber,
        orderId: order.id,
        customerId: order.customer.id,
        customerName: order.customer.fullName,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phoneNumber,
        receiptDate: now,
        status: "DRAFT",
        businessName: settings.businessName.trim(),
        businessAddress: settings.businessAddress.trim(),
        ...(settings.businessLogo
          ? { businessLogo: settings.businessLogo }
          : {}),
        currency: settings.currency.trim(),
        lineItems: [],
        totalAmount: 0,
        createdByUserId: request.userId,
        updatedByUserId: request.userId,
        createdAt: now,
        updatedAt: now,
        sendCount: 0,
      };

      try {
        await db.transact([
          db.tx.Receipts[receiptId].create(receiptData),
          db.tx.Receipts[receiptId].link({ order: order.id }),
          db.tx.Receipts[receiptId].link({ customer: order.customer.id }),
        ]);
        return {
          receipt: await this.findById(receiptId),
          created: true,
        };
      } catch (error) {
        const concurrent = await this.findByOrderId(request.orderId);
        if (concurrent) {
          return { receipt: concurrent, created: false };
        }
      }
    }

    throw new ConflictException({
      message: "Could not allocate a unique receipt number",
      code: "ALLOCATION_CONFLICT",
      fieldErrors: {},
    });
  }

  async send(
    receiptId: string,
    idempotencyKey: string,
    request: SendReceiptDto,
  ): Promise<{ buffer: Buffer; receiptNumber: number }> {
    if (!idempotencyKey?.trim()) {
      throw new ConflictException({
        message: "Idempotency-Key header is required",
        code: "IDEMPOTENCY_KEY_REQUIRED",
        fieldErrors: {},
      });
    }

    const payloadHash = createHash("sha256")
      .update(JSON.stringify(request))
      .digest("hex");
    const priorAttempt = await this.findAttempt(idempotencyKey);
    if (priorAttempt) {
      if (priorAttempt.payloadHash !== payloadHash) {
        throw new ConflictException({
          message:
            "Idempotency key was already used with different receipt data",
          code: "IDEMPOTENCY_KEY_REUSED",
          fieldErrors: {},
        });
      }
      if (priorAttempt.state === "SUCCESS") {
        const payload = priorAttempt.payload as RenderReceiptPayload;
        return {
          buffer: await this.renderer.render(payload),
          receiptNumber: payload.receiptNumber,
        };
      }
      if (priorAttempt.state === "FAILED") {
        await db.transact([
          db.tx.ReceiptDeliveryAttempts[priorAttempt.id].delete(),
        ]);
      } else {
        throw new ConflictException({
          message: "The delivery state must be reconciled before retrying",
          code:
            priorAttempt.state === "UNKNOWN"
              ? "DELIVERY_STATE_UNKNOWN"
              : "DELIVERY_IN_PROGRESS",
          fieldErrors: {},
        });
      }
    }

    const receipt = await this.findById(receiptId);
    if (receipt.order?.paymentStatus !== "PAID") {
      throw new ConflictException({
        message: "Receipt order is not paid",
        code: "ORDER_NOT_PAID",
        fieldErrors: {},
      });
    }

    const customerResponse = await db.query({
      Customers: { $: { where: { id: request.customerId } } },
    });
    const customer = customerResponse.Customers[0];
    if (!customer) {
      throw this.notFound("CUSTOMER_NOT_FOUND", "Customer not found");
    }
    if (!/^\S+@\S+\.\S+$/.test(customer.email?.trim() ?? "")) {
      throw new UnprocessableEntityException({
        message: "Customer must have a valid email address",
        code: "INVALID_CUSTOMER_EMAIL",
        fieldErrors: {
          customerId: "Selected customer has no valid email address",
        },
      });
    }

    const calculation = this.calculator.calculate(request.lineItems);
    const renderTimestamp = Date.now();
    const payload: RenderReceiptPayload = {
      receiptNumber: receipt.receiptNumber,
      receiptDate: request.receiptDate,
      businessName: request.businessName.trim(),
      businessAddress: request.businessAddress.trim(),
      businessLogo: request.businessLogo,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: customer.phoneNumber,
      currency: request.currency.trim(),
      lineItems: request.lineItems,
      lineTotals: calculation.lineTotals,
      totalAmount: calculation.totalAmount,
      renderTimestamp,
    };
    const attemptId = id();

    try {
      await db.transact([
        db.tx.ReceiptDeliveryAttempts[attemptId].create({
          idempotencyKey,
          receiptId,
          payloadHash,
          payload,
          renderTimestamp,
          state: "PENDING",
          createdAt: renderTimestamp,
          updatedAt: renderTimestamp,
        }),
        db.tx.ReceiptDeliveryLocks[receiptId].create({
          receiptId,
          attemptId,
          createdAt: renderTimestamp,
        }),
      ]);
    } catch (error) {
      throw new ConflictException({
        message: "Another delivery is already in progress for this receipt",
        code: "DELIVERY_IN_PROGRESS",
        fieldErrors: {},
      });
    }

    let buffer: Buffer;
    try {
      buffer = await this.renderer.render(payload);
    } catch (error) {
      await this.failAttemptBeforeDelivery(
        attemptId,
        receiptId,
        "PDF_RENDER_FAILED",
      );
      throw error;
    }
    try {
      await this.mailService.send({
        to: customer.email,
        subject: `Receipt ${receipt.receiptNumber} from ${payload.businessName}`,
        html: this.buildEmailHtml(payload),
        text: this.buildEmailText(payload),
        attachments: [
          {
            content: buffer.toString("base64"),
            filename: `receipt_${receipt.receiptNumber}.pdf`,
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      });
    } catch (error) {
      await this.markAttemptUnknown(attemptId, "EMAIL_DELIVERY_UNKNOWN");
      throw new BadGatewayException({
        message: "Receipt email delivery failed or could not be confirmed",
        code: "EMAIL_DELIVERY_FAILED",
        fieldErrors: {},
      });
    }

    const now = Date.now();
    const receiptUpdate: any = {
      receiptDate: request.receiptDate,
      businessName: payload.businessName,
      businessAddress: payload.businessAddress,
      currency: payload.currency,
      customerId: customer.id,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: customer.phoneNumber,
      lineItems: request.lineItems,
      totalAmount: calculation.totalAmount,
      status: "SENT",
      updatedByUserId: request.userId,
      updatedAt: now,
      sendCount: receipt.sendCount + 1,
      businessLogo: request.businessLogo ?? "",
      ...(receipt.sentAt ? { resentAt: now } : { sentAt: now }),
    };
    const transactions: any[] = [
      db.tx.Receipts[receiptId].update(receiptUpdate),
      db.tx.ReceiptDeliveryAttempts[attemptId].update({
        state: "SUCCESS",
        providerResult: { accepted: true },
        updatedAt: now,
      }),
      db.tx.ReceiptDeliveryLocks[receiptId].delete(),
    ];
    if (receipt.customer?.id && receipt.customer.id !== customer.id) {
      transactions.push(
        db.tx.Receipts[receiptId].unlink({ customer: receipt.customer.id }),
      );
      transactions.push(
        db.tx.Receipts[receiptId].link({ customer: customer.id }),
      );
    } else if (!receipt.customer?.id) {
      transactions.push(
        db.tx.Receipts[receiptId].link({ customer: customer.id }),
      );
    }

    try {
      await db.transact(transactions);
    } catch (error) {
      await this.markAttemptUnknown(
        attemptId,
        "PERSISTENCE_AFTER_EMAIL_FAILED",
      );
      throw new BadGatewayException({
        message:
          "Email was accepted but receipt persistence could not be confirmed",
        code: "DELIVERY_STATE_UNKNOWN",
        fieldErrors: {},
      });
    }

    return { buffer, receiptNumber: receipt.receiptNumber };
  }

  private async findById(receiptId: string): Promise<Receipt> {
    const response = await db.query({
      Receipts: {
        $: { where: { id: receiptId } },
        order: {},
        customer: {},
      },
    });
    if (!response.Receipts[0]) {
      throw this.notFound("RECEIPT_NOT_FOUND", "Receipt not found");
    }
    return response.Receipts[0] as Receipt;
  }

  private async findByOrderId(orderId: string): Promise<Receipt | null> {
    const response = await db.query({
      Receipts: {
        $: { where: { orderId } },
        order: {},
        customer: {},
      },
    });
    return (response.Receipts[0] as Receipt) ?? null;
  }

  private async findAttempt(idempotencyKey: string): Promise<any | null> {
    const response = await db.query({
      ReceiptDeliveryAttempts: { $: { where: { idempotencyKey } } },
    });
    return response.ReceiptDeliveryAttempts[0] ?? null;
  }

  private async markAttemptUnknown(
    attemptId: string,
    errorCode: string,
  ): Promise<void> {
    try {
      await db.transact([
        db.tx.ReceiptDeliveryAttempts[attemptId].update({
          state: "UNKNOWN",
          errorCode,
          updatedAt: Date.now(),
        }),
      ]);
    } catch (error) {
      // Keep the delivery lock in place even when recording the diagnostic fails.
    }
  }

  private async failAttemptBeforeDelivery(
    attemptId: string,
    receiptId: string,
    errorCode: string,
  ): Promise<void> {
    try {
      await db.transact([
        db.tx.ReceiptDeliveryAttempts[attemptId].update({
          state: "FAILED",
          errorCode,
          updatedAt: Date.now(),
        }),
        db.tx.ReceiptDeliveryLocks[receiptId].delete(),
      ]);
    } catch (error) {
      await this.markAttemptUnknown(attemptId, errorCode);
    }
  }

  private buildEmailHtml(payload: RenderReceiptPayload): string {
    const escape = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const rows = payload.lineItems
      .map(
        (item, index) =>
          `<tr><td>${escape(item.description)}</td><td>${
            item.quantity
          }</td><td>${escape(payload.currency)}${item.amount.toFixed(
            2,
          )}</td><td>${escape(payload.currency)}${payload.lineTotals[
            index
          ].toFixed(2)}</td></tr>`,
      )
      .join("");
    return `<h1>${escape(payload.businessName)}</h1><p>Receipt #${
      payload.receiptNumber
    }</p><table>${rows}</table><p><strong>Total: ${escape(
      payload.currency,
    )}${payload.totalAmount.toFixed(2)}</strong></p>`;
  }

  private buildEmailText(payload: RenderReceiptPayload): string {
    return [
      payload.businessName,
      `Receipt #${payload.receiptNumber}`,
      ...payload.lineItems.map(
        (item, index) =>
          `${item.description}: ${payload.currency}${payload.lineTotals[
            index
          ].toFixed(2)}`,
      ),
      `Total: ${payload.currency}${payload.totalAmount.toFixed(2)}`,
    ].join("\n");
  }

  private notFound(code: string, message: string): NotFoundException {
    return new NotFoundException({ message, code, fieldErrors: {} });
  }
}
