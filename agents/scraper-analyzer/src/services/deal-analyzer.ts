import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HotelData {
  id: string;
  name: string;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  availability: boolean;
}

export class DealAnalyzer {
  async analyzeHotel(hotel: HotelData, destination: string) {
    // 1. Get price history
    const history = await this.getPriceHistory(hotel.id, destination);
    
    if (history.length === 0) {
      // First time seeing this hotel - just store price
      await this.recordPrice(hotel.id, hotel.pricePerNight, destination);
      return null;
    }
    
    // 2. Calculate 30-day average
    const avg30Day = this.calculate30DayAverage(history);
    
    // 3. Calculate deal score (0-100)
    const dealScore = this.calculateDealScore(hotel, avg30Day);
    
    // 4. Only proceed if score > 70
    if (dealScore < 70) {
      await this.recordPrice(hotel.id, hotel.pricePerNight, destination);
      return null;
    }
    
    // 5. Calculate metrics
    const savings = avg30Day - hotel.pricePerNight;
    const priceChange = ((hotel.pricePerNight - avg30Day) / avg30Day) * 100;
    
    // 6. Determine recommendation
    const recommendation = this.getRecommendation(dealScore, priceChange, history);
    
    // 7. Record price
    await this.recordPrice(hotel.id, hotel.pricePerNight, destination);
    
    return {
      hotel,
      dealScore,
      savings,
      priceChange,
      historicalAverage: avg30Day,
      recommendation,
      confidence: this.calculateConfidence(history),
      timestamp: new Date().toISOString()
    };
  }
  
  private calculateDealScore(hotel: HotelData, avg30Day: number): number {
    let score = 0;
    
    // Price discount (0-40 points)
    if (avg30Day > 0) {
      const discount = ((avg30Day - hotel.pricePerNight) / avg30Day) * 100;
      score += Math.min(Math.max(discount * 2, 0), 40);
    }
    
    // Rating quality (0-25 points)
    score += (hotel.rating / 5) * 25;
    
    // Review count (0-15 points)
    score += Math.min((hotel.reviewCount / 500) * 15, 15);
    
    // Amenities (0-10 points)
    score += Math.min(hotel.amenities.length * 2, 10);
    
    // Availability (0-10 points)
    if (hotel.availability) score += 10;
    
    return Math.round(score);
  }
  
  private getRecommendation(
    dealScore: number,
    _priceChange: number,
    history: any[]
  ): 'BOOK_NOW' | 'MONITOR' | 'WAIT' {
    // BOOK_NOW: Excellent deal + price rising
    if (dealScore > 85 && this.isPriceRising(history)) {
      return 'BOOK_NOW';
    }
    
    // BOOK_NOW: Great deal
    if (dealScore > 80) {
      return 'BOOK_NOW';
    }
    
    // MONITOR: Good deal but could improve
    if (dealScore > 70 && this.isPriceFalling(history)) {
      return 'MONITOR';
    }
    
    return 'WAIT';
  }
  
  private async getPriceHistory(hotelId: string, destination: string) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const records = await prisma.priceHistory.findMany({
      where: {
        hotelId,
        destination,
        recordedAt: { gte: cutoffDate }
      },
      orderBy: { recordedAt: 'asc' }
    });
    
    return records.map((r: any) => ({
      price: r.price,
      date: r.recordedAt.toISOString()
    }));
  }
  
  private async recordPrice(hotelId: string, price: number, destination: string) {
    await prisma.priceHistory.create({
      data: { hotelId, price, destination }
    });
  }
  
  private calculate30DayAverage(history: any[]): number {
    const sum = history.reduce((acc, p) => acc + p.price, 0);
    return Math.round(sum / history.length);
  }
  
  private calculateConfidence(history: any[]): number {
    return Math.round(Math.min(history.length / 30, 1) * 100);
  }
  
  private isPriceRising(history: any[]): boolean {
    if (history.length < 7) return false;
    const recent = history.slice(-7);
    const firstHalf = recent.slice(0, 3);
    const secondHalf = recent.slice(-3);
    const firstAvg = firstHalf.reduce((acc, p) => acc + p.price, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc, p) => acc + p.price, 0) / secondHalf.length;
    return secondAvg > firstAvg * 1.05;
  }
  
  private isPriceFalling(history: any[]): boolean {
    if (history.length < 7) return false;
    const recent = history.slice(-7);
    const firstHalf = recent.slice(0, 3);
    const secondHalf = recent.slice(-3);
    const firstAvg = firstHalf.reduce((acc, p) => acc + p.price, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc, p) => acc + p.price, 0) / secondHalf.length;
    return secondAvg < firstAvg * 0.95;
  }
}
