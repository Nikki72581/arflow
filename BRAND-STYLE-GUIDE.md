# ARFlow Brand Style Guide

This guide reflects the current UI patterns and visual language used across the marketing pages and app UI.

## Brand Summary
- **Positioning:** Modern, trustworthy, and transparent for B2B companies managing accounts receivable.
- **Personality:** Professional, clear, efficient, and customer-focused.
- **Core promise:** Give your customers clarity on every invoice with secure self-service access.

## Logo
- **Wordmark:** "ARFlow" with a teal→blue gradient text.
- **Icon mark:** rounded square with a teal→blue→cyan gradient and white `FileText` or `DollarSign` icon.
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
- **Primary gradient:** `from-teal-600 to-blue-600`
- **Hero gradient:** `from-teal-600 via-blue-600 to-cyan-600`
- **Icon mark:** `from-teal-600 via-blue-600 to-cyan-600`
- **Soft glow blobs:** `bg-teal-500/20`, `bg-blue-500/10`, `bg-cyan-500/10` with `blur-3xl`

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
- **Primary CTA:** gradient `from-teal-600 to-blue-600`, `hover:opacity-90`, default `Button`.
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
- **Hover:** elevate with `shadow-xl`, subtle border color shift (`border-primary/50`), and translate up (`hover:-translate-y-1`).
- **Stats cards:** bold numbers, gradient text (`from-teal-600 to-blue-600`) for top KPIs.
- **Feature cards:** use gradient icon containers with `from-teal-600 to-blue-600` and scale on hover (`group-hover:scale-110`).

### Badges & Pills
- **Informational:** soft backgrounds with colored text (teal/blue/amber/emerald).
- **Brand pills:** `bg-teal-500/10 border border-teal-500/20` with teal text.
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
- **Header:** sticky with `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`.
- **Logo:** teal→blue→cyan gradient icon with gradient text wordmark.
- **Sidebar:** `bg-sidebar` tokens, active item with `bg-gradient-to-r from-accent`.
- **Active states:** use `font-medium` plus subtle gradient or accent fill.
- **Hover states:** use `hover:text-teal-600` for navigation links.

### Charts & Data Viz
- **Palette:** use `--chart-1`..`--chart-5` or teal/blue accents.
- **Labels:** `text-muted-foreground`, `text-xs` or `text-sm`.
- **Highlights:** use bold text + teal/blue gradient for top performers or key metrics.

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
- **Tone:** clear, concise, professional; avoid jargon.
- **Messaging patterns:** "24/7 Customer Access", "50% Fewer AR Calls", "Setup in 5 minutes".
- **Value proposition:** Self-service portal, transparency, reduced support burden.
- **Proof points:** highlight time saved, reduced inquiries, and customer satisfaction.

## Do / Don't
- **Do:** use teal→blue gradients for hero CTAs and brand accents.
- **Do:** keep surfaces clean with muted backgrounds and strong contrast.
- **Do:** emphasize key numbers with bold or gradient text.
- **Do:** use soft glow effects (`blur-3xl`) with teal/blue/cyan colors at low opacity.
- **Do:** use hover animations like translate, scale, and shadow transitions.
- **Don't:** introduce new saturated colors outside the teal-blue-cyan palette.
- **Don't:** use heavy drop shadows or dense UI layouts.
- **Don't:** mix the old blue-purple-pink gradients with the new teal-blue-cyan system.

## Key Visual Patterns

### Landing Page
- **Hero section:** Large headlines with teal→blue→cyan gradient text on key phrases
- **Background effects:** Animated pulse gradient blobs in teal and blue with heavy blur
- **Stats bar:** Bold gradient numbers showing "24/7", "50%", "5min" metrics
- **Feature cards:** Border-2 with hover effects including shadow, translate, and border color shift
- **Pricing cards:** Highlighted tier with teal-600 border and gradient badge

### App Dashboard
- **Header:** Sticky with backdrop blur, teal-blue gradient logo and CTA button
- **Organization badge:** Muted background with border, building icon
- **Search bar:** Full-width with keyboard shortcut indicator
- **Cards:** Consistent 2px borders with gradient backgrounds and hover elevation
- **Empty states:** Icon, title, description, single CTA pattern

## References
- Primary styles: `src/app/globals.css`
- Landing page: `src/app/page.tsx`
- Dashboard header: `src/components/navigation/enhanced-header.tsx`
- Dashboard layout: `src/app/dashboard/layout.tsx`
- UI system config: `components.json`
