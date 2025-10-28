import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import db from '../instant';

@Injectable()
export class PdfService {
  async generateReceipt(orderId: string): Promise<any> {
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
      .text(`Customer: ${singleOrder.customer.fullName}`, startX, currentY);
    currentY += 15;
    doc.fontSize(10).text(`Email: ${singleOrder.customer.email}`, startX, currentY);

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

    for (const item of singleOrder.items) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(item.name, descriptionX, currentY)
        .text(item.quantity.toString(), quantityX, currentY)
        .text(`${item.price.toFixed(2)}`, priceX, currentY)
        .text(`${(item.quantity * item.price).toFixed(2)}`, totalX, currentY);
      currentY += 25;
    }

    currentY += 25;

    // Add totals
    const totalsTop = currentY;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Subtotal:', 350, totalsTop)
      .text(`${singleOrder.amount.toFixed(2)}`, 450, totalsTop);
    currentY += 15;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('VAT:', 350, currentY)
      .text(`${singleOrder.vatAmount.toFixed(2)}`, 450, currentY);
    currentY += 15;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Discount:', 350, currentY)
      .text(`${singleOrder.discountAmount.toFixed(2)}`, 450, currentY);
    currentY += 15;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Delivery Charge:', 350, currentY)
      .text(`${singleOrder.deliveryCharge.toFixed(2)}`, 450, currentY);
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
      .text(`${singleOrder.totalAmount.toFixed(2)}`, 450, currentY);

    // Pipe the PDF to a buffer
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.end();
    });

    return buffer;
  }
}