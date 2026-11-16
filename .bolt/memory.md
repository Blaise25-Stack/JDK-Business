# Project memory

## Product intent & audience

- Business management app for sales, inventory, and commission tracking.
- Product categories: beverages and creams.
- Currency: Congolese Francs (CDF).
- Audience: business owner/manager operating in the DRC, likely single-tenant or small team.

## Brand personality & voice

- User communicates in French; support responses delivered in French.
- Tone: direct, practical, reassuring when resolving issues.

## Visual design & UX direction

- Stack UI: shadcn/ui + Tailwind CSS + Lucide React icons (per `.bolt/prompt`).
- Core navigation flow: login page → dashboard.
- No detailed visual theme inferred yet; await explicit design requests.

## Decisions, constraints & rationale

- Tech stack: Next.js (App Router) + Supabase (auth + database).
- Auth fix: Supabase authentication was succeeding but no post-login redirect existed; added automatic redirect to dashboard on session establishment and for already-authenticated users.
- Next.js Server/Client component boundary: add `"use client"` whenever a component uses `useState`/`useEffect`.
- Build is validated after fixes.

## Open questions & assumptions

- Exact data model for sales, inventory, and commissions not yet documented.
- Commission calculation rules and rates unknown.
- Whether multiple user roles exist or app is single-user.
- Currency display format for Congolese Francs (e.g., "FC", "CDF") not yet confirmed in UI.
- Password reset/recovery flow not yet implemented (mentioned as potential follow-up).