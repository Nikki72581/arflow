# CommissionFlow Brand Style Guide (Draft)

This guide reflects the current UI patterns and visual language used across the marketing pages and app UI.

## Brand Summary
- **Positioning:** trustworthy, data-driven, modern, and friendly for SMB finance/sales teams.
- **Personality:** confident, transparent, helpful, and optimistic about automation.
- **Core promise:** clarity and control over commissions with AI‑assisted workflows.

## Logo
- **Wordmark:** “CommissionFlow” with a blue→purple gradient text.
- **Icon mark:** rounded square with a blue→purple→pink gradient and white `DollarSign` icon.
- **Usage:** prefer full wordmark in headers/footers; icon mark for small spaces (nav, app chrome).

## Color System
The UI uses Tailwind + shadcn/ui CSS variables defined in `src/app/globals.css`.

### Base Tokens (OKLCH)
- **Background:** `oklch(1 0 0)`
- **Foreground:** `oklch(0.129 0.042 264.695)`
- **Primary:** `oklch(0.208 0.042 265.755)`
- **Primary Foreground:** `oklch(0.984 0.003 247.858)`
- **Secondary / Muted / Accent:** `oklch(0.968 0.007 247.896)`
- **Muted Foreground:** `oklch(0.554 0.046 257.417)`
- **Border / Input:** `oklch(0.929 0.013 255.508)`
- **Destructive:** `oklch(0.577 0.245 27.325)`

### Brand Gradients (Tailwind)
- **Primary gradient:** `from-blue-600 to-purple-600`
- **Hero gradient:** `from-blue-600 via-purple-600 to-pink-600`
- **Icon mark:** `from-blue-600 via-purple-600 to-pink-600`
- **Soft glow blobs:** `bg-blue-500/20`, `bg-purple-500/20` with `blur-3xl`

### Status & Data Colors
- **Success:** green/emerald (`text-green-600`, `text-emerald-600`)
- **Warning:** amber/yellow (`text-amber-600`, `text-yellow-600`)
- **Error:** red (`text-red-600`)
- **Chart palette:** `--chart-1`..`--chart-5` from `src/app/globals.css`

## Typography
- **Primary font:** Inter (loaded in `src/app/layout.tsx`).
- **Sizing:** bold, large headlines with `tracking-tight`; body uses `text-muted-foreground`.
- **Brand wordmark:** gradient text with `font-bold`.
- **Monospace:** used sparingly for IDs/technical values.

## Layout & Spacing
- **Density:** comfortable with generous whitespace; sections often 80–96px vertical padding.
- **Cards:** `border-2` with subtle gradient backgrounds and hover elevation.
- **Rounding:** base radius `0.625rem` (10px), via shadcn radius tokens.
- **Containers:** centered, max width with `px-4` and responsive grids.

## UI Components & Patterns
- **System:** shadcn/ui (style `new-york`), Tailwind CSS v4, Radix UI.
- **Buttons:** primary CTA is gradient `from-blue-600 to-purple-600`, hover via `opacity-90`.
- **Badges/Pills:** rounded, soft blue border/background (`bg-blue-500/10` + `border-blue-500/20`).
- **Headlines:** emphasize key metrics with gradient text.
- **Section backgrounds:** subtle gradient washes `from-muted/50` or `from-background via-muted/30`.

## Component Standards
These align with the components in `@/components/ui` and usage patterns in the app.

### Buttons
- **Primary CTA:** gradient `from-blue-600 to-purple-600`, `hover:opacity-90`, default `Button`.
- **Secondary:** `variant="outline"` with brand color text for emphasis.
- **Ghost/Text:** use for tertiary actions; keep contrast with `text-muted-foreground`.
- **Sizing:** `size="lg"` for hero CTAs, default size inside app.
- **Icons:** use lucide icons with 16–20px sizing; keep padding balanced.

### Forms
- **Inputs:** shadcn `Input` with `border-input`, `bg-background`, `text-sm`.
- **Labels:** `Label` with normal weight; avoid all-caps.
- **Help text:** `text-xs text-muted-foreground` under fields.
- **Validation:** use `text-destructive` for errors; keep messages concise.
- **Spacing:** 16–24px vertical gaps between fields; group advanced fields with subtle dividers.

### Tables
- **Header row:** `font-medium`, `text-muted-foreground` for labels.
- **Body:** consistent row height (`h-12`), padding `px-4`.
- **Numbers:** right-align currency or totals; use `font-medium` for emphasis.
- **Status cells:** color by state (green/amber/red) and keep copy short.

### Cards
- **Default:** `border-2`, soft gradient background `from-card to-muted/20`.
- **Hover:** elevate with `shadow-lg` and subtle border color shift.
- **Stats cards:** bold numbers, gradient text for top KPIs.

### Badges & Pills
- **Informational:** soft backgrounds with colored text (blue/amber/emerald).
- **Status:** small rounded pills with `text-xs font-medium`.

### Alerts & Callouts
- **Success:** green/emerald with subtle tinted background.
- **Warning:** amber/yellow with high contrast text.
- **Error:** red; keep copy short and action-oriented.

### Modals & Dialogs
- **Structure:** title, short description, form content, CTA row.
- **CTAs:** primary on right, secondary/ghost on left.
- **Spacing:** generous padding and clear section boundaries.

### Navigation
- **Header:** sticky with `bg-background/80` and `backdrop-blur-sm`.
- **Sidebar:** `bg-sidebar` tokens, active item with `bg-gradient-to-r from-accent`.
- **Active states:** use `font-medium` plus subtle gradient or accent fill.

### Charts & Data Viz
- **Palette:** use `--chart-1`..`--chart-5` or blue/purple accents.
- **Labels:** `text-muted-foreground`, `text-xs` or `text-sm`.
- **Highlights:** use bold text + color for top performers or key metrics.

### Empty States
- **Structure:** icon, title, short description, single CTA.
- **Tone:** helpful and optimistic; avoid blame language.

### Toasts & Notifications
- **Toasts:** short, actionable copy; avoid multiline if possible.
- **Icons:** use status colors for quick scanning.

## Motion
- **Ambient motion:** slow `animate-pulse` for background gradient blobs.
- **Hover affordances:** scale and shadow for cards, `transition-all` for borders/shadows.
- **Use sparingly:** motion should signal emphasis, not distract.

## Voice & Messaging
- **Tone:** clear, concise, confident; avoid jargon.
- **Messaging patterns:** “Simple, Transparent”, “AI‑Powered”, “Setup in minutes”.
- **Proof points:** highlight accuracy, time saved, and reliability.

## Do / Don’t
- **Do:** use blue→purple gradients for hero CTAs and brand accents.
- **Do:** keep surfaces clean with muted backgrounds and strong contrast.
- **Do:** emphasize key numbers with bold or gradient text.
- **Don’t:** introduce new saturated colors outside the established palette.
- **Don’t:** use heavy drop shadows or dense UI layouts.

## References
- Primary styles: `src/app/globals.css`
- Marketing hero patterns: `src/app/page.tsx`
- Auth/onboarding styling: `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`, `src/app/onboarding/page.tsx`
- UI system config: `components.json`
