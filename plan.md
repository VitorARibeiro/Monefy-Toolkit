# Monefy Webviewer — Work Tracker

## Stack Decision
React 18 + Vite + Tailwind CSS v4 + Recharts + PapaParse. Hosted on Vercel.

---

## Phase 0 — Bootstrap
- [x] Create `CLAUDE.md` with project context
- [x] Create `plan.md` (this file)

## Phase 1 — Scaffold
- [x] Vite + React + Tailwind v4 + Recharts + PapaParse installed
- [x] `vite.config.js` with Tailwind plugin and dynamic PORT support
- [x] `src/index.css` with CSS variables for dark/light theme
- [x] `.gitignore`, `index.html`, `src/main.jsx`

## Phase 2 — Data Layer
- [x] `src/lib/parseCSV.js` — PapaParse wrapper, normalises Monefy columns, multi-CSV dedup
- [x] `src/lib/aggregations.js` — rollupByMonth, sumByCategory, savingsRate, filterTransactions
- [x] `src/context/AppContext.jsx` — transactions, filters, theme, categoryColors (all persisted to localStorage)

## Phase 3 — Core Layout
- [x] `src/App.jsx` — tab nav (Dashboard | Transactions | Compound Interest | Budget Rules)
- [x] `src/components/FileUpload.jsx` — drag-and-drop + click, multi-CSV merge, compact header mode

## Phase 4 — Dashboard
- [x] Monthly income vs. expense bar chart
- [x] Category spending donut chart with dynamic colors
- [x] Savings rate trend line by month
- [x] Category breakdown table with % of expenses
- [x] Stat cards: total income, expenses, net, savings rate

## Phase 5 — Transactions View
- [x] Filterable, sortable transaction table
- [x] Filter by category, date range, income/expense type, text search
- [x] "Big purchase" highlight (configurable threshold, default €200)

## Phase 6 — Calculators
- [x] Compound interest calculator (principal, rate, contribution, years, frequency → chart + table)
- [x] Budget rules calculator (50/30/20, car ≤15%, rent ≤30%, emergency fund 3–6×)
  - [x] Auto-detects monthly income from uploaded CSV

## Phase 7 — Polish
- [x] Dark/light mode toggle (localStorage)
- [x] Category colors from deterministic palette (localStorage override planned)
- [x] Mobile-responsive layout (flex-wrap, grid responsive)
- [x] Multi-CSV merge with deduplication

## Phase 7b — UI Redesign (completed)
- [x] Renamed to "Finance Toolkit"
- [x] Dark sidebar (always-dark `#1e1b4b`) + light/dark main content area
- [x] Inter font via Google Fonts
- [x] Lucide React icons in sidebar nav
- [x] All tools accessible without CSV (Compound Interest, Budget Rules work standalone)
- [x] Empty states for Dashboard and Transactions with "Import CSV" CTA
- [x] Category configuration page (Settings) — mark any category as expense/savings/income/ignore
- [x] Savings reclassification flows through all charts and totals
- [x] Category color picker per-category (persisted in localStorage)
- [x] `src/lib/constants.js` for CAT_TYPES (separated from React context for HMR)
- [x] Sidebar: Import CSV + Clear data + Dark mode toggle at bottom
- [x] Mobile: hamburger menu + overlay sidebar
- [x] Progress bar visualization for Budget Rules
- [x] Compound Interest: Final Balance / You Invested / Interest Earned result cards
- [x] Custom scrollbar styling

## Phase 7c — Feedback Round 2 (completed)
- [x] Dark mode as default (new sessions)
- [x] Sankey/money-flow chart (d3-sankey) on Dashboard — income sources left → expenses right
- [x] Dashboard year + month filter dropdowns driving all charts
- [x] Dashboard category sort: by amount or A–Z
- [x] Dashboard "Large Purchases" card — separate prominent section with red header + total
- [x] TransactionTable: sum of filtered results shown in summary row
- [x] TransactionTable: clicking a category row filters to that category + shows total
- [x] TransactionTable: big spend rows flagged with AlertTriangle icon, separate highlighted section above table
- [x] BudgetRules: targets-only view (no progress bars) when no CSV; full comparison when CSV present
- [x] Settings: removed Quick Palette section
- [x] CompoundInterest: PrefixInput component fixes EUR/% symbol overlap (explicit paddingLeft/Right inline)
- [x] max-w-* containers get mx-auto for proper centering (CompoundInterest, BudgetRules, Settings)
- [x] d3-sankey installed

## Phase 8 — Deploy
- [ ] Connect repo to Vercel (vercel.com → Import Project → select this repo)
- [ ] Confirm auto-deploy works on push to main
- [ ] (Optional) Custom domain

---

## Notes / Decisions Log

- Vercel chosen over GitHub Pages for zero-config deploys and preview URLs
- Category colors and theme persisted in localStorage, not server state
- Deduplication key for multi-CSV merge: `date + category + amount + description`
