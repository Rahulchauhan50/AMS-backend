import { Request, Response, NextFunction } from 'express';
import { ObservabilityService } from './observability.service';

export const requestObservability = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const path = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.originalUrl;

    ObservabilityService.recordRequest({
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
    });

    console.log(
      JSON.stringify({
        type: 'http_request',
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs,
        requestId: req.headers['x-request-id'] || null,
        ip: req.ip || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        timestamp: new Date().toISOString(),
      })
    );
  });

  next();
};