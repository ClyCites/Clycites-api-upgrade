import type { OpenAPIV3_1 } from 'openapi-types';
import { securitySchemes, parameters, schemas, responses } from './components';

const components: OpenAPIV3_1.ComponentsObject = { securitySchemes, parameters, schemas, responses };
import { authPaths } from './paths/auth.paths';
import { farmersPaths } from './paths/farmers.paths';
import { productsPaths } from './paths/products.paths';
import { marketplacePaths } from './paths/marketplace.paths';
import { ordersPaths, disputesPaths } from './paths/orders.paths';
import { analyticsPaths } from './paths/analytics.paths';
import { notificationsPaths, messagingPaths } from './paths/notifications.paths';
import { pricesPaths } from './paths/prices.paths';
import { priceMonitorPaths } from './paths/priceMonitor.paths';
import { marketsPaths } from './paths/markets.paths';
import { pestDiseasePaths } from './paths/pestDisease.paths';
import { expertPortalPaths } from './paths/expertPortal.paths';
import { weatherPaths } from './paths/weather.paths';
import { mediaPaths } from './paths/media.paths';
import { securityPaths } from './paths/security.paths';
import { auditPaths } from './paths/audit.paths';
import { paymentsPaths } from './paths/payments.paths';
import { reputationPaths } from './paths/reputation.paths';
import { marketIntelligencePaths } from './paths/marketIntelligence.paths';
import { organizationsPaths } from './paths/organizations.paths';
import { offersPaths } from './paths/offers.paths';
import { adminPaths } from './paths/admin.paths';
import { logisticsPaths } from './paths/logistics.paths';
import { aggregationPaths } from './paths/aggregation.paths';

export const openApiSpec: OpenAPIV3_1.Document = {
  openapi: '3.1.0',

  info: {
    title: 'ClyCites Agricultural Platform API',
    version: '1.0.0',
    description: `
## Overview

ClyCites is an enterprise agricultural intelligence platform connecting farmers, traders, markets, and experts across Africa.

This OpenAPI specification is the **single source of truth** for all REST API endpoints.

## Authentication

Most endpoints require a Bearer token. Supported token classes:
- JWT access token obtained from \`POST /api/v1/auth/login\`
- API token secret obtained from \`POST /api/v1/auth/tokens\` (returned once)

\`\`\`http
Authorization: Bearer <accessToken>
\`\`\`

Session refresh tokens are stored as HTTP-only cookies and are used by \`POST /api/v1/auth/refresh-token\`.

## Response Shape

All responses follow a uniform envelope:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "req_123", "timestamp": "2024-01-01T00:00:00.000Z", "pagination": { ... } }
}
\`\`\`

## Versioning

All routes are prefixed with \`/api/v1\`.

## Rate Limiting

Default: **100 requests / 15 minutes** per IP.  
Headers returned: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`.
    `.trim(),
    contact: {
      name: 'ClyCites Engineering',
      email: 'engineering@clycites.com',
      url: 'https://clycites.com',
    },
    license: {
      name: 'Proprietary',
      url: 'https://clycites.com/legal',
    },
  },

  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
    {
      url: 'https://api.clycites.com',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.clycites.com',
      description: 'Staging server',
    },
  ],

  tags: [
    { name: 'Authentication', description: 'Registration, login, tokens, MFA, and account management.' },
    { name: 'Security', description: 'MFA setup, OAuth providers, and security events.' },
    { name: 'Farmers', description: 'Farmer profiles, certifications, and verification.' },
    { name: 'Organizations', description: 'Farmer co-operatives and agribusiness organisations.' },
    { name: 'Farm Enterprises', description: 'Enterprise structures under a farmer profile.' },
    { name: 'Products', description: 'Agricultural product catalogue management.' },
    { name: 'Marketplace', description: 'Product listings and marketplace discovery.' },
    { name: 'Offers', description: 'Buyer offers on marketplace listings.' },
    { name: 'Orders', description: 'Order lifecycle management.' },
    { name: 'Disputes', description: 'Order dispute resolution.' },
    { name: 'Analytics', description: 'Market intelligence, trend analysis, and agri-data insights.' },
    { name: 'Custom Charts', description: 'User-defined analytics chart definitions.' },
    { name: 'Dashboards', description: 'Configurable analytics dashboards.' },
    { name: 'Notifications', description: 'In-app, email, SMS, and push notification management.' },
    { name: 'Messaging', description: 'Real-time direct and group messaging.' },
    { name: 'Prices', description: 'Commodity price data, trends, and alerts.' },
    { name: 'Price Monitor', description: 'ML-powered price prediction engine.' },
    { name: 'Markets', description: 'Physical / virtual agricultural market registry.' },
    { name: 'Pest & Disease', description: 'Pest and disease reporting, AI analysis, and outbreak tracking.' },
    { name: 'Expert Portal', description: 'Expert profiles, consultation cases, knowledge base, and advisories.' },
    { name: 'Weather', description: 'Weather forecasts, agri-weather summaries, and alert subscriptions.' },
    { name: 'Media', description: 'File upload, storage, and signed-URL delivery.' },
    { name: 'Payments', description: 'Wallet, deposits, withdrawals, transactions, and escrow management.' },
    { name: 'Reputation', description: 'User ratings, reputation scores, and trust tiers.' },
    { name: 'Market Intelligence', description: 'AI-powered market insights, price recommendations, and intelligence alerts.' },
    { name: 'Audit', description: 'Audit log access — user activity, org events, suspicious activities.' },
    { name: 'Admin', description: 'Platform administration operations (require elevated roles).' },
    { name: 'Logistics', description: 'Collection points, shipment lifecycle, tracking, and proof of delivery.' },
    { name: 'Aggregation', description: 'Warehousing aggregation workflows: bins, batches, grading, stock movement, and spoilage.' },
  ],

  paths: {
    ...authPaths,
    ...farmersPaths,
    ...productsPaths,
    ...marketplacePaths,
    ...ordersPaths,
    ...disputesPaths,
    ...analyticsPaths,
    ...notificationsPaths,
    ...messagingPaths,
    ...pricesPaths,
    ...priceMonitorPaths,
    ...marketsPaths,
    ...pestDiseasePaths,
    ...expertPortalPaths,
    ...weatherPaths,
    ...mediaPaths,
    ...securityPaths,
    ...auditPaths,
    ...paymentsPaths,
    ...reputationPaths,
    ...marketIntelligencePaths,
    ...organizationsPaths,
    ...offersPaths,
    ...adminPaths,
    ...logisticsPaths,
    ...aggregationPaths,
  } as OpenAPIV3_1.Document['paths'],

  components,
};

export default openApiSpec;
