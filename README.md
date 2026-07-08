# Option Vault — Options Trade Tracker

## Project Overview
- **Name**: Option Vault
- **Goal**: A professional-grade, single-page options trading tracker with zero network dependency. Every trade is entered manually, every calculation happens client-side, and every byte of data stays on your device.
- **Core Principles**:
  - **Local-First**: No Firebase, no backend database. All data persists in the browser's `localStorage`.
  - **Manual-Only Input**: No live market data, no scraping, no APIs. You are the source of truth.
  - **Data Portability**: Full JSON export/import so you're never locked into one browser or device.

## Features Implemented
### 🏦 Portfolio Vault (Dashboard)
- **Total Cash** — starting cash + all realized cash flows from opened/closed trades.
- **Realized Profit** — cumulative P/L from all settled trades.
- **Global Portfolio Velocity** — a dollar-weighted, annualized return metric computed across *all* settled trades (return ÷ (capital deployed × days held), annualized to 365 days). This tells you how efficiently your capital compounds over time, not just your win rate.
- **Win Rate**, **Open Exposure** (Credit vs. Debit), **Open Strategy Mix**, and a **Realized Equity Curve** chart (Chart.js).

### 📒 Option Ledger (Active Trades)
- Add / Edit / Delete trades: Ticker, Strategy, Strike, Contracts, Premium, Fees, Open Date, Expiry, Notes.
- Supports 8 strategy types: Cash-Secured Put, Covered Call, Naked Put, Naked Call, Credit Spread (credit strategies) and Long Call, Long Put, Debit Spread (debit strategies).
- **Annualized Expected Return** column: for credit strategies, `(max profit / capital at risk) × (365 / days to expiry) × 100`. Debit strategies show `—` since they have no defined max-profit-at-expiry.
- Days-to-expiry indicator with color-coded urgency (red ≤3 days, amber ≤10 days).
- Sortable columns, ticker/strategy filter.
- "Settle" action opens a close-trade modal (see below) which moves the trade to the Archive.

### 🗄️ Settled Ledger (Archive)
- All Closed / Expired / Assigned trades with computed **Realized P/L**, days held, and close details.
- **Undo** button: reverses the settlement math and restores the trade to "Open" status in the Active Ledger — no data loss, no re-entry needed.
- Permanent delete also available for cleaning up bad entries.

### ⚙️ Settings & Portability Suite
- Configure **Starting Cash** and **Display Currency** (USD, SGD, EUR, GBP, AUD, HKD, JPY).
- **Export to JSON** — downloads a timestamped backup file of your entire vault.
- **Import from JSON** — restores a previously exported file (validates structure before loading; replaces current data).
- **Clear All Data** — factory reset with a confirmation guard.

### 🛡️ Resilience
- All `localStorage` reads/writes are wrapped in `try/catch`.
- Imported/loaded JSON is structurally validated before being trusted — corrupted or malformed data silently falls back to safe defaults instead of crashing the app.

## Data Model
```ts
interface Trade {
  id: string
  ticker: string
  strategy: 'Cash-Secured Put' | 'Covered Call' | 'Naked Put' | 'Naked Call'
           | 'Credit Spread' | 'Long Call' | 'Long Put' | 'Debit Spread'
  strike: number
  contracts: number
  premium: number        // opening premium per share
  fees: number            // opening fees, total $
  openDate: string        // ISO date
  expiry: string          // ISO date
  status: 'Open' | 'Closed' | 'Expired' | 'Assigned'
  closeDate?: string
  closePremium?: number
  closeFees?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

interface AppData {
  version: number
  trades: Trade[]
  settings: { startingCash: number; displayCurrency: string }
}
```

## Storage
- **Engine**: Browser `localStorage`, key `option-vault:data:v1`.
- **No servers, no databases, no third-party APIs.** This is intentional — 100% offline-capable after first load (aside from CDN font/icon assets).

## User Guide
1. Open the app — it loads with a starter empty vault ($10,000 starting cash by default).
2. Click **Log Trade** to add a position (choose a credit or debit strategy, enter strike/contracts/premium/fees/dates).
3. Track open positions in the **Option Ledger** — watch Annualized Expected Return and days-to-expiry.
4. When a position resolves, click the ✅ icon to **Settle** it — choose Closed/Expired/Assigned, enter the closing premium/fees, and confirm.
5. Review settled history in the **Settled Archive**. Made a mistake? Hit **Undo** to reopen it.
6. Check the **Portfolio Vault** dashboard anytime for your cash position, realized profit, and portfolio velocity.
7. Go to **Settings** (gear icon) regularly to **Export to JSON** as a backup, or **Import from JSON** to restore/migrate data.

## Deployment
- **Platform**: Cloudflare Pages
- **Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Chart.js + lucide-react icons
- **Status**: Ready to deploy (static SPA — no Workers backend required)
- **Last Updated**: 2026-07-08
