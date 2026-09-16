import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class ReadErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const status = error instanceof HttpException
      ? error.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = error instanceof HttpException ? error.getResponse() : null;

    if (body && typeof body === 'object' && 'code' in body) {
      response.status(status).json(body);
      return;
    }

    const message = typeof body === 'string'
      ? body
      : status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'An unexpected server error occurred'
        : (body as any)?.message || 'Request failed';
    response.status(status).json({
      message,
      code: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED',
      fieldErrors: {},
    });
  }
}