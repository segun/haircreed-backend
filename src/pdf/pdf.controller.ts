import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { Response } from 'express';
import { DownloadReceiptDto } from './dto/create-pdf.dto';

@Controller('/api/v1/pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('/download/:orderId')
  async generateReceipt(
    @Param('orderId') orderId: string,
    @Body() body: DownloadReceiptDto,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generateReceipt(orderId, body);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=receipt.pdf',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}