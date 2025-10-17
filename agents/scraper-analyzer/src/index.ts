import { TripAdvisorScraper } from './services/apify-scraper';
import { DealAnalyzer } from './services/deal-analyzer';
import { RedpandaProducer } from './services/redpanda-producer';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const scraper = new TripAdvisorScraper();
const analyzer = new DealAnalyzer();
const producer = new RedpandaProducer();

async function getActiveWatchlists() {
  const response = await axios.get(
    `${process.env.BACKEND_API_URL}/api/watchlists/active`,
    {
      headers: {
        'X-Agent-Secret': process.env.AGENT_SECRET
      }
    }
  );
  return response.data;
}

async function logActivity(action: string, details: any) {
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
}

async function runScrapingCycle() {
  console.log('🚀 Starting scraping cycle...');
  
  try {
    // 1. Get active watchlists
    const watchlists = await getActiveWatchlists();
    console.log(`📋 Found ${watchlists.length} active watchlists`);
    
    await logActivity('cycle_started', { watchlistCount: watchlists.length });
    
    // 2. Group by destination to avoid duplicate scrapes
    const destinationMap = new Map<string, any[]>();
    for (const wl of watchlists) {
      if (!destinationMap.has(wl.destination)) {
        destinationMap.set(wl.destination, []);
      }
      destinationMap.get(wl.destination)!.push(wl);
    }
    
    // 3. Scrape each destination
    for (const [destination, watchlistsForDest] of destinationMap.entries()) {
      try {
        console.log(`\n🔍 Scraping ${destination}...`);
        
        const hotels = await scraper.scrapeDestination({
          destination,
          checkInDate: watchlistsForDest[0].checkInDate,
          checkOutDate: watchlistsForDest[0].checkOutDate
        });
        
        await logActivity('scraped', {
          destination,
          hotelCount: hotels.length
        });
        
        // 4. Send raw data to Redpanda
        for (const wl of watchlistsForDest) {
          for (const hotel of hotels) {
            await producer.sendHotelPrice(wl.userId, destination, hotel);
          }
        }
        
        // 5. Analyze each hotel for deals
        let dealsFound = 0;
        for (const hotel of hotels) {
          const analysis = await analyzer.analyzeHotel(hotel, destination);
          
          if (analysis) {
            dealsFound++;
            console.log(`  ✅ Deal found: ${hotel.name} (score: ${analysis.dealScore})`);
            
            // Send analysis to Redpanda for each user
            for (const wl of watchlistsForDest) {
              await producer.sendDealAnalysis(wl.userId, destination, analysis);
            }
          }
        }
        
        await logActivity('analyzed', {
          destination,
          dealsFound
        });
        
        console.log(`✅ Completed ${destination}: ${dealsFound} deals found`);
        
        // Sleep 5 seconds between destinations
        await sleep(5000);
        
      } catch (error) {
        console.error(`❌ Error processing ${destination}:`, error);
        await logActivity('error', {
          destination,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    await logActivity('cycle_completed', {
      totalDestinations: destinationMap.size
    });
    
    console.log('\n✅ Scraping cycle completed');
    
  } catch (error) {
    console.error('❌ Error in scraping cycle:', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run immediately on start
runScrapingCycle();

// Then run every 2 hours
setInterval(() => {
  runScrapingCycle();
}, 2 * 60 * 60 * 1000); // 2 hours

// Keep process alive
console.log('🤖 Scraper-Analyzer Agent started. Will scrape every 2 hours.');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await producer.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await producer.disconnect();
  process.exit(0);
});