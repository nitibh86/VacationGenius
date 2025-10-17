import { Kafka, Consumer } from 'kafkajs';
import { Resend } from 'resend';
import axios from 'axios';
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

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Kafka/Redpanda consumer
const kafka = new Kafka({
  clientId: 'personalization-email-agent',
  brokers: [process.env.REDPANDA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'personalization-email-group' });

interface UserPreferences {
  preferredStars: number[];
  maxPricePerNight: number;
  preferredLocations: string[];
  requiredAmenities: string[];
  learningAccuracy: number;
}

class PersonalizationEngine {
  async matchDealToUser(userId: string, deal: any): Promise<any | null> {
    logger.info(`🔍 Matching deal for user ${userId}: ${deal.hotel.name}`);
    
    // Get user preferences (placeholder implementation)
    const prefs = await this.getPreferences(userId);
    
    // Calculate match score (placeholder implementation)
    const matchResult = this.calculateMatchScore(deal.hotel, prefs);
    
    // Filter out poor matches
    if (matchResult.matchScore < 60) {
      logger.info(`⚠️ Filtered: ${deal.hotel.name} for user ${userId} (score: ${matchResult.matchScore})`);
      return null;
    }
    
    // Determine urgency
    const urgency = this.determineUrgency(deal.recommendation, matchResult.matchScore);
    
    return {
      userId,
      deal,
      matchScore: matchResult.matchScore,
      matchReasons: matchResult.matchReasons,
      urgency,
      timestamp: new Date().toISOString()
    };
  }

  private async getPreferences(userId: string): Promise<UserPreferences> {
    // TODO: Implement actual preference fetching from database
    // This will be implemented by Developer 4
    return {
      preferredStars: [4, 5],
      maxPricePerNight: 300,
      preferredLocations: ['central'],
      requiredAmenities: [],
      learningAccuracy: 0.72
    };
  }

  private calculateMatchScore(hotel: any, prefs: UserPreferences) {
    let score = 0;
    const matchReasons: string[] = [];
    
    // Star rating match (0-30 points)
    const hotelStars = Math.round(hotel.rating);
    if (prefs.preferredStars.includes(hotelStars)) {
      score += 30;
      matchReasons.push(`${hotelStars}-star hotel`);
    } else {
      score += 10; // Partial credit
    }
    
    // Price match (0-30 points)
    if (hotel.pricePerNight <= prefs.maxPricePerNight) {
      const priceScore = 30 * (1 - hotel.pricePerNight / prefs.maxPricePerNight);
      score += priceScore;
      matchReasons.push(`Within budget ($${hotel.pricePerNight})`);
    }
    
    // Location match (0-20 points)
    const locationLower = hotel.location.toLowerCase();
    for (const prefLoc of prefs.preferredLocations) {
      if (locationLower.includes(prefLoc.toLowerCase())) {
        score += 20;
        matchReasons.push(`${prefLoc} location`);
        break;
      }
    }
    
    // Amenities match (0-20 points)
    let amenityMatches = 0;
    for (const required of prefs.requiredAmenities) {
      if (hotel.amenities.some((a: string) => a.toLowerCase().includes(required.toLowerCase()))) {
        amenityMatches++;
      }
    }
    if (prefs.requiredAmenities.length > 0) {
      score += (amenityMatches / prefs.requiredAmenities.length) * 20;
      if (amenityMatches > 0) {
        matchReasons.push(`Has ${amenityMatches}/${prefs.requiredAmenities.length} amenities`);
      }
    } else {
      score += 20; // No requirements = perfect match
    }
    
    return {
      matchScore: Math.round(score),
      matchReasons
    };
  }

  private determineUrgency(recommendation: string, matchScore: number): string {
    if (recommendation === 'BOOK_NOW' && matchScore > 80) {
      return 'immediate';
    }
    if (recommendation === 'BOOK_NOW' && matchScore > 70) {
      return 'soon';
    }
    return 'monitor';
  }
}

class EmailService {
  async sendDealAlert(userEmail: string, match: any) {
    const { deal, matchScore, matchReasons, urgency } = match;
    const hotel = deal.hotel;
    
    const subject = urgency === 'immediate' 
      ? `🔥 URGENT: ${deal.destination} ${Math.round((deal.savings / deal.historicalAverage) * 100)}% OFF - Book Now!`
      : `✨ Great Deal: ${hotel.name} - $${Math.round(deal.savings)} Off`;
    
    const html = this.generateEmailHTML(hotel, deal, matchScore, matchReasons, urgency);
    
    try {
      await resend.emails.send({
        from: 'VacationGenius <deals@vacationgenius.app>',
        to: userEmail,
        subject,
        html
      });
      
      logger.info(`📧 Sent email to ${userEmail}: ${hotel.name}`);
    } catch (error) {
      logger.error(`❌ Failed to send email to ${userEmail}:`, error);
    }
  }

  private generateEmailHTML(hotel: any, deal: any, matchScore: number, matchReasons: string[], urgency: string) {
    const discountPercent = Math.round((deal.savings / deal.historicalAverage) * 100);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .hotel-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #1f2937; }
    .rating { color: #f59e0b; font-size: 18px; margin-bottom: 15px; }
    .price-section { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .current-price { font-size: 36px; font-weight: bold; color: #10b981; }
    .original-price { text-decoration: line-through; color: #6b7280; font-size: 20px; }
    .savings { background: #10b981; color: white; display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin-top: 10px; }
    .match-score { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
    .urgency-banner { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin-bottom: 20px; color: #991b1b; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Your AI Found an Amazing Deal!</h1>
  </div>
  
  <div class="content">
    ${urgency === 'immediate' ? `
    <div class="urgency-banner">
      ⚠️ URGENT: This deal expires in 24 hours!
    </div>
    ` : ''}
    
    <div class="hotel-name">${hotel.name}</div>
    <div class="rating">⭐ ${hotel.rating.toFixed(1)} (${hotel.reviewCount} reviews)</div>
    <p style="color: #6b7280; margin-bottom: 20px;">📍 ${hotel.location}</p>
    
    <div class="price-section">
      <div class="original-price">Regular: $${deal.historicalAverage}/night</div>
      <div class="current-price">$${hotel.pricePerNight}/night</div>
      <div class="savings">Save $${Math.round(deal.savings)} (${discountPercent}% OFF)</div>
    </div>
    
    <div class="match-score">
      <strong>🎯 ${matchScore}/100 Match</strong>
      <p style="margin: 8px 0 0 0; color: #6b7280;">
        ${matchReasons.join(' • ')}
      </p>
    </div>
    
    <p><strong>🤖 AI Recommendation:</strong> ${deal.recommendation === 'BOOK_NOW' ? '🔥 Book now - price rising' : '👀 Monitor - could improve'}</p>
    
    <p><strong>✨ Amenities:</strong> ${hotel.amenities.slice(0, 5).join(', ')}</p>
    
    <center>
      <a href="${hotel.url}" class="cta-button">View on TripAdvisor →</a>
    </center>
    
    <p style="margin-top: 30px; color: #9ca3af; font-size: 14px; text-align: center;">
      Your AI travel agent is monitoring ${deal.destination} 24/7<br>
      <a href="https://vacationgenius.app/dashboard" style="color: #667eea;">Manage your watchlist</a>
    </p>
  </div>
</body>
</html>
    `;
  }
}

// Main personalization service
class PersonalizationService {
  private personalizer: PersonalizationEngine;
  private emailService: EmailService;

  constructor() {
    this.personalizer = new PersonalizationEngine();
    this.emailService = new EmailService();
  }

  async logActivity(action: string, details: any) {
    try {
      await axios.post(
        `${process.env.BACKEND_API_URL}/api/agent-activity`,
        {
          agentType: 'personalizer-email',
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

  async getUserEmail(userId: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${process.env.BACKEND_API_URL}/api/users/${userId}`,
        {
          headers: {
            'X-Agent-Secret': process.env.AGENT_SECRET
          }
        }
      );
      return response.data.email;
    } catch (error) {
      logger.error(`❌ Failed to get user email for ${userId}:`, error);
      return null;
    }
  }

  async handleDealAnalysis(message: any) {
    const { userId, destination, hotel, dealScore, recommendation } = message;
    
    logger.info(`\n🔍 Processing deal for user ${userId}: ${hotel.name}`);
    
    // Match deal to user preferences
    const match = await this.personalizer.matchDealToUser(userId, message);
    
    if (!match) {
      logger.info(`  ⚠️ No match - filtered out`);
      return;
    }
    
    logger.info(`  ✅ Match score: ${match.matchScore}/100`);
    logger.info(`  📌 Reasons: ${match.matchReasons.join(', ')}`);
    logger.info(`  ⚡ Urgency: ${match.urgency}`);
    
    // Get user email
    const userEmail = await this.getUserEmail(userId);
    
    if (!userEmail) {
      logger.info(`  ❌ No email found for user`);
      return;
    }
    
    // Send email based on urgency
    if (match.urgency === 'immediate' || match.urgency === 'soon') {
      await this.emailService.sendDealAlert(userEmail, match);
      
      await this.logActivity('email_sent', {
        userId,
        hotelName: hotel.name,
        matchScore: match.matchScore,
        urgency: match.urgency
      });
      
      logger.info(`  📧 Email sent to ${userEmail}`);
    } else {
      logger.info(`  📋 Queued for digest (monitor urgency)`);
    }
  }

  async start() {
    logger.info('🤖 Personalization-Email Agent starting...');
    
    await consumer.connect();
    await consumer.subscribe({ topics: ['deal-analysis'], fromBeginning: false });
    
    logger.info('✅ Subscribed to: deal-analysis');
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value!.toString());
          await this.handleDealAnalysis(data);
        } catch (error) {
          logger.error('❌ Error processing message:', error);
        }
      }
    });
    
    logger.info('✅ Agent is now listening for deals');
    await this.logActivity('agent_started', {});
  }
}

// Initialize and start the service
const personalizationService = new PersonalizationService();

personalizationService.start().catch(error => {
  logger.error('❌ Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await consumer.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await consumer.disconnect();
  process.exit(0);
});
