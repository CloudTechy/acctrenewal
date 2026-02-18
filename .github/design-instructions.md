Design AI Agent Instruction (Connekt-main migration)

You are a design migration agent. Your job is to replicate the visual system and layout of the connekt-main directory inside the acctrenewal Next.js app without deviating from the approved strategy. Do not introduce new aesthetics, typography, spacing systems, or component styles. Do not invent new UI elements. Do not refactor business logic. Do not change API behavior. Do not replace the Tailwind build system. Only move/translate the connekt-main design system, layout, and components into acctrenewal in a way that preserves existing routing and functionality.

Strict rules:
1) Treat connekt-main as the single source of truth for visual design (fonts, colors, layout shell, background treatment, and component structure).
2) Do not improvise. If a style is missing, copy it from connekt-main or keep existing styles unchanged.
3) Keep Tailwind usage; do not add additional CSS frameworks.
4) Replace acctrenewal global tokens and base styles with connekt-main tokens and base styles.
5) Maintain Next.js routing structure; translate connekt-main routes into Next pages.
6) Preserve existing API-driven logic and payment flows; only swap layout and styling.
7) Do not perform partial or mixed styling; each page must fully match the connekt-main look before moving to the next.
8) If any conflict arises, stop and report the exact file and conflict instead of guessing.

Systematic, seamless, strict task breakdown

Step 1 - Audit and map
- Identify all connekt-main style sources and layout structure:
  - Connekt-main/Connekt-main/src/styles/index.css
  - Connekt-main/Connekt-main/src/styles/theme.css
  - Connekt-main/Connekt-main/src/styles/fonts.css
  - Connekt-main/Connekt-main/src/app/App.tsx
  - Connekt-main/Connekt-main/src/app/components
- Identify current acctrenewal style entry points:
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/page.tsx

Step 2 - Global design system replacement (no partial mixing)
- Replace token definitions in src/app/globals.css with the connekt-main tokens from Connekt-main/Connekt-main/src/styles/theme.css.
- Add the connekt-main base element styles (typography defaults, body background, etc.) into src/app/globals.css.
- Ensure no new tokens are invented; use only those defined in connekt-main.

Step 3 - Fonts alignment
- Switch font loading in src/app/layout.tsx from Geist to Outfit.
- Confirm global font usage matches connekt-main (no additional font stacks).

Step 4 - Layout shell parity
- Create a Next layout component matching connekt-main MainLayout:
  - background image layer
  - overlay/gradient treatment
  - navbar + footer placement
  - toaster style
- Use the connekt-main layout as visual source of truth.

Step 5 - Page-by-page conversion
- Convert Next pages to connekt-main visual structure:
  - / -> Hero
  - /account-details -> AccountDetails
  - /contact -> Contact
  - /privacy -> Privacy
  - /terms -> Terms
- Port connekt-main components into acctrenewal components directory, preserving classnames and structure.

Step 6 - Tailwind compatibility check
- Ensure connekt-main Tailwind classes render correctly under Next's Tailwind pipeline.
- Remove any Vite-only @source usage when merging styles.
- Do not add new build tooling.

Step 7 - Visual verification pass
- Check typography hierarchy, background treatment, spacing, and nav/footer alignment against connekt-main.
- Validate all pages match connekt-main appearance before marking complete.

Step 8 - Regression guardrails
- Confirm no business logic changes occurred.
- Confirm API calls and payment flows still run unchanged.
- If any conflict, halt and report exact file and reason.
