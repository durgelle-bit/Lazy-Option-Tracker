import { CREDIT_STRATEGIES, ProfitAllocation, Trade } from '../types'

export const isCredit = (strategy: Trade['strategy']) =>
  (CREDIT_STRATEGIES as string[]).includes(strategy)

/** Days between two ISO date strings, minimum 1. */
export function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 1)
}

export function daysFromToday(dateISO: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return daysBetween(today.toISOString(), dateISO)
}

/** Net cash flow generated at trade OPEN. Positive = cash in, negative = cash out. */
export function openCashFlow(t: Trade): number {
  const gross = t.premium * t.contracts * 100
  if (isCredit(t.strategy)) {
    return gross - t.fees
  }
  return -(gross + t.fees)
}

/** Net cash flow generated at trade CLOSE. Only meaningful if trade is not Open. */
export function closeCashFlow(t: Trade): number {
  if (t.status === 'Open') return 0
  const closePremium = t.closePremium ?? 0
  const closeFees = t.closeFees ?? 0
  const gross = closePremium * t.contracts * 100
  if (isCredit(t.strategy)) {
    // Buying back a short option costs cash (or 0 if expired worthless)
    return -(gross + closeFees)
  }
  // Selling / exercising a long option returns cash
  return gross - closeFees
}

/** Realized P/L for a trade. Zero for still-open trades. */
export function realizedPL(t: Trade): number {
  if (t.status === 'Open') return 0
  const closePremium = t.closePremium ?? 0
  const closeFees = t.closeFees ?? 0
  if (isCredit(t.strategy)) {
    return (t.premium - closePremium) * t.contracts * 100 - t.fees - closeFees
  }
  return (closePremium - t.premium) * t.contracts * 100 - t.fees - closeFees
}

/** Capital at risk / capital deployed for a trade (used for ROI & velocity calcs). */
export function capitalAtRisk(t: Trade): number {
  if (isCredit(t.strategy)) {
    return t.strike * t.contracts * 100
  }
  return t.premium * t.contracts * 100 + t.fees
}

/** Max potential profit if a credit trade plays out perfectly (expires worthless). */
export function maxPotentialProfit(t: Trade): number {
  if (isCredit(t.strategy)) {
    return t.premium * t.contracts * 100 - t.fees
  }
  return NaN // undefined / unlimited for long premium strategies
}

/**
 * Annualized Expected Return for an OPEN position.
 * Only meaningful for credit strategies (defined max-profit-at-expiry).
 * Returns null for debit strategies (no defined profit target).
 */
export function annualizedExpectedReturn(t: Trade): number | null {
  if (!isCredit(t.strategy)) return null
  const risk = capitalAtRisk(t)
  if (risk <= 0) return null
  const profit = maxPotentialProfit(t)
  const days = daysBetween(t.openDate, t.expiry)
  const roi = profit / risk
  return roi * (365 / days) * 100
}

export interface PortfolioTotals {
  /** Gross brokerage-style cash balance including collateral tied up by open positions. */
  totalCash: number
  /** The 'Scoreboard': cumulative gross realized profit since inception. Never reduced by withdrawals/purchases. */
  realizedProfit: number
  /** The 'Deployment' ledger total: sum of all profit allocations (withdrawals + stock purchases). */
  totalDeployed: number
  /** The actual trading bankroll: (Starting Cash + Realized Profit) - Total Deployed. */
  cashAvailableForTrade: number
  openCreditExposure: number
  openDebitExposure: number
  openPositionsCount: number
  closedPositionsCount: number
  winRate: number
  globalVelocity: number
}

export function computeTotals(
  trades: Trade[],
  startingCash: number,
  allocations: ProfitAllocation[] = []
): PortfolioTotals {
  let cash = startingCash
  let realizedProfit = 0
  let openCreditExposure = 0
  let openDebitExposure = 0
  let openPositionsCount = 0
  let closedPositionsCount = 0
  let wins = 0

  let totalCapitalDays = 0
  let totalReturnWeighted = 0

  for (const t of trades) {
    cash += openCashFlow(t)
    if (t.status === 'Open') {
      openPositionsCount++
      if (isCredit(t.strategy)) openCreditExposure += capitalAtRisk(t)
      else openDebitExposure += capitalAtRisk(t)
    } else {
      cash += closeCashFlow(t)
      const pl = realizedPL(t)
      realizedProfit += pl
      closedPositionsCount++
      if (pl > 0) wins++

      const risk = capitalAtRisk(t)
      const days = daysBetween(t.openDate, t.closeDate || t.expiry)
      if (risk > 0) {
        totalCapitalDays += risk * days
        totalReturnWeighted += pl
      }
    }
  }

  const winRate = closedPositionsCount > 0 ? (wins / closedPositionsCount) * 100 : 0
  // Dollar-weighted annualized velocity: return per capital-day, annualized to 365 days.
  const globalVelocity =
    totalCapitalDays > 0 ? (totalReturnWeighted / totalCapitalDays) * 365 * 100 : 0

  const deployed = totalDeployed(allocations)
  const bankroll = cashAvailableForTrade(startingCash, realizedProfit, deployed)

  return {
    totalCash: cash,
    realizedProfit,
    totalDeployed: deployed,
    cashAvailableForTrade: bankroll,
    openCreditExposure,
    openDebitExposure,
    openPositionsCount,
    closedPositionsCount,
    winRate,
    globalVelocity,
  }
}

/**
 * The 'Deployment' Ledger total — sum of every profit allocation entry
 * (withdrawals + stock purchases). This money has left the trading bankroll
 * but Total Realized Profit (the Scoreboard) is NEVER reduced by it.
 */
export function totalDeployed(allocations: ProfitAllocation[]): number {
  return allocations.reduce((sum, a) => sum + (isFinite(a.amount) ? a.amount : 0), 0)
}

/**
 * Cash Available for Trade — the actual trading bankroll you have left to deploy.
 * Formula: (Initial Starting Cash + Total Realized Profit) - Total Deployed
 * This is intentionally distinct from Total Realized Profit, which is a
 * cumulative, never-decreasing scoreboard of gross trading performance.
 */
export function cashAvailableForTrade(startingCash: number, realizedProfit: number, deployed: number): number {
  return startingCash + realizedProfit - deployed
}

/**
 * Reserve Buffer — a slice of Starting Cash held aside as a safety net.
 * Formula: Starting Cash × Reserve Buffer Percentage.
 * This is purely informational/display math and never feeds back into the
 * two-bucket accounting model (Scoreboard / Deployment / Bankroll).
 */
export function reserveBuffer(startingCash: number, reserveBufferPercent: number): number {
  return startingCash * (reserveBufferPercent / 100)
}

/**
 * Cash Safe For Deployment — the Bankroll with the Reserve Buffer already
 * carved out. This is the headline figure shown on the dashboard: the money
 * you can actually put into a new position without dipping into your safety net.
 * Formula: Cash Available For Trade (the Bankroll) − Reserve Buffer (when enabled).
 * When the Reserve Buffer is disabled, this simply equals the Bankroll.
 */
export function cashSafeForDeployment(
  bankroll: number,
  reserveBufferAmount: number,
  reserveBufferEnabled: boolean
): number {
  return reserveBufferEnabled ? bankroll - reserveBufferAmount : bankroll
}

export function formatCurrency(n: number, currency = 'USD'): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  try {
    return (
      sign +
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(abs)
    )
  } catch {
    return sign + '$' + abs.toFixed(2)
  }
}

export function formatPercent(n: number, digits = 1): string {
  if (!isFinite(n)) return '—'
  return `${n >= 0 ? '' : ''}${n.toFixed(digits)}%`
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function uid(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}
