# Next.js Project

This is a Next.js project built with TypeScript, Tailwind CSS, and shadcn/ui components.

## Features

- **Next.js 14+** with App Router
- **TypeScript** with strict mode enabled
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **RTL Support** for right-to-left languages
- **ESLint** and **Prettier** for code quality
- **Feature-based architecture** with isolated modules
- **Supabase Authentication** with email/password and Google OAuth
- **User Profiles** with name and avatar support

## Getting Started

### Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** The `.env.local` file is already configured with the project's Supabase credentials and is ignored by git.

### Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
/app                    # Next.js App Router pages
/lib                    # Shared utilities and helpers
/features               # Feature modules (isolated)
  /shared              # Shared feature logic (with documentation)
/components            # Global/shared UI components
/hooks                 # Shared React hooks
/services              # Shared services
/public                # Static assets
```

## Code Quality

- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Format Check**: `npm run format:check`

## Adding shadcn/ui Components

To add a new shadcn/ui component:

```bash
npx shadcn-ui@latest add [component-name]
```

## RTL Support

The project includes RTL (Right-to-Left) support for Hebrew, Arabic, and other RTL languages. Use the utilities in `lib/rtl.ts` for direction-aware styling.

## Supabase Setup

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase/migrations/001_create_profiles.sql` to create:
   - The `profiles` table
   - Row Level Security (RLS) policies
   - Triggers for automatic profile creation

### Authentication

The project supports:
- Email/Password authentication
- Google OAuth authentication

To enable Google OAuth:
1. Go to Authentication > Providers in your Supabase dashboard
2. Enable Google provider
3. Add your Google OAuth credentials

### User Profiles

User profiles are automatically created when a user signs up. The profile includes:
- `id` - Linked to `auth.users`
- `full_name` - User's full name
- `avatar_url` - User's avatar image URL

## Development Guidelines

- Each feature MUST be isolated (UI + hooks + services)
- No feature may directly depend on another feature's internals
- Shared logic allowed ONLY in `lib/` or `features/shared/`
- UI components must be pure (no business logic)
- All code MUST be in TypeScript
- Use Tailwind CSS for all styling
- Prefer Server Components when possible
- Settings are stored in localStorage and are NOT affected by authentication

