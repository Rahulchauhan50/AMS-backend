import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../common/response/response.formatter';
import { env } from '../config/env';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Format errors array if it exists (e.g. from validation)
  const errors = err.errors || [];
  
  // Create response body
  const responseBody = errorResponse(
    message, 
    errors, 
    req.headers['x-request-id'] as string || undefined
  );

  // Print stack trace in development mode
  if (env.NODE_ENV === 'development' && statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json(responseBody);
};
