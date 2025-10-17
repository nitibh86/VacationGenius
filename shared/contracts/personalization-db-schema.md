# Personalization Data Schema (Dev 4)

This summarizes DB entities Personalization uses (from current Prisma), plus two optional additions for analytics.

## Core Entities (already in schema)

### User
- id (String, cuid, PK)
- email (String, unique)
- name (String?)

### Watchlist
- id (String, cuid, PK)
- userId (FK → User)
- destination (String)
- checkInDate (DateTime)
- checkOutDate (DateTime)
- budget (Float)
- preferredStars (Int[])
- preferredTypes (String[])
- location (String)
- amenities (String[])
- active (Boolean)

### UserPreference
- id (String, cuid, PK)
- userId (FK → User, unique)
- preferredStars (Int[])
- maxPricePerNight (Float)
- preferredLocations (String[])
- requiredAmenities (String[])
- preferredTypes (String[])
- learningAccuracy (Float)
- updatedAt (DateTime @updatedAt)

### UserInteraction
- id (String, cuid, PK)
- userId (FK → User)
- hotelId (String)
- action (String: 'clicked' | 'booked' | 'ignored' | 'saved')
- dealData (Text JSON snapshot)
- createdAt (DateTime)

### PriceHistory
- id (String, cuid, PK)
- hotelId (String)
- destination (String)
- price (Float)
- recordedAt (DateTime)

### AgentActivity
- id (String, cuid, PK)
- agentType (String: 'scraper', 'analyzer', 'personalizer', 'email')
- action (String)
- details (Text JSON)
- createdAt (DateTime)

## Optional Additions (recommended)

### UserMatch (record personalized matches)
```prisma
model UserMatch {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hotelId       String
  destination   String
  matchScore    Int
  recommendation String  // 'BOOK_NOW' | 'MONITOR' | 'WAIT'
  dealData      String   @db.Text  // JSON with hotel + analysis
  createdAt     DateTime @default(now())

  @@index([userId, createdAt])
}
```

### EmailLog (record emails sent)
```prisma
model EmailLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hotelId   String
  subject   String
  urgency   String   // 'immediate' | 'soon' | 'monitor'
  payload   String   @db.Text // JSON sent
  sentAt    DateTime @default(now())
  status    String   // 'sent' | 'failed'
  error     String?  // failure reason

  @@index([userId, sentAt])
}
```

## Data Flow Touchpoints for Dev 4
- Consume Redpanda `deal-analysis` payload: userId, destination, timestamp, hotel{...}, dealScore, savings, historicalAverage, recommendation, confidence.
- Read `UserPreference` to compute match score and urgency.
- Write `UserInteraction` on clicks/bookings/ignores (for learning).
- (Optional) Insert `UserMatch` for audit/analytics.
- (Optional) Insert `EmailLog` upon sending emails.

## Notes
- Learning: periodically update `UserPreference` based on recent `UserInteraction`s.
- Keep payload snapshots (dealData/payload) for reproducibility.
