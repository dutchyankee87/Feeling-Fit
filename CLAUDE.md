# Feeling Fit

Gym member management system for churn prevention and lead nurturing. Uses risk scoring to identify at-risk members and automate WhatsApp outreach.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS 4
- **UI**: Framer Motion, Lucide React icons
- **Integrations**: Twilio WhatsApp, Google Sheets, Trainin CRM

## Project Structure
```
src/
  app/
    api/          # API routes (members, actions, sync, auth)
    dashboard/    # Risk monitoring dashboard
    leden/        # Members list with filtering/sorting
  components/
    ui/           # Reusable components (Button, Card, Badge)
    dashboard/    # Dashboard-specific components
  lib/
    db/           # Drizzle schema and connection
    services/     # Business logic (risk-engine, sync services)
```

## Database

Schema in `src/lib/db/schema.ts`. Key tables: members, leads, riskScores, actions, checkIns.

```typescript
import { eq, and, desc, gte } from 'drizzle-orm'

const results = await db.select()
  .from(members)
  .where(and(eq(members.gymId, gymId), gte(riskScores.score, 50)))
  .orderBy(desc(riskScores.score))
```

## API Responses
```typescript
// Success
{ success: true, data: {...} }

// Error
{ error: 'message', details: '...' }
```

## Risk Levels
- **Critical** (70+): red styling
- **High** (50-69): orange styling
- **Medium** (30-49): yellow styling
- **Low** (0-29): green styling

## Key Patterns
- Use `cn()` helper from `@/lib/utils` for conditional classes
- Reuse UI components from `@/components/ui/`
- Always check gymId for multi-tenant safety
- Include loading/error states in pages
