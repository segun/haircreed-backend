import { BadGatewayException, Injectable } from "@nestjs/common";
import * as PDFDocument from "pdfkit";
import { ReceiptLineItem } from "../types";

export interface RenderReceiptPayload {
  receiptNumber: number;
  receiptDate: number;
  businessName: string;
  businessAddress: string;
  businessLogo?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  currency: string;
  lineItems: ReceiptLineItem[];
  lineTotals: number[];
  totalAmount: number;
  renderTimestamp: number;
}

@Injectable()
export class ReceiptRendererService {
  async render(receipt: RenderReceiptPayload): Promise<Buffer> {
    try {
      const timestamp = new Date(receipt.renderTimestamp);
      const doc = new PDFDocument({
        margin: 48,
        info: {
          Title: `Receipt ${receipt.receiptNumber}`,
          Author: receipt.businessName,
          CreationDate: timestamp,
          ModDate: timestamp,
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));

      let y = 48;
      if (receipt.businessLogo) {
        const match = /^data:image\/(?:png|jpe?g);base64,(.+)$/i.exec(
          receipt.businessLogo,
        );
        if (!match) {
          throw new Error("Business logo must be a PNG or JPEG data URL");
        }
        doc.image(Buffer.from(match[1], "base64"), 48, y, { fit: [64, 64] });
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(receipt.businessName, 128, y);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(receipt.businessAddress, 128, y + 28);
      y += 90;
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text(`Receipt #${receipt.receiptNumber}`);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(new Date(receipt.receiptDate).toISOString());
      doc.moveDown();
      doc.text(receipt.customerName);
      doc.text(receipt.customerEmail);
      doc.text(receipt.customerPhone);
      doc.moveDown();

      receipt.lineItems.forEach((lineItem, index) => {
        doc.font("Helvetica-Bold").text(lineItem.description);
        doc
          .font("Helvetica")
          .text(
            `${lineItem.quantity} x ${
              receipt.currency
            }${lineItem.amount.toFixed(2)} - ${
              receipt.currency
            }${lineItem.discount.toFixed(2)} = ${
              receipt.currency
            }${receipt.lineTotals[index].toFixed(2)}`,
          );
        doc.moveDown(0.5);
      });

      doc.moveDown();
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text(`Total: ${receipt.currency}${receipt.totalAmount.toFixed(2)}`, {
          align: "right",
        });

      return await new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        doc.end();
      });
    } catch (error) {
      throw new BadGatewayException({
        message: "Receipt PDF generation failed",
        code: "PDF_RENDER_FAILED",
        fieldErrors: {},
      });
    }
  }
}
