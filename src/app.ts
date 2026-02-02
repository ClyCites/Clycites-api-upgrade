import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import config from './common/config';
import connectDB from './common/config/database';
import logger from './common/utils/logger';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler';
import { apiLimiter } from './common/middleware/rateLimiter';
import routes from './routes';

const app: Application = express();

// Connect to database
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.app.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting
app.use(apiLimiter);

// Routes
app.use(routes);

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.app.port;

app.listen(PORT, () => {
  logger.info(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   🌾 ClyCites API Server                             ║
    ║                                                       ║
    ║   Environment: ${config.app.env.padEnd(35)}║
    ║   Port: ${PORT.toString().padEnd(42)}║
    ║   API Version: ${config.app.apiVersion.padEnd(36)}║
    ║                                                       ║
    ║   Server running at: http://localhost:${PORT}        ║
    ║   Health check: http://localhost:${PORT}/api/v1/health║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

export default app;
