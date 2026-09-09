# CareerHub Pro

A professional career management platform that helps you build resumes, track job applications, generate cover letters, and leverage AI-powered tools to accelerate your job search.

![CareerHub Pro](public/og-image.png)

---

## Features

### Resume Builder
- Create and manage multiple resumes with structured data (experience, education, skills, certifications, projects, volunteering, awards, publications)
- Two professional templates: **Modern** (teal accent, clean layout) and **Classic** (traditional serif style)
- PDF export with async processing and live progress indicator
- AI-powered resume suggestions and improvements

### Job Application Tracker
- Track applications through 5 status stages: **Wishlist → Applied → Interview → Offer → Rejected**
- Store job descriptions, salary info, company details, and personal notes
- Visual dashboard with status breakdowns and activity charts

### AI-Powered Tools
- **Resume Suggestions** — Get targeted improvement recommendations for any resume
- **Job Analysis** — Paste a job description and get a structured breakdown of requirements, skills, and culture signals
- **ATS Checker** — Score your resume against ATS parsing standards (generic mode) or a specific job description (Greenhouse/Workable scorecard mode with keyword matching)
- **Job Matcher** — Quick compatibility score between your resume and a job posting
- **Interview Prep** — Generate tailored interview questions and suggested answers based on your resume + target role
- **Tailor CV** — AI rewrites your resume to match a specific job description (saves as a new copy, never overwrites the original)
- **Cover Letter Generator** — Streaming AI-generated cover letters based on your resume and job details
- **CV Parser** — Upload a PDF resume and extract structured data automatically
- **LinkedIn Importer** — Paste your LinkedIn profile text to auto-populate resume fields

### Document Storage
- Upload and manage career documents (resumes, certificates, portfolios, etc.)
- Private cloud storage with secure presigned URLs
- File type and size tracking

### Cover Letter Manager
- Create, edit, and organize cover letters
- AI-assisted generation linked to your resume data

### Production-Grade Features
- **Per-user rate limiting**: 60 AI calls/day, 40 PDF exports/day (configurable), resets at midnight UTC
- **Async PDF export**: Non-blocking background processing with polling and progress UX
- **Input validation & resilience**: All API routes hardened against malformed JSON, wrong types, and edge-case inputs
- **AI reliability layer**: Automatic retries with exponential backoff, robust JSON extraction, timeout handling

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3, Framer Motion |
| UI Components | Radix UI, shadcn/ui, Lucide Icons |
| Database | PostgreSQL (via Prisma ORM) |
| Authentication | NextAuth.js v4 (credentials provider) |
| Cloud Storage | AWS S3 (presigned uploads) |
| AI / LLM | OpenAI-compatible API (SSE streaming + JSON modes) |
| Charts | Recharts |
| State | React Query, Zustand, Jotai |
| Forms | React Hook Form, Zod validation |

---

## Project Structure

```
├── app/
│   ├── (authenticated)/          # Protected routes (sidebar layout)
│   │   ├── dashboard/             # Main dashboard with stats & charts
│   │   ├── resumes/               # Resume CRUD + AI tools
│   │   ├── jobs/                  # Job application tracker
│   │   ├── cover-letters/         # Cover letter manager
│   │   ├── documents/             # Document storage
│   │   ├── ai-tools/              # Standalone AI tools page
│   │   ├── interview-prep/        # Interview preparation
│   │   └── layout.tsx             # AppShell wrapper (sidebar + nav)
│   ├── api/
│   │   ├── ai/                    # 9 AI-powered endpoints
│   │   │   ├── analyze-job/       # Job description analysis
│   │   │   ├── ats-check/         # ATS compatibility scoring
│   │   │   ├── cover-letter/      # Cover letter generation (streaming)
│   │   │   ├── interview-prep/    # Interview Q&A generation
│   │   │   ├── job-match/         # Resume-job match scoring
│   │   │   ├── parse-cv/          # PDF resume parsing
│   │   │   ├── parse-linkedin/    # LinkedIn profile parsing
│   │   │   ├── suggestions/       # Resume improvement suggestions (streaming)
│   │   │   └── tailor-cv/         # AI resume tailoring
│   │   ├── auth/                  # NextAuth endpoints
│   │   ├── cover-letters/         # Cover letter CRUD
│   │   ├── dashboard/             # Dashboard stats aggregation
│   │   ├── documents/             # Document CRUD
│   │   ├── jobs/                  # Job CRUD
│   │   ├── onboarding/            # Onboarding flow + status
│   │   ├── resumes/               # Resume CRUD + PDF export
│   │   ├── signup/                # User registration
│   │   └── upload/                # S3 presigned URL generation
│   ├── login/                     # Login page
│   ├── signup/                    # Signup page
│   ├── onboarding/                # New user onboarding wizard
│   ├── globals.css                # Tailwind + custom styles
│   ├── layout.tsx                 # Root layout (fonts, providers)
│   ├── page.tsx                   # Landing page
│   └── providers.tsx              # Session + Query providers
├── components/
│   ├── layouts/                   # Reusable layout shells
│   │   ├── app-shell.tsx          # Sidebar navigation shell
│   │   ├── auth-layout.tsx        # Centered auth form layout
│   │   ├── container.tsx          # Max-width content wrapper
│   │   ├── page-header.tsx        # Page title + description header
│   │   └── section.tsx            # Section wrapper
│   ├── ui/                        # shadcn/ui component library (40+ components)
│   ├── theme-provider.tsx         # Dark/light theme provider
│   └── theme-toggle.tsx           # Theme switch button
├── lib/
│   ├── ai.ts                      # Resilient LLM helpers (retries, JSON extraction, streaming)
│   ├── auth.ts                    # NextAuth configuration
│   ├── aws-config.ts              # AWS S3 client setup
│   ├── db.ts                      # Prisma client singleton
│   ├── pdf-export.ts              # Client-side async PDF export helper
│   ├── rate-limit.ts              # Per-user daily quota enforcement
│   ├── s3.ts                      # S3 upload/download utilities
│   ├── utils.ts                   # General utilities (cn, formatDate, etc.)
│   └── validate.ts                # Input validation helpers
├── prisma/
│   └── schema.prisma              # Database schema (7 models)
├── scripts/
│   ├── seed.ts                    # Database seeder (sample user + data)
│   └── safe-seed.ts               # Safe seed wrapper
├── public/
│   ├── favicon.svg
│   └── og-image.png
├── types/
│   └── next-auth.d.ts             # NextAuth type extensions
├── middleware.ts                   # Route protection middleware
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── postcss.config.js
```

---

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- An OpenAI-compatible LLM API key
- AWS S3 bucket (for document storage)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/careerhub-pro.git
cd careerhub-pro
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Authentication
NEXTAUTH_SECRET="<generate-with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# LLM API
ABACUSAI_API_KEY="<your-openai-compatible-api-key>"

# AWS S3 (document storage)
AWS_ACCESS_KEY_ID="<your-aws-access-key>"
AWS_SECRET_ACCESS_KEY="<your-aws-secret-key>"
AWS_REGION="<your-region>"
AWS_S3_BUCKET="<your-bucket-name>"

# PDF Generation API (optional — for resume PDF export)
HTML2PDF_API_URL="<your-html2pdf-service-url>"
HTML2PDF_API_KEY="<your-html2pdf-api-key>"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed sample data
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## Database Schema

The app uses 7 Prisma models:

| Model | Purpose |
|---|---|
| `User` | User accounts with onboarding state and career preferences |
| `AiUsage` | Per-user daily AI/PDF usage tracking for rate limiting |
| `Account` | OAuth account links (NextAuth adapter) |
| `Session` | Active sessions (NextAuth adapter) |
| `Resume` | Resume data (structured fields + JSON arrays for experience, education, etc.) |
| `Job` | Job applications with status tracking |
| `Document` | Uploaded documents with S3 cloud storage paths |
| `CoverLetter` | Cover letters with company/role metadata |

See [`prisma/schema.prisma`](prisma/schema.prisma) for the full schema.

---

## API Routes

### CRUD Endpoints
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/resumes` | List / create resumes |
| GET/POST | `/api/jobs` | List / create job applications |
| GET/POST | `/api/cover-letters` | List / create cover letters |
| GET/POST/DELETE | `/api/documents` | List / upload / delete documents |
| GET | `/api/dashboard` | Aggregated dashboard statistics |
| POST | `/api/signup` | User registration |
| GET/POST | `/api/onboarding` | Onboarding status / completion |

### AI Endpoints (all POST, all rate-limited)
| Route | Mode | Description |
|---|---|---|
| `/api/ai/suggestions` | SSE streaming | Resume improvement suggestions |
| `/api/ai/analyze-job` | SSE streaming | Job description analysis |
| `/api/ai/cover-letter` | Text streaming | Cover letter generation |
| `/api/ai/ats-check` | JSON | ATS compatibility scoring |
| `/api/ai/job-match` | JSON | Resume-job match score |
| `/api/ai/interview-prep` | JSON | Interview Q&A generation |
| `/api/ai/tailor-cv` | JSON | Resume tailoring for a job |
| `/api/ai/parse-cv` | JSON | PDF resume parsing |
| `/api/ai/parse-linkedin` | JSON | LinkedIn profile text parsing |

### File Handling
| Method | Route | Description |
|---|---|---|
| POST | `/api/upload/presigned` | Generate S3 presigned upload URL |
| POST | `/api/upload/complete` | Confirm upload completion |
| POST | `/api/resumes/export-pdf` | Initiate async PDF export |
| POST | `/api/resumes/export-pdf/status` | Poll PDF export status |

---

## Design System

### Color Palette
- **Primary (Teal):** `hsl(170, 70%, 35%)` (light) / `hsl(170, 70%, 40%)` (dark)
- **Status Colors:**
  - Wishlist: Blue
  - Applied: Yellow/Amber
  - Interview: Purple
  - Offer: Green
  - Rejected: Red

### Typography
- **Body:** DM Sans
- **Display/Headings:** Plus Jakarta Sans
- **Code:** JetBrains Mono

### Components
The UI is built on [shadcn/ui](https://ui.shadcn.com/) with 40+ components in `components/ui/`. See `STYLE_GUIDE.md` for the full component catalog and usage patterns.

---

## Rate Limiting

All AI and PDF endpoints enforce per-user daily quotas:

| Bucket | Default Limit | Reset |
|---|---|---|
| `ai` | 60 calls/day | Midnight UTC |
| `pdf` | 40 exports/day | Midnight UTC |

Limits are defined in `lib/rate-limit.ts` → `DAILY_LIMITS` and can be adjusted without code changes. The system fails open on database errors (a transient DB issue never blocks users).

---

## Architecture Decisions

1. **Resume data as JSON strings** — Experience, education, skills, etc. are stored as JSON-stringified arrays in PostgreSQL text columns. This allows flexible schema evolution without migrations for nested structures.

2. **Async PDF export** — PDF generation is delegated to an external HTML-to-PDF service. The flow is: client POST → server returns `request_id` → client polls `/status` endpoint → download when complete.

3. **AI reliability layer** (`lib/ai.ts`) — All LLM calls go through shared helpers with:
   - Configurable timeouts (default 60s, 90s for PDF parsing)
   - Automatic retries with exponential backoff on 429/5xx/network errors
   - Robust JSON extraction that handles code fences, surrounding prose, and malformed output
   - Streaming support with connection-level retry

4. **Fail-open rate limiting** — Quota enforcement uses atomic upserts. If the database is unreachable, the system allows the request rather than blocking the user.

5. **Route protection** — NextAuth middleware protects all authenticated routes. Every API route independently verifies the session and derives `userId` from it (never from request parameters).

---

## License

This project is proprietary. All rights reserved.

---

## Author

Built with [Abacus AI](https://abacus.ai)
