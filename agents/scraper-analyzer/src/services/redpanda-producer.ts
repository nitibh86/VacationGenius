import { Kafka, Producer, CompressionTypes } from 'kafkajs';

export class RedpandaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private connected: boolean = false;
  
  constructor() {
    this.kafka = new Kafka({
      clientId: 'scraper-analyzer-agent',
      brokers: [process.env.REDPANDA_BROKER || 'localhost:9092']
    });
    
    this.producer = this.kafka.producer();
  }
  
  async connect() {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
      console.log('✅ Redpanda producer connected');
    }
  }
  
  async sendHotelPrice(userId: string, destination: string, hotel: any) {
    await this.connect();
    
    await this.producer.send({
      topic: 'hotel-prices',
      compression: CompressionTypes.GZIP,
      messages: [
        {
          key: userId,
          value: JSON.stringify({
            userId,
            destination,
            hotel,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
  }
  
  async sendDealAnalysis(userId: string, destination: string, analysis: any) {
    await this.connect();
    
    await this.producer.send({
      topic: 'deal-analysis',
      compression: CompressionTypes.GZIP,
      messages: [
        {
          key: userId,
          value: JSON.stringify({
            userId,
            destination,
            ...analysis,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
  }
  
  async disconnect() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }
}
