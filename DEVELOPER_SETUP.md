# VacationGenius - Developer Setup Guide

## 🎯 Quick Start Checklist

- [ ] Clone repository
- [ ] Install dependencies: `npm run install:all`
- [ ] Copy `env.example` to `.env` and configure API keys
- [ ] Start infrastructure: `npm run docker:up`
- [ ] Setup database: `npm run db:generate && npm run db:push`
- [ ] Start development: `npm run dev`

## 🔑 Required API Keys

### Apify (TripAdvisor Scraping)
1. Sign up at [apify.com](https://apify.com)
2. Go to Account Settings → Integrations → API tokens
3. Create new token
4. Add to `.env`: `APIFY_API_TOKEN=your-token-here`

### Resend (Email Service)
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys in dashboard
3. Create new API key
4. Add to `.env`: `RESEND_API_KEY=your-key-here`

### StackAI (Optional - Advanced ML)
1. Sign up at [stack-ai.com](https://stack-ai.com)
2. Create new project
3. Get API key from project settings
4. Add to `.env`: `STACKAI_API_KEY=your-key-here`

## 🏗️ Development Workflow

### 1. Start Infrastructure
```bash
# Start PostgreSQL and Redpanda
npm run docker:up

# Check services are healthy
docker-compose ps
```

### 2. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Optional: Open Prisma Studio
npm run db:studio
```

### 3. Start All Services
```bash
# Start everything
npm run dev

# Or start individually:
npm run dev:frontend    # http://localhost:3000
npm run dev:backend     # http://localhost:3001
npm run dev:scraper     # Scraping agent
npm run dev:personalizer # Personalization agent
```

## 🔧 Individual Service Development

### Frontend (Developer 1)
```bash
cd frontend
npm run dev
# http://localhost:3000
```

### Backend (Developer 2)
```bash
cd backend
npm run dev
# http://localhost:3001
```

### Scraper Agent (Developer 3)
```bash
cd agents/scraper-analyzer
npm run dev
```

### Personalization Agent (Developer 4)
```bash
cd agents/personalization-email
npm run dev
```

## 📊 Monitoring & Debugging

### Redpanda Console
- URL: http://localhost:8080
- View topics, messages, consumer groups

### Database
- Prisma Studio: `npm run db:studio`
- Direct connection: `postgresql://postgres:postgres@localhost:5432/vacation_genius`

### Logs
- All services use Winston for structured logging
- Check console output for real-time logs
- Logs include agent activities and errors

## 🐛 Common Issues

### Port Conflicts
- Frontend: 3000
- Backend: 3001
- PostgreSQL: 5432
- Redpanda: 19092, 18081, 18082, 19644
- Redpanda Console: 8080

### Database Connection
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
npm run db:push
```

### Redpanda Issues
```bash
# Reset Redpanda
docker-compose down -v
docker-compose up -d redpanda
```

### Agent Communication
- Ensure `AGENT_SECRET` is set in all `.env` files
- Check `BACKEND_API_URL` points to correct backend
- Verify `REDPANDA_BROKER` is accessible

## 🧪 Testing

### Manual Testing
1. Create watchlist in frontend
2. Check agent logs for scraping activity
3. Verify Redpanda topics have messages
4. Test email sending with Resend

### Integration Testing
```bash
# Test all services together
npm run dev

# Check health endpoints
curl http://localhost:3001/health
curl http://localhost:3000/api/health
```

## 📈 Performance Monitoring

### Redpanda Metrics
- Message throughput
- Consumer lag
- Topic sizes

### Database Metrics
- Query performance
- Connection pool usage
- Index usage

### Agent Metrics
- Scraping frequency
- Deal detection rate
- Email send success rate

## 🚀 Production Deployment

### Environment Variables
- Use strong secrets for JWT_SECRET and AGENT_SECRET
- Configure production database URLs
- Set up proper CORS origins
- Use production email domains

### Scaling Considerations
- Multiple agent instances for scraping
- Database connection pooling
- Redpanda cluster for high availability
- Load balancing for frontend/backend

## 📞 Support

### Developer 1 (Frontend)
- Next.js documentation: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs

### Developer 2 (Backend)
- Express.js: https://expressjs.com/
- Prisma: https://www.prisma.io/docs

### Developer 3 (Scraper)
- Apify: https://docs.apify.com/
- KafkaJS: https://kafka.js.org/

### Developer 4 (Personalization)
- Resend: https://resend.com/docs
- StackAI: https://docs.stack-ai.com/

---

**Happy coding! 🚀**
