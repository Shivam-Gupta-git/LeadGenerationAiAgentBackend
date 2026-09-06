import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import scrapingRoutes from './routes/scrapingRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import enrichmentRoutes from './routes/enrichmentRoutes.js';
import knowledgeRoutes from './routes/knowledgeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import emailAccountRoutes from './routes/emailAccountRoutes.js';
import sequenceRoutes from './routes/sequenceRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import cookieParser from 'cookie-parser';
import crmRoutes from './routes/crmRoutes.js';
import sseRoutes from './routes/sseRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import safetyRoutes from './routes/safetyRoutes.js';
import { authLimiter, apiLimiter, aiLimiter } from './middleware/rateLimiter.js';
import requestLogger from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Security, Observability & Body Parsing Middlewares
app.use(requestLogger);
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable strict default CSP to prevent browser blocking local resources/favicons
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5050',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5050',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-sent events, curl, postman) or matching origins
      if (!origin || allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
        return callback(null, true);
      }
      return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'x-organization-id'],
    exposedHeaders: ['Content-Type', 'Authorization', 'x-organization-id']
  })
);
app.options('*', cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Global API Rate Limiter
app.use('/api/', apiLimiter);

// Ignore favicon requests without throwing CSP/404 errors
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Root API Endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'AI Lead Generation API is running',
    version: '1.0.0',
    health: '/health',
    endpoints: {
      auth: '/api/v1/auth',
      leads: '/api/v1/leads',
      discovery: '/api/v1/discovery',
      scraping: '/api/v1/scraping',
      verification: '/api/v1/verification',
      enrichment: '/api/v1/enrichment',
      knowledge: '/api/v1/knowledge',
      ai: '/api/v1/ai',
      queues: '/api/v1/queues',
      emailAccounts: '/api/v1/email-accounts',
      sequences: '/api/v1/sequences',
      webhooks: '/api/v1/webhooks',
      crm: '/api/v1/crm',
      events: '/api/v1/events',
      auditLogs: '/api/v1/audit-logs',
      export: '/api/v1/export',
      outreach: '/api/v1/outreach'
    },
  });
});

// Health Check Route
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'AI Lead Generation API (JavaScript)',
  });
});

// Versioned REST API Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/discovery', discoveryRoutes);
app.use('/api/v1/scraping', scrapingRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/enrichment', enrichmentRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/ai', aiLimiter, aiRoutes);
app.use('/api/v1/queues', queueRoutes);
app.use('/api/v1/email-accounts', emailAccountRoutes);
app.use('/api/v1/sequences', sequenceRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/events', sseRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/outreach', safetyRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
