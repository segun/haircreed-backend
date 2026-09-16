import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationError,
  ValidationPipe,
  BadRequestException,
  Query as QueryDecorator,
} from "@nestjs/common";
import { Response } from "express";
import { SuperAdminGuard } from "../auth/super-admin.guard";
import { ResolveReceiptDraftDto } from "./dto/resolve-receipt-draft.dto";
import { SendReceiptDto } from "./dto/send-receipt.dto";
import { ReceiptErrorFilter } from "./receipt-error.filter";
import { ReceiptsService } from "./receipts.service";
import { ReceiptsReadService } from './receipts-read.service';
import { Query } from '../database-reads/read-query';
import { ReadAuthGuard, ReadRoles } from '../database-reads/read-auth.guard';
import { ReadErrorFilter } from '../database-reads/read-error.filter';

const validationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors: ValidationError[]) =>
    new BadRequestException({
      message: "Receipt request validation failed",
      code: "VALIDATION_ERROR",
      fieldErrors: flattenValidationErrors(errors),
    }),
});

function flattenValidationErrors(
  errors: ValidationError[],
  prefix = "",
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  errors.forEach((error) => {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) {
      fieldErrors[path] = Object.values(error.constraints)[0];
    }
    Object.assign(
      fieldErrors,
      flattenValidationErrors(error.children ?? [], path),
    );
  });
  return fieldErrors;
}

@Controller("/api/v1/receipts")
@UseGuards(SuperAdminGuard)
@UseFilters(ReceiptErrorFilter)
@UsePipes(validationPipe)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post("drafts")
  async resolveDraft(
    @Body() body: ResolveReceiptDraftDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.receiptsService.resolveDraft(body);
    response.status(result.created ? 201 : 200).json(result.receipt);
  }

  @Post(":receiptId/send")
  async send(
    @Param("receiptId") receiptId: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() body: SendReceiptDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.receiptsService.send(
      receiptId,
      idempotencyKey,
      body,
    );
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt_${result.receiptNumber}.pdf"`,
      "Content-Length": result.buffer.length,
    });
    response.status(200).end(result.buffer);
  }
}

@Controller('/api/v1/receipts')
@UseGuards(ReadAuthGuard)
@UseFilters(ReadErrorFilter)
export class ReceiptsReadController {
  constructor(private readonly receiptsReadService: ReceiptsReadService) {}

  @Get(':receiptId')
  @ReadRoles('SUPER_ADMIN')
  findOne(@Param('receiptId') receiptId: string, @QueryDecorator() query: Query) {
    return this.receiptsReadService.receiptDetail(receiptId, query);
  }

  @Get()
  @ReadRoles('SUPER_ADMIN')
  findAll(@QueryDecorator() query: Query) {
    return this.receiptsReadService.receiptHistory(query);
  }
}
