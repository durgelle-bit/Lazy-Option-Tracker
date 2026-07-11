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
