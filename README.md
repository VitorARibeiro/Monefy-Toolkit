# 💰 Monefy Toolkit

> A fully private, browser-only finance dashboard for [Monefy](https://monefy.me/) users. Import your CSV exports and get beautiful charts, spending breakdowns, savings tracking, and financial calculators — all without any data leaving your device.

---

## ✨ Features

### 📊 Dashboard
- **Money Flow Sankey** — visual overview of how income flows into spending categories and savings
- **Monthly Overview** — stacked bar chart showing income, expenses, savings, and leftover per month (including negative months shown below the zero line)
- **Spending by Category** — colour-coded breakdown with total and average-per-month toggle
- **Savings Rate** — monthly trend line tracking your savings rate over time
- **Large Purchases** — automatically flags any single transaction above €200
- **Date filters** — filter all charts by year and month

### 🧮 Calculators
- **Compound Interest** — enter a principal, monthly contribution, annual rate, and compounding frequency; get a year-by-year projection table and growth chart. Uses the correct effective monthly rate formula so the compounding frequency never affects how much you invest.
- **Budget Rules** — 50/30/20 (needs/wants/savings), car cost rule (≤ 13%), and housing rule (≤ 30%). All percentages are editable. When you've imported a CSV the bars fill with your actual numbers.

### ⚙️ Settings
- **Category overrides** — re-classify any category as income, expense, savings, or ignore it entirely
- **Category colours** — pick a custom colour for each category (persisted in `localStorage`)
- **Leftover as savings** — toggle whether unspent income counts toward your savings rate (default: on)
- **Dark / light mode** — toggle in the sidebar; preference remembered between sessions

### 📂 CSV Import
- Drag-and-drop or click-to-browse
- Import multiple files at once — duplicates are dropped automatically by composite key
- All data stays in your browser — nothing is uploaded anywhere

---

## 🗂 CSV Format

Monefy exports a semicolon-separated file with the following columns:

```
date ; account ; category ; amount ; currency ; converted amount ; currency ; description
```

- Dates are in `M/D/YYYY` format
- Negative `amount` = expense, positive = income
- Categories are fully dynamic — the app never hardcodes them

---

## 🧪 Try It with Sample Data

Don't have a Monefy export handy? A [`sample-data.csv`](./sample-data.csv) file is included in the repo — 6 months of realistic demo transactions (Jan–Jun 2025) covering all the app's features:

- **Negative months** — January and April have more expenses than income, so the chart shows a downward yellow bar below the zero line
- **Big purchases** — car repair (€480), Paris flight (€380), a Faro weekend (€350), and a spring jacket (€220) all trigger the Large Purchases card
- **Freelance income** — February and May have extra Deposits on top of salary
- **Varied savings rate** — ranges from negative to ~34%, making the trend line interesting

> 💡 **Tip:** After importing, go to **Settings → Categories** and set `Investments` to the **Savings** type. This moves monthly ETF contributions out of expenses and into the savings stack on the chart.

---

## 🚀 Getting Started

### Run locally

```bash
git clone https://github.com/VitorARibeiro/Monefy-Webviewer.git
cd Monefy-Webviewer
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) and import a Monefy CSV export.

### Build for production

```bash
npm run build   # outputs to dist/
```

The `dist/` folder is fully static — host it anywhere (Vercel, GitHub Pages, Netlify).

---

## 🏗 Tech Stack

| Layer | Library |
|---|---|
| UI | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Charts | Recharts + d3-sankey |
| CSV parsing | PapaParse |
| Icons | Lucide React |
| State | React Context |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx          # Main view with all charts
│   ├── FileUpload.jsx         # Drag-and-drop CSV upload
│   ├── SankeyDiagram.jsx      # d3-sankey money flow chart
│   ├── Sidebar.jsx            # Navigation + import + theme toggle
│   ├── TransactionTable.jsx   # Filterable / sortable transaction list
│   ├── Settings.jsx           # Category config + preferences
│   └── calculators/
│       ├── CompoundInterest.jsx
│       └── BudgetRules.jsx
├── context/
│   └── AppContext.jsx         # Global state (transactions, theme, settings)
└── lib/
    ├── parseCSV.js            # PapaParse wrapper + Monefy normalisation
    └── aggregations.js        # rollupByMonth, sumByCategory, savingsRate…
```

---

## 🔒 Privacy

All processing happens client-side in your browser. No analytics, no tracking, no server. Your financial data never leaves your device.

---

## 📄 License

MIT
