import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN!
});

interface ScraperConfig {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
}

export class TripAdvisorScraper {
  async scrapeDestination(config: ScraperConfig) {
    console.log(`🔍 Scraping ${config.destination}...`);
    
    // Map destinations to TripAdvisor location IDs
    const locationIds: Record<string, string> = {
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
    
    const locationId = locationIds[config.destination];
    
    if (!locationId) {
      console.error(`❌ Unknown destination: ${config.destination}`);
      return [];
    }
    
    try {
      // Run Apify TripAdvisor scraper
      const run = await client.actor("maxcopell/tripadvisor").call({
        startUrls: [
          {
            url: `https://www.tripadvisor.com/Hotels-g${locationId}-Hotels.html`
          }
        ],
        searchTerm: config.destination,
        includeHotels: true,
        includeVacationRentals: true,
        includeRestaurants: false,
        maxItems: 500,
        checkInDate: config.checkInDate,
        checkOutDate: config.checkOutDate,
        currency: "USD"
      });
      
      console.log(`✅ Scrape completed. Run ID: ${run.id}`);
      
      // Fetch results
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      
      return this.processResults(items, config.destination);
    } catch (error) {
      console.error(`❌ Error scraping ${config.destination}:`, error);
      return [];
    }
  }
  
  private processResults(items: any[], destination: string) {
    const hotels = [];
    
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
    
    console.log(`📦 Processed ${hotels.length} hotels from ${destination}`);
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
