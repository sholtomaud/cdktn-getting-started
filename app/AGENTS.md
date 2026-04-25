# AGENTS.md — app/

## Purpose

Vanilla TypeScript web application. No framework. Built with Vite.
Source lives in `app/src/`, tests in `app/tests/`.

## Design system

**Always read `app/DESIGN.md` before making any visual changes.**

The YAML front matter contains normative design tokens (colors, typography,
spacing, component styles). The prose explains how to apply them.

Key rules from the current design (Nebula Dark):
- One gradient canvas on `body` — do not add more gradients
- `<h1>` uses `background-clip: text` with `accent → accent-alt` gradient
- Glass surfaces use `backdrop-filter: blur(16px)` + semi-transparent fill
- Font: Inter (Google Fonts) → Segoe UI → system-ui fallback
- All corners rounded — never 0px on interactive elements
- Entry animation: `fadeUp` (opacity + translateY), one per page load

## File structure

```
app/
├── src/
│   ├── index.html         Entry point
│   ├── styles/main.css    All styles (single file for now)
│   └── ts/main.ts         App TypeScript entry
├── tests/
│   ├── unit/              node:test — pure functions only, no DOM
│   └── e2e/               Playwright — runs against vite preview or BASE_URL
├── DESIGN.md              Normative design tokens
├── playwright.config.ts   BASE_URL env var switches local ↔ deployed
├── vite.config.ts         root: src/, outDir: ../dist/
└── package.json
```

## TypeScript conventions

### Browser guard pattern
Any module-level code that touches the DOM **must** be guarded:

```ts
// ✅ correct — testable in Node
export function formatUptime(seconds: number): string { ... }

// ✅ correct — guarded side-effect
if (typeof document !== "undefined") {
  startUptime();
}

// ❌ wrong — breaks node:test
startUptime();
```

### Exports
Export pure functions that have no DOM dependency so they can be unit-tested
without a browser. Keep DOM manipulation in non-exported functions called
only under the browser guard.

## Testing

### Unit tests (`tests/unit/`)
- Runner: `node:test` (built-in) via `tsx`
- Command: `make app-test`
- Rule: **no DOM, no browser APIs** — pure function testing only
- Import from `../../src/ts/main` — the browser guard makes this safe

### E2E tests (`tests/e2e/`)
- Runner: Playwright (Chromium only for now)
- Command: `make app-e2e` (local vite preview) or `make app-e2e-deployed BASE_URL=...`
- `playwright.config.ts` reads `process.env.BASE_URL` — defaults to `http://localhost:4173`
- When writing new E2E tests, use `id` attributes on elements for stable selectors

## Running locally

```bash
make app-dev      # hot-reload dev server → http://localhost:5173
make app-preview  # serve built dist/   → http://localhost:4173
make app-test     # unit tests
make app-e2e      # Playwright E2E (starts vite preview automatically)
```

## Adding new pages or components

1. Add the HTML file to `app/src/` (Vite picks it up automatically as an MPA entry)
2. Add a corresponding CSS section to `app/src/styles/main.css`
3. Add TypeScript to `app/src/ts/` — one file per page or feature
4. Update `app/DESIGN.md` if introducing new component tokens
5. Add unit tests for any pure functions
6. Add E2E tests for any new pages

## Linting

ESLint with `eslint-plugin-security` and `typescript-eslint`.
Run: `make lint`
Config lives in `app/package.json` → `"lint"` script.
