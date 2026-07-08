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
}

export interface AppData {
  version: number
  trades: Trade[]
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
