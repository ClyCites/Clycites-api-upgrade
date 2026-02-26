import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import config from './common/config';
import connectDB from './common/config/database';
import logger from './common/utils/logger';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler';
import { apiLimiter } from './common/middleware/rateLimiter';
import { requestContext } from './common/middleware/requestContext';
import { superAdminAudit } from './common/middleware/superAdminAudit';
import { maintenanceModeGuard } from './common/middleware/maintenanceMode';
import routes from './routes';
import { openApiSpec } from './common/docs';

const app: Application = express();

// Connect to database
connectDB();

// ─── Swagger UI (mounted before helmet so its inline assets are not blocked) ───
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      displayRequestDuration: true,
    },
    customSiteTitle: 'ClyCites API Docs',
    customCss: `
      .swagger-ui .topbar { background-color: #1a7f4b; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info .title { color: #1a7f4b; }
    `,
  }),
);

// Also expose the raw JSON spec at /api/docs.json
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiSpec);
});

app.get('/', (_req, res) => {
  res.type('html').send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ClyCites API</title>

  <style>
    :root {
      --primary: #22c55e;
      --secondary: #16a34a;
      --bg-dark: #0f172a;
      --glass: rgba(255, 255, 255, 0.08);
      --border: rgba(255, 255, 255, 0.15);
      --text-muted: #94a3b8;
    }

    * {
      box-sizing: border-box;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(1200px 600px at 10% 10%, #052e16, transparent),
                  radial-gradient(1000px 500px at 90% 20%, #14532d, transparent),
                  var(--bg-dark);
      color: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      max-width: 720px;
      width: 100%;
      background: var(--glass);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 48px;
      backdrop-filter: blur(14px);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
      animation: fadeUp 0.8s ease-out;
    }

    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 13px;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.15);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.35);
      margin-bottom: 20px;
    }

    h1 {
      font-size: 42px;
      margin: 0 0 12px;
      line-height: 1.1;
      background: linear-gradient(135deg, #86efac, #22c55e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p {
      font-size: 17px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .btn {
      text-decoration: none;
      padding: 14px 22px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.25s ease;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #022c22;
      box-shadow: 0 10px 30px rgba(34, 197, 94, 0.35);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 40px rgba(34, 197, 94, 0.5);
    }

    .btn-outline {
      border-color: var(--border);
      color: #e5e7eb;
      background: transparent;
    }

    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    footer {
      margin-top: 40px;
      font-size: 13px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    footer span {
      opacity: 0.85;
    }

    @media (max-width: 520px) {
      .card {
        padding: 32px;
      }

      h1 {
        font-size: 34px;
      }
    }
  </style>
</head>

<body>
  <main class="card">
    <div class="badge">🌱 ClyCites Platform API</div>

    <h1>Welcome to ClyCites</h1>

    <p>
      Powering Africa’s agricultural ecosystem with a secure, scalable,
      enterprise-grade API for farmers, markets, analytics, and smart
      decision-making.
    </p>

    <div class="actions">
      <a href="/api/docs" class="btn btn-primary">📘 API Documentation</a>
      <a href="https://clycites.com" class="btn btn-outline">🌍 Visit Website</a>
    </div>

    <footer>
      <span>Environment: <strong>${config.app.environment}</strong></span>
      <span>© ${new Date().getFullYear()} ClyCites</span>
    </footer>
  </main>
</body>
</html>
  `);
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestContext);

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
app.use(superAdminAudit);
app.use(maintenanceModeGuard);

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
