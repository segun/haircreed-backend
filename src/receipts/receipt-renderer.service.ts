import { BadGatewayException, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import PDFDocument = require("pdfkit");
import { ReceiptLineItem } from "../types";

const receiptFonts = {
  regular: Uint8Array.from(
    readFileSync(
      require.resolve(
        "@fontsource/dejavu-sans/files/dejavu-sans-latin-400-normal.woff",
      ),
    ),
  ),
  bold: Uint8Array.from(
    readFileSync(
      require.resolve(
        "@fontsource/dejavu-sans/files/dejavu-sans-latin-700-normal.woff",
      ),
    ),
  ),
  italic: Uint8Array.from(
    readFileSync(
      require.resolve(
        "@fontsource/dejavu-sans/files/dejavu-sans-latin-400-italic.woff",
      ),
    ),
  ),
};

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
        size: "LETTER",
        margin: 36,
        info: {
          Title: `Receipt ${receipt.receiptNumber}`,
          Author: receipt.businessName,
          CreationDate: timestamp,
          ModDate: timestamp,
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.registerFont("ReceiptRegular", receiptFonts.regular);
      doc.registerFont("ReceiptBold", receiptFonts.bold);
      doc.registerFont("ReceiptItalic", receiptFonts.italic);

      const pageLeft = 36;
      const pageRight = 576;
      const pageWidth = pageRight - pageLeft;
      const ink = "#282828";
      const muted = "#747474";
      const rule = "#B8B8B8";
      const fill = "#F2F2F2";
      const money = (value: number) =>
        `${receipt.currency}${value.toFixed(2)}`;

      doc.fillColor(ink);


      doc
        .font("ReceiptBold")
        .fontSize(25)
        .fillColor("#000000")
        .text(receipt.businessName.toUpperCase(), pageLeft, 38, {
          width: 250,
          characterSpacing: 0.4,
        });


      doc
        .font("ReceiptRegular")
        .fontSize(18)
        .fillColor(muted)
        .text("RECEIPT", 410, 42, { width: 166, align: "right" });

      doc
        .font("ReceiptRegular")
        .fontSize(9)
        .fillColor(ink)
        .text(receipt.businessName, pageLeft, 98, { width: 245 });
      doc
        .fillColor(muted)
        .text(receipt.businessAddress, pageLeft, 113, {
          width: 245,
          lineGap: 3,
        });

      const metadataX = 410;
      const metadataWidth = 166;
      const metadataLabelWidth = 70;
      const metadataValueWidth = metadataWidth - metadataLabelWidth;
      const drawMetadata = (label: string, value: string, y: number) => {
        doc
          .font("ReceiptBold")
          .fontSize(7)
          .fillColor(ink)
          .text(label, metadataX, y, {
            width: metadataLabelWidth,
            align: "right",
          });
        doc
          .font("ReceiptRegular")
          .fontSize(8)
          .text(value, metadataX + metadataLabelWidth + 8, y - 1, {
            width: metadataValueWidth - 8,
            align: "right",
          });
        doc
          .strokeColor(rule)
          .lineWidth(0.5)
          .moveTo(metadataX, y + 12)
          .lineTo(pageRight, y + 12)
          .stroke();
      };

      drawMetadata(
        "DATE",
        new Date(receipt.receiptDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
        98,
      );
      drawMetadata("RECEIPT NO.", String(receipt.receiptNumber), 132);

      const sectionY = 204;
      doc
        .font("ReceiptBold")
        .fontSize(8)
        .fillColor(ink)
        .text("BILL TO", pageLeft, sectionY);
      doc
        .strokeColor(rule)
        .lineWidth(0.5)
        .moveTo(pageLeft, sectionY + 13)
        .lineTo(282, sectionY + 13)
        .stroke();
      doc
        .font("ReceiptBold")
        .fontSize(10)
        .text(receipt.customerName, pageLeft, sectionY + 25, { width: 246 });
      doc
        .font("ReceiptRegular")
        .fontSize(9)
        .fillColor(muted)
        .text(receipt.customerEmail, pageLeft, sectionY + 43, { width: 246 })
        .text(receipt.customerPhone, pageLeft, sectionY + 59, { width: 246 });

      doc
        .font("ReceiptBold")
        .fontSize(8)
        .fillColor(ink)
        .text("PAYMENT", 330, sectionY);
      doc
        .strokeColor(rule)
        .moveTo(330, sectionY + 13)
        .lineTo(pageRight, sectionY + 13)
        .stroke();
      doc
        .font("ReceiptRegular")
        .fontSize(9)
        .fillColor(muted)
        .text("Payment received in full.", 330, sectionY + 25, {
          width: 246,
          align: "right",
        });

      const tableTop = 300;
      const rowHeight = 28;
      const minimumRows = 8;
      const firstPageCapacity = 11;
      const continuationPageCapacity = 19;
      const columns = [pageLeft, 300, 344, 426, 496, pageRight];
      const headers = ["DESCRIPTION", "QTY", "UNIT PRICE", "DISCOUNT", "TOTAL"];
      const alignments: Array<"left" | "center" | "right"> = [
        "left",
        "center",
        "right",
        "right",
        "right",
      ];

      const drawTable = (
        y: number,
        startIndex: number,
        itemCount: number,
        visibleRows: number,
      ) => {
        doc.rect(pageLeft, y, pageWidth, 22).fill(fill);
        headers.forEach((header, index) => {
          doc
            .font("ReceiptBold")
            .fontSize(7)
            .fillColor(ink)
            .text(header, columns[index] + 6, y + 8, {
              width: columns[index + 1] - columns[index] - 12,
              align: alignments[index],
            });
        });

        for (let row = 0; row <= visibleRows; row += 1) {
          const rowY = y + 22 + row * rowHeight;
          doc
            .strokeColor(rule)
            .lineWidth(0.45)
            .moveTo(pageLeft, rowY)
            .lineTo(pageRight, rowY)
            .stroke();
        }
        columns.forEach((x) => {
          doc
            .strokeColor(rule)
            .lineWidth(0.45)
            .moveTo(x, y)
            .lineTo(x, y + 22 + visibleRows * rowHeight)
            .stroke();
        });

        receipt.lineItems
          .slice(startIndex, startIndex + itemCount)
          .forEach((lineItem, pageIndex) => {
            const itemIndex = startIndex + pageIndex;
            const textY = y + 31 + pageIndex * rowHeight;
            const values = [
              lineItem.description,
              String(lineItem.quantity),
              money(lineItem.amount),
              money(lineItem.discount),
              money(receipt.lineTotals[itemIndex]),
            ];
            values.forEach((value, columnIndex) => {
              doc
                .font("ReceiptRegular")
                .fontSize(8)
                .fillColor(columnIndex === 0 ? ink : muted)
                .text(value, columns[columnIndex] + 6, textY, {
                  width: columns[columnIndex + 1] - columns[columnIndex] - 12,
                  align: alignments[columnIndex],
                  ellipsis: true,
                  lineBreak: false,
                });
            });
          });

        return y + 22 + visibleRows * rowHeight;
      };

      let itemOffset = 0;
      let currentTableTop = tableTop;
      let capacity = firstPageCapacity;
      let tableBottom = tableTop;
      while (itemOffset < receipt.lineItems.length) {
        const itemCount = Math.min(
          capacity,
          receipt.lineItems.length - itemOffset,
        );
        tableBottom = drawTable(
          currentTableTop,
          itemOffset,
          itemCount,
          Math.max(minimumRows, itemCount),
        );
        itemOffset += itemCount;

        if (itemOffset < receipt.lineItems.length) {
          doc.addPage();
          doc
            .font("ReceiptRegular")
            .fontSize(14)
            .fillColor(muted)
            .text("RECEIPT CONTINUED", pageLeft, 38, {
              width: pageWidth,
              align: "right",
            });
          doc
            .font("ReceiptRegular")
            .fontSize(8)
            .fillColor(ink)
            .text(`#${receipt.receiptNumber}`, pageLeft, 42);
          currentTableTop = 72;
          capacity = continuationPageCapacity;
        }
      }

      const totalY = tableBottom + 20;
      doc
        .font("ReceiptBold")
        .fontSize(8)
        .fillColor(ink)
        .text("TOTAL", 420, totalY + 8, {
          width: 70,
          align: "right",
        });
      doc.rect(496, totalY, 80, 25).fill(fill);
      doc
        .font("ReceiptBold")
        .fontSize(9)
        .fillColor(ink)
        .text(money(receipt.totalAmount), 502, totalY + 8, {
          width: 68,
          align: "right",
        });

      const footerY = Math.min(736, totalY + 88);
      doc
        .font("ReceiptItalic")
        .fontSize(8)
        .fillColor(muted)
        .text(`Thank you for choosing ${receipt.businessName}.`, pageLeft, footerY, {
          width: pageWidth,
          align: "center",
        });
      doc
        .font("ReceiptRegular")
        .fontSize(18)
        .fillColor(ink)
        .text("THANK YOU", pageLeft, footerY + 18, {
          width: pageWidth,
          align: "center",
          characterSpacing: 0.6,
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
