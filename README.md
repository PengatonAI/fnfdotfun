# FNF Dot Fun

A Next.js 14 application built with TypeScript, TailwindCSS, shadcn/ui, and NextAuth.js.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript
- ✅ TailwindCSS
- ✅ shadcn/ui components
- ✅ Dark mode support (enabled by default)
- ✅ NextAuth.js authentication with Google and X (Twitter) OAuth
- ✅ Prisma with SQLite database
- ✅ Protected routes with middleware
- ✅ Clean project structure

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

TWITTER_CLIENT_ID="your-twitter-client-id"
TWITTER_CLIENT_SECRET="your-twitter-client-secret"
```

**Important:** Replace the placeholder values with your actual OAuth credentials.

### 3. Set Up Database

Generate Prisma Client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env.local` file

### X (Twitter) OAuth 2.0

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Set callback URL: `http://localhost:3000/api/auth/callback/twitter`
5. Copy the Client ID and Client Secret to your `.env.local` file

## Project Structure

```
├── app/                           # App Router pages
│   ├── api/auth/[...nextauth]/    # NextAuth route handler
│   ├── login/                     # Login page
│   ├── dashboard/                 # Dashboard page (protected)
│   ├── crews/                     # Crews page (protected)
│   ├── leaderboard/               # Leaderboard page (protected)
│   ├── seasons/                   # Seasons page (protected)
│   ├── challenges/                # Challenges page (protected)
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   └── globals.css                # Global styles
├── components/                    # React components
│   ├── ui/                        # shadcn/ui components
│   ├── navbar.tsx                 # Navigation bar with logout
│   ├── session-provider.tsx       # NextAuth session provider
│   └── theme-provider.tsx         # Theme provider for dark mode
├── lib/                           # Utility functions
│   ├── utils.ts                   # Utility functions (cn helper)
│   └── prisma.ts                  # Prisma client instance
├── prisma/                        # Prisma configuration
│   └── schema.prisma              # Database schema
├── types/                         # TypeScript type definitions
│   └── next-auth.d.ts             # NextAuth type extensions
└── middleware.ts                  # Route protection middleware
```

## Available Routes

- `/` - Home page (public)
- `/login` - Login page with OAuth buttons (public)
- `/dashboard` - Dashboard page (protected)
- `/crews` - Crews page (protected)
- `/leaderboard` - Leaderboard page (protected)
- `/seasons` - Seasons page (protected)
- `/challenges` - Challenges page (protected)

## Authentication Flow

1. User visits a protected route
2. Middleware checks for authentication
3. If not authenticated, redirects to `/login` with callback URL
4. User clicks "Sign in with Google" or "Sign in with X"
5. OAuth flow completes and user is created in database
6. User is redirected to the originally requested page (or `/dashboard`)

## Database Schema

The Prisma schema includes:
- `User` - User accounts with name, email, image, and provider
- `Account` - OAuth account connections
- `Session` - User sessions
- `VerificationToken` - Email verification tokens

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
