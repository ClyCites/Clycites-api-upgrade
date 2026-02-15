import express, { Application, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import config from '../../common/config';
import connectDB from '../../common/config/database';
import logger from '../../common/utils/logger';
import { errorHandler, notFoundHandler } from '../../common/middleware/errorHandler';
import { apiLimiter } from '../../common/middleware/rateLimiter';

interface ServiceOptions {
  serviceName: string;
  routes: Router;
}

export const createServiceApp = ({ serviceName, routes }: ServiceOptions): Application => {
  const app: Application = express();

  connectDB();

  app.use(helmet());
  app.use(cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (config.app.env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    }));
  }

  app.use(apiLimiter);
  app.use(routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info(`[${serviceName}] app configured`);

  return app;
};

export const startService = (app: Application, port: number, serviceName: string): void => {
  app.listen(port, () => {
    logger.info(`[${serviceName}] listening on port ${port}`);
  });

  process.on('unhandledRejection', (err: Error) => {
    logger.error(`[${serviceName}] unhandled rejection: ${err.message}`);
    process.exit(1);
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error(`[${serviceName}] uncaught exception: ${err.message}`);
    process.exit(1);
  });
};
