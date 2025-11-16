<!-- SYNC IMPACT REPORT
Version change: N/A → 1.0.0
Added sections: All principles (technology, dependencies, styling, code_quality, deployment, performance, security, maintainability)
Templates requiring updates: N/A (new constitution)
Follow-up TODOs: None
-->

# Project Constitution

**Version:** 1.0.0  
**Ratification Date:** 2025-11-16  
**Last Amended Date:** 2025-11-16

## Preamble

This constitution establishes the foundational principles that govern our software project. These principles ensure consistency, maintainability, and alignment across all development activities. All contributors must adhere to these principles when making decisions about architecture, implementation, and project evolution.

## Technology

- **Mandatory Technologies**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui components
- **Global Requirements**: Must support RTL layout and direction globally, must be responsive

### Principles
- Each feature MUST be isolated (UI + hooks + services)
- No feature may directly depend on another feature's internals
- Shared logic allowed ONLY in lib/ or features/shared/ (with documentation)
- UI components must be pure (no business logic)

## Dependencies

### Principle
Minimize external libraries.

### Rules
- Do NOT add additional UI libraries besides shadcn/ui
- Any new dependency MUST be justified: purpose, stability, safety
- Avoid overlapping CSS/animation frameworks unless critical

## Styling

### Rules
- Tailwind is the ONLY styling system
- shadcn/ui components must be used for ALL UI elements when possible
- RTL must be supported across all layouts, components, and pages
- Implement accessible markup and ARIA attributes where needed

## Code Quality

- **Mandatory Tools**: ESLint with strict rules, Prettier for formatting
- **Optional Tool**: Husky + lint-staged for commit enforcement

### Rules
- All code MUST be in TypeScript
- Components MUST stay small, clean, and composable
- Side-effects and business logic MUST be inside hooks/services

## Performance

- **Preferences**: Server Components when possible, Static Rendering (SSG) when appropriate

### Rules
- Minimize client-side JavaScript
- Optimize bundle size and avoid unnecessary re-renders


## Maintainability

### Rules
- Project MUST remain clear, modular, and easy to extend
- Recommended: Add basic tests for critical logic
- Recommended: Use Tailwind theme system for unified design

## Governance

### Amendment Procedure
This constitution may be amended through a collaborative review process involving all core maintainers. Changes require explicit consensus before implementation.