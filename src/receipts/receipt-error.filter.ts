import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

@Catch()
export class ReceiptErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = typeof raw === "object" && raw !== null ? (raw as any) : {};

    response.status(status).json({
      message:
        body.message ??
        (typeof raw === "string"
          ? raw
          : "An unexpected receipt error occurred"),
      code: body.code ?? this.defaultCode(status),
      fieldErrors: body.fieldErrors ?? {},
    });
  }

  private defaultCode(status: number): string {
    return HttpStatus[status] ?? "INTERNAL_SERVER_ERROR";
  }
}
