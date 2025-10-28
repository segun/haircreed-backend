import { Controller, Get, Param, Res } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { Response } from 'express';

@Controller('/api/v1/pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('/download/:orderId')
  async generateReceipt(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generateReceipt(orderId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=receipt.pdf',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}