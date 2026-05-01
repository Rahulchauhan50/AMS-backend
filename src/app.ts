import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import v1Routes from './routes/v1.routes';
import { globalErrorHandler } from './middlewares/error.middleware';
import { errorResponse } from './common/response/response.formatter';
import {
  sanitizeRequest,
  securityHeaders,
  generalRateLimiter,
  trustedProxyMiddleware,
  loginRateLimiter,
} from './middlewares/security.middleware';

const app: Application = express();

// Global Middlewares
app.use(helmet()); // Security headers (helmet provides many defaults)
app.use(securityHeaders); // Our additional security headers
app.use(cors()); // Enable CORS
app.use(cookieParser()); // Cookie parser for refresh tokens
app.use(trustedProxyMiddleware);
app.use(express.json()); // JSON parser
app.use(express.urlencoded({ extended: true })); // URL-encoded parser
app.use(sanitizeRequest); // Request sanitization
app.use(generalRateLimiter()); // Basic rate limiting
app.use(morgan('dev')); // Request logger

// Routes
app.use('/api/v1', v1Routes);

// 404 Handler for unknown routes
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json(errorResponse(`Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;
