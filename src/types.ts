export type StrategyType =
  | 'Cash-Secured Put'
  | 'Covered Call'
  | 'Naked Put'
  | 'Naked Call'
  | 'Credit Spread'
  | 'Long Call'
  | 'Long Put'
  | 'Debit Spread'

export type TradeStatus = 'Open' | 'Closed' | 'Expired' | 'Assigned'

export interface Trade {
  id: string
  ticker: string
  strategy: StrategyType
  strike: number
  contracts: number
  premium: number      // opening premium, per share (e.g. 1.25 = $125/contract)
  fees: number          // total opening fees/commissions, in $
  openDate: string      // ISO date string
  expiry: string        // ISO date string
  status: TradeStatus
  closeDate?: string
  closePremium?: number // closing premium, per share
  closeFees?: number    // total closing fees/commissions
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  startingCash: number
  displayCurrency: string
  /** ISO timestamp of the last successful "Export to JSON" action. Undefined if never exported. */
  lastExportedAt?: string
  /** Whether the Reserve Buffer safety-net feature is enabled. Default: true. */
  reserveBufferEnabled: boolean
  /** Percentage (0-50) of Starting Cash held aside as a Reserve Buffer. Default: 20. */
  reserveBufferPercent: number
}

/** Category for a use of realized profits — money leaving the trading bankroll. */
export type AllocationCategory = 'Withdrawal' | 'Stock Purchase'

/**
 * A single entry in the Profit Allocation ('Deployment') Ledger.
 * Represents realized profit that has been withdrawn or redeployed outside
 * the options trading bankroll. This NEVER changes Total Realized Profit
 * (the Scoreboard) — it only affects Cash Available for Trade.
 */
export interface ProfitAllocation {
  id: string
  date: string // ISO date string
  amount: number // always stored positive; represents $ removed from the bankroll
  category: AllocationCategory
  notes?: string
  createdAt: string
  updatedAt: string
}

export const ALLOCATION_CATEGORIES: AllocationCategory[] = ['Withdrawal', 'Stock Purchase']

export interface AppData {
  version: number
  trades: Trade[]
  profitAllocations: ProfitAllocation[]
  settings: AppSettings
}

export const CREDIT_STRATEGIES: StrategyType[] = [
  'Cash-Secured Put',
  'Covered Call',
  'Naked Put',
  'Naked Call',
  'Credit Spread',
]

export const DEBIT_STRATEGIES: StrategyType[] = [
  'Long Call',
  'Long Put',
  'Debit Spread',
]

export const ALL_STRATEGIES: StrategyType[] = [...CREDIT_STRATEGIES, ...DEBIT_STRATEGIES]

export const STATUS_OPTIONS: TradeStatus[] = ['Open', 'Closed', 'Expired', 'Assigned']

export const CLOSE_STATUS_OPTIONS: TradeStatus[] = ['Closed', 'Expired', 'Assigned']

/** Short-put strategies that, if Assigned, obligate you to buy 100 shares/contract at the strike. */
export const SHORT_PUT_STRATEGIES: StrategyType[] = ['Cash-Secured Put', 'Naked Put']

/**
 * A lot of shares acquired via put assignment, and available to be used as collateral
 * for writing Covered Calls. This is a DERIVED/COMPUTED view over `trades` — it is never
 * persisted directly. Each lot traces back to exactly one assignment trade (`sourceTradeId`).
 * When a Covered Call written against that ticker is later Assigned, shares are consumed
 * FIFO (oldest acquisition first) across lots, tracked in `calledAwayInfo`.
 */
export interface SecurityLot {
  id: string // = sourceTradeId (one lot per assignment event)
  ticker: string
  originalShares: number // shares created at assignment (contracts * 100)
  shares: number // shares still held in this lot (originalShares - calledAwayShares)
  calledAwayShares: number
  costBasis: number // per-share cost = strike price at assignment
  acquiredDate: string // ISO date = the assignment trade's closeDate
  sourceTradeId: string
  status: 'Held' | 'Partially Called' | 'Called Away'
  calledAwayInfo: { tradeId: string; shares: number; price: number; date: string }[]
}

/** Per-ticker roll-up of held shares, average cost, and how much is available to cover new Covered Calls. */
export interface HoldingsSummary {
  ticker: string
  heldShares: number
  avgCostBasis: number
  reservedByOpenCalls: number // shares already committed to currently-Open Covered Call trades
  availableToCover: number // heldShares - reservedByOpenCalls (never below 0)
  lots: SecurityLot[]
}
