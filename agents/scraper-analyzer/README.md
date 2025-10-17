# Scraper-Analyzer Agent

This is the Scraping + Deal Analysis Agent for VacationGenius, responsible for:

- 🔍 Scraping TripAdvisor using Apify integration
- 📊 Analyzing hotel deals with scoring (0-100)
- 📈 Tracking price history for trend analysis
- 🚀 Producing data to Redpanda topics

## Features

- **Scheduled Scraping**: Runs every 2 hours automatically
- **Deal Analysis**: Sophisticated scoring algorithm considering price discounts, ratings, reviews, and amenities
- **Price History**: Tracks 30-day price trends for accurate deal detection
- **Real-time Streaming**: Sends data to Redpanda topics for downstream processing
- **Error Handling**: Robust error handling with activity logging

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Apify API     │───▶│  TripAdvisor    │───▶│   Deal Analysis │
│   Integration   │    │    Scraper      │    │     Engine      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redpanda      │◀───│  Price History  │◀───│   PostgreSQL    │
│   Topics        │    │   Tracking      │    │    Database     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Apify Configuration
APIFY_API_TOKEN=your_apify_api_token_here

# Redpanda/Kafka Configuration
REDPANDA_BROKER=localhost:9092

# Backend API Configuration
BACKEND_API_URL=http://localhost:3001
AGENT_SECRET=your_agent_secret_here

# Database Configuration (for Prisma)
DATABASE_URL=postgresql://username:password@localhost:5432/vacation_genius
```

## Installation

```bash
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Deal Scoring Algorithm

The deal analyzer uses a sophisticated scoring system (0-100 points):

- **Price Discount (0-40 points)**: Based on percentage off historical average
- **Rating Quality (0-25 points)**: Based on hotel rating (0-5 stars)
- **Review Count (0-15 points)**: Based on number of reviews (up to 500)
- **Amenities (0-10 points)**: Based on number of amenities available
- **Availability (0-10 points)**: Bonus for confirmed availability

## Redpanda Topics

The agent produces to two main topics:

1. **hotel-prices**: Raw scraped hotel data
2. **deal-analysis**: Analyzed deals with scores and recommendations

## Supported Destinations

- Paris
- Bali
- Tokyo
- New York
- London
- Barcelona
- Rome
- Amsterdam
- Berlin
- Madrid

## API Integration

The agent communicates with the backend API to:
- Get active watchlists
- Log agent activities
- Record price history in the database

## Error Handling

- Graceful handling of Apify API failures
- Retry logic for network issues
- Comprehensive logging of all activities
- Graceful shutdown on SIGINT/SIGTERM
