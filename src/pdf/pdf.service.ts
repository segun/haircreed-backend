import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import db from '../instant';
import { DownloadReceiptDto, ReceiptItemDto } from './dto/create-pdf.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PdfService {
  constructor(private readonly mailService: MailService) {}

  async generateReceipt(orderId: string, body: DownloadReceiptDto = {}): Promise<any> {
    const data = await db.query({
      Orders: {
        $: {
          where: { id: orderId },
        },
        customer: {},
      },
    });

    const order = data.Orders;

    if (!order) {
      throw new Error('Order not found');
    }

    const appSettingsData = await db.query({
      AppSettings: {},
    });

    const appSettings = appSettingsData.AppSettings;

    if (!appSettings || appSettings.length === 0) {
      throw new Error('App settings not found');
    }

    const { businessName, businessLogo } = appSettings[0].settings;
    const singleOrder = order[0];

    const doc = new PDFDocument({ margin: 50 });

    // Set a light blue background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#E6F7FF');
    doc.fillColor('black');

    const startX = 50;
    let currentY = 50;

    // Add business logo
    if (businessLogo) {
      try {
        const imageResponse = await fetch(businessLogo);
        const imageBuffer = await imageResponse.arrayBuffer();
        doc.image(Buffer.from(imageBuffer), startX, currentY, { width: 50 });
      } catch (error) {
        console.error('Error fetching business logo:', error);
      }
    }

    // Add business name and receipt title
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(businessName, startX + 60, currentY + 7);
    doc
      .font('Helvetica')
      .fontSize(10)
      .text('Receipt', startX + 150, currentY + 15, { align: 'right' });

    currentY += 100;

    // Add receipt details
    doc
      .fontSize(10)
      .text(`Order Number: ${singleOrder.orderNumber}`, startX, currentY);
    currentY += 15;
    doc
      .fontSize(10)
      .text(`Date: ${new Date(singleOrder.createdAt).toLocaleString()}`, startX, currentY);
    currentY += 15;
    doc
      .fontSize(10)
      .text(`Customer: ${singleOrder?.customer?.fullName}`, startX, currentY);
    currentY += 15;
    doc.fontSize(10).text(`Email: ${singleOrder?.customer?.email}`, startX, currentY);

    currentY += 30;

    // Add a table for line items
    const tableTop = currentY;
    const descriptionX = startX;
    const quantityX = startX + 250;
    const priceX = startX + 300;
    const totalX = startX + 400;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Description', descriptionX, tableTop)
      .text('Quantity', quantityX, tableTop)
      .text('Price', priceX, tableTop)
      .text('Total', totalX, tableTop);

    currentY = tableTop + 25;

    const dbItems: Record<string, any> = {};
    if (Array.isArray(singleOrder.items)) {
      for (const item of singleOrder.items) {
        dbItems[item.id] = item;
      }
    }

    const lineItems = (body.items && body.items.length > 0 ? body.items : singleOrder.items) || [];

    const subtotal = body.subtotal ?? lineItems.reduce((sum: number, item: any) => {
      const dbItem = dbItems[item.id] || {};
      const qty = item.quantity ?? dbItem.quantity ?? 0;
      const price = item.price ?? dbItem.price ?? 0;
      return sum + qty * price;
    }, 0);
    const vatAmount = body.vat ?? Number(singleOrder.vatAmount) ?? 0;
    const discountAmount = body.discountAmount ?? Number(singleOrder.discountAmount) ?? 0;
    const deliveryCharge = body.deliveryCharge ?? Number(singleOrder.deliveryCharge) ?? 0;
    const total = body.total ?? subtotal + vatAmount - discountAmount + deliveryCharge;

    for (const item of lineItems) {
      const dbItem = dbItems[item.id] || {};
      const name = this.ellipsify(item.name ?? dbItem.name ?? '');
      const quantity = item.quantity ?? dbItem.quantity ?? 0;
      const price = item.price ?? dbItem.price ?? 0;
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(name, descriptionX, currentY)
        .text(quantity.toString(), quantityX, currentY)
        .text(`${price.toFixed(2)}`, priceX, currentY)
        .text(`${(quantity * price).toFixed(2)}`, totalX, currentY);
      currentY += 25;
    }

    currentY += 25;

    // Add totals
    const totalsTop = currentY;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Subtotal:', 350, totalsTop)
      .text(`${subtotal.toFixed(2)}`, 450, totalsTop);
    currentY += 15;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('VAT:', 350, currentY)
      .text(`${vatAmount.toFixed(2)}`, 450, currentY);
    currentY += 15;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Discount:', 350, currentY)
      .text(`${discountAmount.toFixed(2)}`, 450, currentY);
    currentY += 15;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Delivery Charge:', 350, currentY)
      .text(`${deliveryCharge.toFixed(2)}`, 450, currentY);
    currentY += 15;    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Delivery Method:', 350, currentY)
      .text(`${singleOrder.deliveryMethod}`, 450, currentY);
    currentY += 15;    
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Total:', 350, currentY)
      .text(`${total.toFixed(2)}`, 450, currentY);

    // Pipe the PDF to a buffer
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.end();
    });

    const customerEmail = singleOrder?.customer?.email;
    if (customerEmail) {
      const itemRows = lineItems
        .map(
          (item: { name: string; quantity: number; price: number }) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #ddd;">${item.name}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;">${item.quantity}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">${Number(item.price).toFixed(2)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">${(item.quantity * item.price).toFixed(2)}</td>
          </tr>`,
        )
        .join('');

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f5f9ff;">
          <h2 style="color:#1a73e8;">Your Receipt</h2>
          <p>Order Number: <strong>${singleOrder.orderNumber}</strong></p>
          <p>Date: ${new Date(singleOrder.createdAt).toLocaleString()}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <thead>
              <tr style="background:#1a73e8;color:#fff;">
                <th style="padding:8px;text-align:left;">Item</th>
                <th style="padding:8px;text-align:center;">Qty</th>
                <th style="padding:8px;text-align:right;">Price</th>
                <th style="padding:8px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <table style="width:100%;margin-top:16px;">
            <tr><td style="text-align:right;padding:4px 8px;">Subtotal:</td><td style="text-align:right;padding:4px 8px;">${subtotal.toFixed(2)}</td></tr>
            <tr><td style="text-align:right;padding:4px 8px;">VAT:</td><td style="text-align:right;padding:4px 8px;">${vatAmount.toFixed(2)}</td></tr>
            <tr><td style="text-align:right;padding:4px 8px;">Discount:</td><td style="text-align:right;padding:4px 8px;">${discountAmount.toFixed(2)}</td></tr>
            <tr><td style="text-align:right;padding:4px 8px;">Delivery Charge:</td><td style="text-align:right;padding:4px 8px;">${deliveryCharge.toFixed(2)}</td></tr>
            <tr><td style="text-align:right;padding:4px 8px;font-weight:bold;">Total:</td><td style="text-align:right;padding:4px 8px;font-weight:bold;">${total.toFixed(2)}</td></tr>
          </table>
          <p style="color:#888;font-size:12px;margin-top:24px;">Thank you for your order.</p>
        </div>`;

      const text = [
        `Receipt for Order ${singleOrder.orderNumber}`,
        `Date: ${new Date(singleOrder.createdAt).toLocaleString()}`,
        '',
        ...lineItems.map(
          (i: { name: string; quantity: number; price: number }) => `${i.name} x${i.quantity} @ ${Number(i.price).toFixed(2)} = ${(i.quantity * i.price).toFixed(2)}`,
        ),
        '',
        `Subtotal: ${subtotal.toFixed(2)}`,
        `VAT: ${vatAmount.toFixed(2)}`,
        `Discount: ${discountAmount.toFixed(2)}`,
        `Delivery Charge: ${deliveryCharge.toFixed(2)}`,
        `Total: ${total.toFixed(2)}`,
      ].join('\n');

      this.mailService
        .send({
          to: customerEmail,
          subject: `Your Receipt – Order ${singleOrder.orderNumber}`,
          html,
          text,
          attachments: [
            {
              content: buffer.toString('base64'),
              filename: `receipt-${singleOrder.orderNumber}.pdf`,
              type: 'application/pdf',
              disposition: 'attachment',
            },
          ],
        })
        .catch((err) => console.error('Failed to send receipt email:', err));
    }

    return buffer;
  }

  private ellipsify(text: string, max = 46): string {
    return text.length > max ? text.slice(0, max - 3) + '...' : text;
  }
}