import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';

type RequestWithId = Request & { id: string };

interface ProblemDetails {
  type: 'about:blank';
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId?: string;
  timestamp: string;
  errors?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function statusTitle(status: number): string {
  const enumName = HttpStatus[status];

  if (typeof enumName !== 'string') {
    return 'Error';
  }

  return enumName
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<unknown>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const messages = this.extractMessages(exceptionResponse);

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error('Unhandled request error', stack);
    }

    const problem: ProblemDetails = {
      type: 'about:blank',
      title: statusTitle(status),
      status,
      detail:
        status >= 500 ? 'An unexpected error occurred.' : (messages[0] ?? statusTitle(status)),
      instance: request.originalUrl,
      requestId: request.id,
      timestamp: new Date().toISOString(),
      ...(messages.length > 1 ? { errors: messages } : {}),
    };

    httpAdapter.setHeader(response, 'content-type', 'application/problem+json');
    httpAdapter.reply(response, problem, status);
  }

  private extractMessages(response: string | object | undefined): string[] {
    if (typeof response === 'string') {
      return [response];
    }

    if (!isRecord(response)) {
      return [];
    }

    const { message } = response;

    if (typeof message === 'string') {
      return [message];
    }

    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string');
    }

    return [];
  }
}
