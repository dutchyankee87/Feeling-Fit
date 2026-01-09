# Feeling Fit Gym Operating System

Een intelligent beslissingssysteem voor Feeling Fit Utrecht dat churn voorkomt en lead conversie verhoogt.

## Kernfunctionaliteiten

### 1. Churn Prevention Dashboard
- **Real-time risico monitoring**: Detecteert leden die dreigen weg te gaan
- **AI-gedreven scoring**: 4 risiconiveaus (low, medium, high, critical)
- **Automatische detectie** van patronen zoals:
  - 14+ dagen geen check-in
  - Dalende trainingsfrequentie
  - Sudden stop na consistent trainen

### 2. Lead Nurturing System
- **30% no-show probleem** terugdringen naar <15%
- **Automatische follow-up** na 48 uur
- **Lead status tracking**: new → contacted → trial → converted

### 3. Daily Action Feed
- **Geprioriteerde taken** voor gym staff
- **1-click WhatsApp berichten**
- **Context-aware suggesties**

### 4. WhatsApp Integration
- **Automated outreach** met templates
- **Interactive bot** voor trainingsschemas
- **Bulk messaging** met rate limiting

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Database**: Supabase/PostgreSQL met Drizzle ORM
- **APIs**: CRM integratie, WhatsApp Business API (Twilio)
- **Deployment**: Vercel

## Setup Instructies

### 1. Environment Variables
Kopieer `.env.local.example` naar `.env.local` en vul in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=postgresql://...

# CRM API (vraag aan Feeling Fit)
CRM_API_URL=https://api.your-crm.com
CRM_API_KEY=your_api_key

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+31...
```

### 2. Database Setup

```bash
# Generate database schema
npm run db:generate

# Push schema to database
npm run db:push

# Open database studio
npm run db:studio
```

### 3. Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## API Endpoints

### Sync CRM Data
```
POST /api/sync
Body: { gymId: "feeling-fit-utrecht" }
```

### Get Daily Actions
```
GET /api/actions?gymId=feeling-fit-utrecht&status=pending
```

### Complete Action
```
POST /api/actions
Body: { actionId: "...", outcome: "...", completedBy: "..." }
```

## ROI Metrics

### Lead Conversion
- **Huidige situatie**: 30% no-show (30 van 100 leads)
- **Met systeem**: 15% no-show
- **Resultaat**: 15 extra klanten/maand = €7.200/jaar

### Churn Prevention
- **Huidige situatie**: 10% churn per kwartaal (50 leden)
- **Met systeem**: 7% churn
- **Resultaat**: 15 leden behouden = €1.800/kwartaal

## Deployment Checklist

- [ ] Supabase project aanmaken
- [ ] Database schema deployen
- [ ] CRM API credentials verkrijgen
- [ ] Twilio WhatsApp sandbox activeren
- [ ] Vercel deployment configureren
- [ ] Environment variables instellen
- [ ] Initial data sync uitvoeren

## Support

Voor vragen of problemen, neem contact op met het development team.