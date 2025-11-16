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

## Getting Started

### Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

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

## Development Guidelines

- Each feature MUST be isolated (UI + hooks + services)
- No feature may directly depend on another feature's internals
- Shared logic allowed ONLY in `lib/` or `features/shared/`
- UI components must be pure (no business logic)
- All code MUST be in TypeScript
- Use Tailwind CSS for all styling
- Prefer Server Components when possible

