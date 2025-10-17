import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'vacation-genius-backend'
  });
});

// API Routes (to be implemented by Developer 2)
app.get('/api/auth/me', (req, res) => {
  res.json({ message: 'Auth endpoint - to be implemented' });
});

app.post('/api/auth/signup', (req, res) => {
  res.json({ message: 'Signup endpoint - to be implemented' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'Login endpoint - to be implemented' });
});

app.get('/api/watchlists', (req, res) => {
  res.json({ message: 'Watchlists endpoint - to be implemented' });
});

app.post('/api/watchlists', (req, res) => {
  res.json({ message: 'Create watchlist endpoint - to be implemented' });
});

app.get('/api/agent-activity', (req, res) => {
  res.json({ message: 'Agent activity SSE endpoint - to be implemented' });
});

// Internal agent endpoints (protected by secret)
app.get('/api/watchlists/active', (req, res) => {
  const agentSecret = req.headers['x-agent-secret'];
  if (agentSecret !== process.env.AGENT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: 'Active watchlists endpoint - to be implemented' });
});

app.post('/api/agent-activity', (req, res) => {
  const agentSecret = req.headers['x-agent-secret'];
  if (agentSecret !== process.env.AGENT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: 'Agent activity logging endpoint - to be implemented' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});

export default app;
