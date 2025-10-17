import { ApifyClient } from 'apify-client';
import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import axios from 'axios';
import * as cron from 'node-cron';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize Apify client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN!
});

// Initialize Kafka/Redpanda producer
const kafka = new Kafka({
  clientId: 'scraper-analyzer-agent',
  brokers: [process.env.REDPANDA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

// TripAdvisor location IDs mapping
const LOCATION_IDS: Record<string, string> = {
  'Paris': '187147',
  'Bali': '294226',
  'Tokyo': '298184',
  'New York': '60763',
  'London': '186338',
  'Barcelona': '187497',
  'Rome': '187791',
  'Amsterdam': '188590',
  'Berlin': '187275',
  'Madrid': '187514'
};

interface ScraperConfig {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
}

interface HotelData {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  amenities: string[];
  images: string[];
  availability: boolean;
  url: string;
  scrapedAt: string;
}

class TripAdvisorScraper {
  async scrapeDestination(config: ScraperConfig): Promise<HotelData[]> {
    logger.info(`🔍 Starting scrape for ${config.destination}...`);
    
    const locationId = LOCATION_IDS[config.destination];
    if (!locationId) {
      logger.error(`❌ Unknown destination: ${config.destination}`);
      return [];
    }

    try {
      // Run Apify TripAdvisor scraper
      const run = await apifyClient.actor("maxcopell/tripadvisor").call({
        startUrls: [{
          url: `https://www.tripadvisor.com/Hotels-g${locationId}-Hotels.html`
        }],
        searchTerm: config.destination,
        includeHotels: true,
        includeVacationRentals: true,
        includeRestaurants: false,
        maxItems: 500,
        checkInDate: config.checkInDate,
        checkOutDate: config.checkOutDate,
        currency: "USD"
      });

      logger.info(`✅ Scrape completed. Run ID: ${run.id}`);

      // Fetch results
      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      
      return this.processResults(items, config.destination);
    } catch (error) {
      logger.error(`❌ Error scraping ${config.destination}:`, error);
      return [];
    }
  }

  private processResults(items: any[], destination: string): HotelData[] {
    const hotels: HotelData[] = [];

    for (const item of items) {
      if (item.type === 'hotel' && item.offers?.[0]) {
        hotels.push({
          id: this.generateId(item.name, destination),
          name: item.name,
          location: item.locationString,
          rating: item.rating || 0,
          reviewCount: item.numberOfReviews || 0,
          pricePerNight: item.offers[0].pricePerNight || 0,
          amenities: item.amenities || [],
          images: item.images || [],
          availability: item.offers[0].availability || false,
          url: item.url,
          scrapedAt: new Date().toISOString()
        });
      }
    }

    logger.info(`📦 Processed ${hotels.length} hotels from ${destination}`);
    return hotels;
  }

  private generateId(name: string, location: string): string {
    const crypto = require('crypto');
    return crypto
      .createHash('md5')
      .update(`${name}-${location}`)
      .digest('hex')
      .substring(0, 12);
  }
}

class DealAnalyzer {
  async analyzeHotel(hotel: HotelData, destination: string): Promise<any | null> {
    // TODO: Implement deal analysis logic
    // This will be implemented by Developer 3
    logger.info(`🔍 Analyzing hotel: ${hotel.name}`);
    
    // Placeholder implementation
    const dealScore = Math.floor(Math.random() * 100);
    
    if (dealScore > 70) {
      return {
        hotel,
        dealScore,
        savings: Math.floor(Math.random() * 200),
        priceChange: Math.floor(Math.random() * 30),
        historicalAverage: hotel.pricePerNight + Math.floor(Math.random() * 100),
        recommendation: dealScore > 85 ? 'BOOK_NOW' : 'MONITOR',
        confidence: Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
  }
}

class RedpandaProducer {
  private connected: boolean = false;

  async connect() {
    if (!this.connected) {
      await producer.connect();
      this.connected = true;
      logger.info('✅ Redpanda producer connected');
    }
  }

  async sendHotelPrice(userId: string, destination: string, hotel: HotelData) {
    await this.connect();
    
    await producer.send({
      topic: 'hotel-prices',
      compression: CompressionTypes.GZIP,
      messages: [{
        key: userId,
        value: JSON.stringify({
          userId,
          destination,
          hotel,
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  async sendDealAnalysis(userId: string, destination: string, analysis: any) {
    await this.connect();
    
    await producer.send({
      topic: 'deal-analysis',
      compression: CompressionTypes.GZIP,
      messages: [{
        key: userId,
        value: JSON.stringify({
          userId,
          destination,
          ...analysis,
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  async disconnect() {
    if (this.connected) {
      await producer.disconnect();
      this.connected = false;
    }
  }
}

// Main scraper service
class ScraperService {
  private scraper: TripAdvisorScraper;
  private analyzer: DealAnalyzer;
  private producer: RedpandaProducer;

  constructor() {
    this.scraper = new TripAdvisorScraper();
    this.analyzer = new DealAnalyzer();
    this.producer = new RedpandaProducer();
  }

  async getActiveWatchlists() {
    try {
      const response = await axios.get(
        `${process.env.BACKEND_API_URL}/api/watchlists/active`,
        {
          headers: {
            'X-Agent-Secret': process.env.AGENT_SECRET
          }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('❌ Failed to get active watchlists:', error);
      return [];
    }
  }

  async logActivity(action: string, details: any) {
    try {
      await axios.post(
        `${process.env.BACKEND_API_URL}/api/agent-activity`,
        {
          agentType: 'scraper-analyzer',
          action,
          details
        },
        {
          headers: {
            'X-Agent-Secret': process.env.AGENT_SECRET
          }
        }
      );
    } catch (error) {
      logger.error('❌ Failed to log activity:', error);
    }
  }

  async runScrapingCycle() {
    logger.info('🚀 Starting scraping cycle...');
    
    try {
      // Get active watchlists
      const watchlists = await this.getActiveWatchlists();
      logger.info(`📋 Found ${watchlists.length} active watchlists`);
      
      await this.logActivity('cycle_started', { watchlistCount: watchlists.length });
      
      // Group by destination to avoid duplicate scrapes
      const destinationMap = new Map<string, any[]>();
      for (const wl of watchlists) {
        if (!destinationMap.has(wl.destination)) {
          destinationMap.set(wl.destination, []);
        }
        destinationMap.get(wl.destination)!.push(wl);
      }
      
      // Scrape each destination
      for (const [destination, watchlistsForDest] of destinationMap.entries()) {
        try {
          logger.info(`\n🔍 Scraping ${destination}...`);
          
          const hotels = await this.scraper.scrapeDestination({
            destination,
            checkInDate: watchlistsForDest[0].checkInDate,
            checkOutDate: watchlistsForDest[0].checkOutDate
          });
          
          await this.logActivity('scraped', {
            destination,
            hotelCount: hotels.length
          });
          
          // Send raw data to Redpanda
          for (const wl of watchlistsForDest) {
            for (const hotel of hotels) {
              await this.producer.sendHotelPrice(wl.userId, destination, hotel);
            }
          }
          
          // Analyze each hotel for deals
          let dealsFound = 0;
          for (const hotel of hotels) {
            const analysis = await this.analyzer.analyzeHotel(hotel, destination);
            
            if (analysis) {
              dealsFound++;
              logger.info(`  ✅ Deal found: ${hotel.name} (score: ${analysis.dealScore})`);
              
              // Send analysis to Redpanda for each user
              for (const wl of watchlistsForDest) {
                await this.producer.sendDealAnalysis(wl.userId, destination, analysis);
              }
            }
          }
          
          await this.logActivity('analyzed', {
            destination,
            dealsFound
          });
          
          logger.info(`✅ Completed ${destination}: ${dealsFound} deals found`);
          
          // Sleep 5 seconds between destinations
          await this.sleep(5000);
          
        } catch (error) {
          logger.error(`❌ Error processing ${destination}:`, error);
          await this.logActivity('error', {
            destination,
            error: error.message
          });
        }
      }
      
      await this.logActivity('cycle_completed', {
        totalDestinations: destinationMap.size
      });
      
      logger.info('\n✅ Scraping cycle completed');
      
    } catch (error) {
      logger.error('❌ Error in scraping cycle:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize and start the service
const scraperService = new ScraperService();

// Run immediately on start
scraperService.runScrapingCycle();

// Then run every 2 hours
cron.schedule('0 */2 * * *', () => {
  scraperService.runScrapingCycle();
});

// Keep process alive
logger.info('🤖 Scraper-Analyzer Agent started. Will scrape every 2 hours.');

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await scraperService.producer.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await scraperService.producer.disconnect();
  process.exit(0);
});
