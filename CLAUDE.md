# Monefy Webviewer — Claude Context

## What This Is

A fully static web app that parses Monefy CSV exports client-side and provides financial visualization and calculators. No backend, no server — all data stays in the browser. Hosted on Vercel.

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS v4 (plugin-based, no tailwind.config.js)
- **Charts:** Recharts
- **CSV parsing:** PapaParse
- **State:** React Context (AppContext in `src/context/AppContext.jsx`)
- **Hosting:** Vercel (auto-deploys on push to `main`)

## CSV Format (Monefy export)

Columns: `date | account | category | amount | currency | converted amount | currency | description`

- Dates: `M/D/YYYY` format
- `amount` negative = expense, positive = income
- Categories are user-defined and fully dynamic — never hardcode them

## File Structure

```
src/
  components/
    FileUpload.jsx         # drag-and-drop + click CSV upload
    Dashboard.jsx          # charts: monthly bar, category donut, savings line
    TransactionTable.jsx   # filterable/sortable transaction list
    calculators/
      CompoundInterest.jsx # principal, rate, contribution → chart + table
      BudgetRules.jsx      # 50/30/20 + car/housing rules, editable %
  context/
    AppContext.jsx          # global state: transactions, filters, theme, categoryColors
  lib/
    parseCSV.js            # PapaParse wrapper, normalises Monefy columns
    aggregations.js        # groupByMonth, sumByCategory, savingsRate helpers
  App.jsx                  # tab navigation: Dashboard | Transactions | Calculators
  main.jsx
index.html
```

## Key Conventions

- All monetary values stored as JS numbers (floats), in the original currency
- Income = positive amount, Expense = negative amount (matches Monefy raw values)
- Category colors stored in `localStorage` under key `monefy-category-colors`
- Dark mode preference stored in `localStorage` under key `monefy-theme`
- Multi-CSV upload: new transactions are merged, duplicates dropped by composite key `date+category+amount+description`

## Running Locally

```bash
npm install
npm run dev
```

## Building

```bash
npm run build   # outputs to dist/
```

Vercel picks this up automatically.

## Current Status

See `plan.md` for the living task tracker.
