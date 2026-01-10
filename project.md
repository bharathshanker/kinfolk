# Kinfolk - Project Documentation

> A family-oriented CRM application for maintaining and organizing information about loved ones.

## Quick Overview

**Kinfolk** is a personal digital family hub that helps users:
- Create and manage profiles for family members and contacts
- Track health records, todos, notes, and financial transactions per person
- Share profiles and records with collaborators in real-time
- Use AI-powered voice/chat for hands-free data entry

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19.2, TypeScript 5.8, Vite 6.2 |
| Styling | Tailwind CSS 3.4, PostCSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| AI | Google Gemini 2.5 Flash Lite |
| Deployment | Vercel |

---

## Project Structure

```
kinfolk/
├── App.tsx                 # Root component - auth, navigation, state
├── index.tsx               # React entry point
├── index.html              # HTML template
├── index.css               # Global styles + Tailwind
├── types.ts                # TypeScript type definitions
│
├── components/
│   ├── AuthProvider.tsx    # Auth context provider
│   ├── ChatBot.tsx         # AI assistant with Gemini
│   ├── InvitePage.tsx      # Collaboration invite handler
│   ├── Newsfeed.tsx        # Dashboard/home view
│   ├── PersonDetail.tsx    # Individual profile page (5 tabs)
│   ├── Shared.tsx          # Reusable UI components
│   └── ShareComponents.tsx # Sharing UI elements
│
├── src/
│   ├── hooks/
│   │   └── usePeople.ts    # Central data hook (CRUD, realtime)
│   ├── lib/
│   │   └── supabase.ts     # Supabase client initialization
│   └── types/
│       └── supabase.ts     # Database type definitions
│
├── services/
│   └── gemini.ts           # Gemini AI service
│
├── supabase/
│   └── migrations/         # Database schema migrations
│
├── scripts/                # Utility scripts
├── dist/                   # Build output
│
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind theme
├── tsconfig.json           # TypeScript config
├── vercel.json             # Deployment config
└── package.json            # Dependencies
```

---

## Core Data Models

### Person (Main Entity)
```typescript
{
  id: string
  name: string
  relation: string              // e.g., "Mother", "Friend"
  avatarUrl?: string
  themeColor?: string           // Hex color for UI accent
  birthday?: string
  email?: string
  linkedUserId?: string         // For bidirectional sync
  collaborators: Collaborator[]
  sharingPreference: 'ALWAYS_SHARE' | 'ASK_EVERY_TIME'

  // Nested records
  health: HealthRecord[]
  todos: TodoItem[]
  financial: FinancialRecord[]
  notes: Note[]
}
```

### Record Types
| Type | Key Fields |
|------|------------|
| **HealthRecord** | title, date, type (CHECKUP/MEDICATION/VACCINE/OTHER), notes, attachments |
| **TodoItem** | title, description, dueDate, isCompleted, priority (LOW/MEDIUM/HIGH) |
| **FinancialRecord** | title, amount, type (OWED/LENT/GIFT/EXPENSE), date |
| **Note** | title, content (markdown), tags[] |

### Sharing Models
- **CollaborationRequest**: Profile-level invite with token
- **RecordShare**: Individual record sharing
- **ProfileLink**: Bidirectional sync between profiles

---

## Key Components

### App.tsx
- Root component managing global state
- Handles auth flow (login/signup via Supabase)
- Desktop sidebar + mobile bottom nav
- Renders Newsfeed or PersonDetail based on selection
- Manages AddPersonModal and ChatBot overlay

### Newsfeed.tsx
- Dashboard showing all people as circular avatars
- Pending collaboration requests shelf
- Profile preview cards
- Add new person button

### PersonDetail.tsx
- **5-tab interface**: FEED, HEALTH, TODO, FINANCE, NOTE
- **Feed tab** (default): Quick stats dashboard + activity timeline
  - StatCard components showing counts for todos, health, notes, finance
  - Clickable cards navigate to respective tabs
  - ActivityFeedItem components showing recent activity across all types
  - Relative time formatting (e.g., "2h ago", "3d ago")
- Full CRUD for all record types
- Edit profile modal with avatar upload
- Sharing and collaborator management
- Real-time updates via subscriptions

#### Feed View Helper Functions
- `getStats(person)` - Calculates summary stats (pending todos, health count, finance totals)
- `getActivityFeed(person)` - Aggregates and sorts recent items from all record types
- `formatRelativeTime(date)` - Formats dates as relative time strings

### ChatBot.tsx
- Floating AI assistant interface
- Gemini-powered with tool calling:
  - `add_todo` - Create tasks
  - `add_health_record` - Log health data
  - `add_note` - Add notes
  - `add_finance_record` - Track finances
- Context-aware (knows user's people)

### usePeople.ts (Core Hook)
Central hook providing:
- `people[]` - All user's profiles
- `loading`, `error` states
- `profileLinks` - Bidirectional connections
- 40+ methods for all CRUD operations
- Real-time subscriptions for live sync

---

## Database Schema (Supabase)

### Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (synced with Supabase Auth) |
| `people` | Family/contact profiles |
| `health_records` | Health data with attachments |
| `todos` | Tasks with priority |
| `notes` | Markdown notes with tags |
| `financial_records` | Money transactions |
| `person_shares` | Profile-level access grants |
| `item_shares` | Record-level sharing |
| `collaboration_requests` | Invite tokens |
| `profile_links` | Bidirectional sync |

### Row Level Security
- Function: `has_access_to_person(target_person_id)`
- Users can only access people they created or have been shared

### Storage Buckets
- `avatars` - Profile pictures
- `Health Records` - Medical documents

---

## Authentication

- **Email/Password** signup with Supabase Auth
- **Google OAuth** integration
- Session managed via `AuthProvider` context
- User metadata: `full_name`, `avatar_url`

---

## Real-time Features

Subscriptions on channels:
- `todos`, `health_records`, `notes`, `financial_records`
- `item_shares`, `person_shares`, `profile_links`

All changes trigger automatic data refetch.

---

## Routing

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Newsfeed | Dashboard (default) |
| `/invite/[token]` | InvitePage | Accept collaboration invite |

Client-side routing via `window.history` API.

---

## Environment Variables

```env
VITE_SUPABASE_URL=         # Supabase project URL
VITE_SUPABASE_ANON_KEY=    # Supabase anonymous key
VITE_GEMINI_API_KEY=       # Google Gemini API key
```

---

## Build & Development

```bash
# Install dependencies
npm install

# Development server (port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Build Configuration
- **Target**: ES2022
- **Minification**: Terser (removes console.log)
- **Code Splitting**: Separate chunks for react-vendor, supabase-vendor
- **Output**: `dist/`

---

## Deployment (Vercel)

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrites: All routes → `index.html`
- Security headers configured
- Asset caching: 1 year for immutable files

---

## Design System

### Colors
- **Background**: cream (#FDFBF7)
- **Text**: stone-600, stone-800
- **Accents**: rose, peach, sage, warm tones
- **Per-person**: Custom `themeColor` hex

### Typography
- Font: Nunito (Google Fonts)
- Material Symbols Rounded icons

### Components (Shared.tsx)
- `Icon` - Material Symbols wrapper
- `Card`, `Button`, `Badge`, `Avatar`
- `Modal`, `Input`, `TextArea`, `Toggle`

---

## Collaboration System

### Profile-Level Sharing
1. Owner creates `CollaborationRequest` with invite token
2. Invitee receives link: `/invite/[token]`
3. On accept: `person_share` created, optional profile merge
4. Collaborator sees profile in their dashboard

### Record-Level Sharing
1. Owner shares specific record via `item_shares`
2. Links `person_share_id` to `record_id`
3. Collaborator sees shared items in their view

### Bidirectional Sync
- `ProfileLink` connects two profiles
- Changes sync between linked users
- Useful for shared family members

---

## AI Integration (Gemini)

### Configuration
- Model: `gemini-2.5-flash-lite-preview-06-17`
- Temperature: 0.7
- System prompt includes user context

### Available Tools
```typescript
add_todo(personId, title, description?, dueDate?, priority?)
add_health_record(personId, title, date, type, notes?)
add_note(personId, title, content, tags?)
add_finance_record(personId, title, amount, type, date?)
```

### Usage
- Floating chat button (mobile FAB)
- Natural language: "Add a todo for Mom to call doctor"
- AI extracts intent and calls appropriate tool

---

## File Naming Conventions

- Components: PascalCase (`PersonDetail.tsx`)
- Hooks: camelCase with `use` prefix (`usePeople.ts`)
- Types: PascalCase for types/interfaces
- CSS: kebab-case for custom classes

---

## Common Patterns

### Adding a New Record Type
1. Add type definition in `types.ts`
2. Create database table + migration
3. Add CRUD methods in `usePeople.ts`
4. Add real-time subscription channel
5. Create UI tab in `PersonDetail.tsx`
6. (Optional) Add Gemini tool in `ChatBot.tsx`

### Adding a New Component
1. Create file in `components/`
2. Import shared components from `Shared.tsx`
3. Use Tailwind for styling
4. Connect to `usePeople` hook for data

---

## Known Considerations

- Avatar fallback uses dicebear.com API
- Markdown supported in notes content
- Health record attachments stored in Supabase Storage
- Mobile-first responsive design
- Real-time sync may have brief delays

---

## Quick Reference Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Format with Prettier (if configured)
npx prettier --write .
```

---

*Last updated: January 10, 2025*
