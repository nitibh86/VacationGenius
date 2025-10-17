# 🎉 VacationGenius - AI Travel Deal Optimizer

> **Your 24/7 AI travel agent that monitors thousands of hotels, flights, and vacation rentals, learns your preferences, and emails you the perfect deal at exactly the right time to book.**

[![Built for Future of Agents Hackathon](https://img.shields.io/badge/Built%20for-Future%20of%20Agents%20Hackathon-blue)](https://hackathon.com)
[![Powered by Apify](https://img.shields.io/badge/Powered%20by-Apify-green)](https://apify.com)
[![Powered by Redpanda](https://img.shields.io/badge/Powered%20by-Redpanda-orange)](https://redpanda.com)
[![Powered by StackAI](https://img.shields.io/badge/Powered%20by-StackAI-purple)](https://stack-ai.com)

## 🚀 Overview

VacationGenius is the **first fully autonomous AI travel agent** that solves three critical pain points in travel booking:

1. **Deals disappear before you find them** - Hotel prices change 1-3 times per day
2. **No way to optimize the full trip cost** - Need perfect combination of hotel + flight + dates  
3. **Generic alerts don't match your preferences** - Alert fatigue from irrelevant deals

### The Solution

A multi-agent system where:
- **Agent 1** continuously scrapes TripAdvisor for real-time prices (Apify)
- **Agent 2** streams all data through a real-time pipeline (Redpanda)
- **Agent 3** analyzes deals and predicts optimal booking times (StackAI)
- **Agent 4** learns your preferences and sends perfectly timed emails (StackAI)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VacationGenius System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Frontend (Next.js) - Developer 1                                   │
│  ├─> User dashboard with watchlist management                       │
│  ├─> Real-time agent activity logs (SSE)                           │
│  ├─> Learning curve visualization                                   │
│  └─> Deal cards with match scores                                   │
│                                                                      │
│  Backend API (Express) - Developer 2                                │
│  ├─> REST API for frontend                                         │
│  ├─> Watchlist CRUD operations                                     │
│  ├─> User preference management                                     │
│  └─> Agent coordination endpoints                                   │
│                                                                      │
│  Scraping + Deal Analysis Agent (Node.js) - Developer 3            │
│  ├─> Apify TripAdvisor scraper integration                         │
│  ├─> Scheduled scraping every 2 hours                              │
│  ├─> Deal quality scoring (0-100)                                  │
│  ├─> Price history tracking                                        │
│  └─> Produce to Redpanda 'hotel-prices' & 'deal-analysis'          │
│                                                                      │
│  Personalization + Email Agent (Node.js) - Developer 4             │
│  ├─> Consume from Redpanda 'deal-analysis'                         │
│  ├─> Match deals to user preferences                               │
│  ├─> Learning engine (72% → 94% accuracy)                          │
│  ├─> StackAI integration for predictions                           │
│  └─> Email sending via Resend API                                  │
│                                                                      │
│  Redpanda (Streaming) - Shared Infrastructure                       │
│  ├─> Topic 1: 'hotel-prices' (raw scraped data)                    │
│  ├─> Topic 2: 'deal-analysis' (scored deals)                       │
│  ├─> Topic 3: 'user-matches' (personalized matches)                │
│  └─> Topic 4: 'email-queue' (outgoing emails)                      │
│                                                                      │
│  Database (PostgreSQL/Supabase) - Shared                           │
│  ├─> Users & watchlists                                            │
│  ├─> Price history                                                 │
│  ├─> User preferences & interactions                               │
│  └─> Learning metrics                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend (Developer 1)
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **NextAuth.js** - Authentication
- **Recharts** - Data visualization
- **Server-Sent Events** - Real-time updates

### Backend (Developer 2)
- **Express.js** - REST API server
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **Zod** - Schema validation
- **Winston** - Logging

### Scraping Agent (Developer 3)
- **Apify** - TripAdvisor scraping
- **KafkaJS** - Redpanda producer
- **Node-cron** - Scheduled tasks
- **Winston** - Logging

### Personalization Agent (Developer 4)
- **KafkaJS** - Redpanda consumer
- **Resend** - Email service
- **StackAI** - ML predictions
- **Winston** - Logging

### Infrastructure
- **Redpanda** - Kafka-compatible streaming
- **Docker Compose** - Local development
- **PostgreSQL** - Database

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd vacation-genius
npm run install:all
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env with your API keys
# Required: DATABASE_URL, APIFY_API_TOKEN, RESEND_API_KEY
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redpanda
npm run docker:up

# Wait for services to be healthy
docker-compose ps
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 5. Start Development

```bash
# Start all services
npm run dev

# Or start individually:
npm run dev:frontend    # http://localhost:3000
npm run dev:backend     # http://localhost:3001
npm run dev:scraper     # Scraping agent
npm run dev:personalizer # Personalization agent
```

## 📁 Project Structure

```
vacation-genius/
├── frontend/                    # Next.js frontend (Developer 1)
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   └── lib/                # Utilities
│   ├── package.json
│   └── tailwind.config.js
├── backend/                     # Express API (Developer 2)
│   ├── src/
│   │   ├── routes/             # API routes
│   │   ├── middleware/          # Auth, validation
│   │   └── services/            # Business logic
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── package.json
├── agents/
│   ├── scraper-analyzer/        # Scraping agent (Developer 3)
│   │   ├── src/
│   │   │   ├── services/        # Apify, Redpanda
│   │   │   └── index.ts         # Main agent loop
│   │   └── package.json
│   └── personalization-email/   # Personalization agent (Developer 4)
│       ├── src/
│       │   ├── services/        # Email, ML
│       │   └── index.ts         # Main agent loop
│       └── package.json
├── docker-compose.yml           # Local infrastructure
├── package.json                 # Root workspace config
└── README.md
```

## 🔧 Developer Roles

### Developer 1: Frontend (Next.js)
**Responsibilities:**
- User dashboard with watchlist management
- Real-time agent activity logs (SSE)
- Learning curve visualization
- Deal cards with match scores
- Authentication and user management

**Key Files:**
- `frontend/src/app/page.tsx` - Landing page
- `frontend/src/app/dashboard/` - User dashboard
- `frontend/src/components/` - React components

### Developer 2: Backend API (Express)
**Responsibilities:**
- REST API for frontend
- Watchlist CRUD operations
- User preference management
- Agent coordination endpoints
- Database schema and migrations

**Key Files:**
- `backend/src/routes/` - API endpoints
- `backend/prisma/schema.prisma` - Database schema
- `backend/src/middleware/` - Authentication

### Developer 3: Scraping Agent (Node.js)
**Responsibilities:**
- Apify TripAdvisor scraper integration
- Scheduled scraping every 2 hours
- Deal quality scoring (0-100)
- Price history tracking
- Redpanda producer

**Key Files:**
- `agents/scraper-analyzer/src/index.ts` - Main agent
- `agents/scraper-analyzer/src/services/` - Apify, Redpanda

### Developer 4: Personalization Agent (Node.js)
**Responsibilities:**
- Redpanda consumer for deal analysis
- Match deals to user preferences
- Learning engine (72% → 94% accuracy)
- StackAI integration for predictions
- Email sending via Resend

**Key Files:**
- `agents/personalization-email/src/index.ts` - Main agent
- `agents/personalization-email/src/services/` - Email, ML

## 🔑 API Keys Required

### Apify (Required)
- Sign up at [apify.com](https://apify.com)
- Get API token from account settings
- Add to `APIFY_API_TOKEN` in `.env`

### Resend (Required)
- Sign up at [resend.com](https://resend.com)
- Get API key from dashboard
- Add to `RESEND_API_KEY` in `.env`

### StackAI (Optional)
- Sign up at [stack-ai.com](https://stack-ai.com)
- Create project and get API key
- Add to `STACKAI_API_KEY` in `.env`

## 📊 Data Flow

```
User Sets Watchlist → Backend API → Database
                          ↓
                    Scraping Agent reads watchlist every 2 hours
                          ↓
                    Apify scrapes TripAdvisor
                          ↓
                    Redpanda 'hotel-prices' topic
                          ↓
                    Deal Analysis (scoring + filtering)
                          ↓
                    Redpanda 'deal-analysis' topic
                          ↓
                    Personalization Agent (matching + learning)
                          ↓
                    Redpanda 'user-matches' topic
                          ↓
                    Email Agent → Send via Resend
                          ↓
                    User receives email & clicks
                          ↓
                    Feedback loop → Update learning
```

## 🎯 Success Metrics

- ✅ Agents run continuously in background (visible dashboard logs)
- ✅ Real-time price drop detected and email sent in < 60 seconds
- ✅ User preferences learned from 3+ interactions
- ✅ All 3 sponsor tools (Apify, Redpanda, StackAI) clearly demonstrated
- ✅ System handles 100+ hotels per destination without lag
- ✅ Learning curve visualization shows improvement over time
- ✅ 3-minute demo runs flawlessly with live streaming data

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Each developer works on their assigned component
2. Use feature branches for development
3. Test locally with `npm run dev`
4. Submit PR for review
5. Deploy to staging for integration testing

## 📝 License

MIT License - Built for the Future of Agents Hackathon

## 🏆 Hackathon Goals

- **Autonomy (20%)**: Agents run continuously, make decisions, send emails without manual intervention
- **Real-World Value (20%)**: Saves users $500-2000 per trip, reduces research time to zero
- **Tool Integration (20%)**: Deep integration with Apify, Redpanda, and StackAI
- **Technical Implementation (20%)**: Real streaming architecture with multi-agent coordination
- **Presentation (20%)**: Live demo with real-time data processing

---

**Built with ❤️ for the Future of Agents Hackathon**

*Powered by Apify, Redpanda, and StackAI*
