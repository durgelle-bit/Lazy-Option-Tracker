import { CREDIT_STRATEGIES, HoldingsSummary, ProfitAllocation, SecurityLot, SHORT_PUT_STRATEGIES, Trade } from '../types'

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
  /**
   * Brokerage-style cash balance including collateral tied up by open positions,
   * net of everything already withdrawn/deployed out of the account (Total Deployed).
   * This does NOT double-subtract Total Deployed — it is deducted here exactly once.
   */
  totalCash: number
  /** The 'Scoreboard': cumulative gross realized profit since inception. Never reduced by withdrawals/purchases. */
  realizedProfit: number
  /** The 'Deployment' ledger total: sum of all profit allocations (withdrawals + stock purchases). */
  totalDeployed: number
  /** The actual trading bankroll: (Starting Cash + Realized Profit) - Total Deployed. */
  cashAvailableForTrade: number
  openCreditExposure: number
  openDebitExposure: number
  /** Total capital currently tied up as collateral/premium in open positions: openCreditExposure + openDebitExposure. */
  openExposureTotal: number
  /**
   * Unrealized Profit — total net premium collected (credit received, net of opening fees)
   * from currently OPEN credit-strategy positions. This is the profit you'd bank if every
   * open credit position expired worthless today. Debit strategies pay premium rather than
   * collect it, so they don't contribute here. Purely informational until a trade settles.
   */
  unrealizedProfit: number
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
  let unrealizedProfit = 0
  let openPositionsCount = 0
  let closedPositionsCount = 0
  let wins = 0

  let totalCapitalDays = 0
  let totalReturnWeighted = 0

  for (const t of trades) {
    cash += openCashFlow(t)
    if (t.status === 'Open') {
      openPositionsCount++
      if (isCredit(t.strategy)) {
        openCreditExposure += capitalAtRisk(t)
        // Net premium already collected on this open credit position.
        unrealizedProfit += maxPotentialProfit(t)
      } else {
        openDebitExposure += capitalAtRisk(t)
      }
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
    // Cash physically in the account = gross trading cash flows minus whatever has
    // already been withdrawn or spent (Total Deployed). Money that's been deployed
    // out of the account is not sitting in cash anymore, so it must not be counted twice.
    totalCash: cash - deployed,
    realizedProfit,
    totalDeployed: deployed,
    cashAvailableForTrade: bankroll,
    openCreditExposure,
    openDebitExposure,
    openExposureTotal: openCreditExposure + openDebitExposure,
    unrealizedProfit,
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
 * Cash Safe For Deployment — the Bankroll with the Reserve Buffer and all
 * capital currently tied up in open positions already carved out. This is
 * the headline figure shown on the dashboard: the money you can actually
 * put into a brand-new position right now, without dipping into your
 * safety net or double-counting collateral that's already at work.
 * Formula: Cash Available For Trade (the Bankroll) − Reserve Buffer (when enabled) − Open Exposure.
 */
export function cashSafeForDeployment(
  bankroll: number,
  reserveBufferAmount: number,
  reserveBufferEnabled: boolean,
  openExposureTotal: number
): number {
  const afterReserve = reserveBufferEnabled ? bankroll - reserveBufferAmount : bankroll
  return afterReserve - openExposureTotal
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

/** True if a strategy is a short put whose assignment obligates buying 100 shares/contract at strike. */
export const isShortPut = (strategy: Trade['strategy']) =>
  (SHORT_PUT_STRATEGIES as string[]).includes(strategy)

/**
 * Derives all Security Lots from the trade ledger. A lot is created for every short-put
 * trade Assigned (shares bought at strike), and consumed FIFO (oldest lot first) whenever
 * a Covered Call written on that ticker is itself Assigned (shares called away).
 *
 * This is a pure, fully-derived computation over `trades` — nothing about holdings is
 * ever separately persisted, so Undo/Delete/Edit on the underlying trades automatically
 * and correctly reverses share creation/consumption with zero extra sync logic.
 */
export function deriveSecurityLots(trades: Trade[]): SecurityLot[] {
  // 1. Create one lot per Assigned short-put trade, ordered by acquisition date (FIFO).
  const lots: SecurityLot[] = trades
    .filter((t) => t.status === 'Assigned' && isShortPut(t.strategy))
    .map((t) => {
      const originalShares = t.contracts * 100
      return {
        id: t.id,
        ticker: t.ticker,
        originalShares,
        shares: originalShares,
        calledAwayShares: 0,
        costBasis: t.strike,
        acquiredDate: t.closeDate || t.updatedAt,
        sourceTradeId: t.id,
        status: 'Held' as const,
        calledAwayInfo: [] as SecurityLot['calledAwayInfo'],
      }
    })
    .sort((a, b) => new Date(a.acquiredDate).getTime() - new Date(b.acquiredDate).getTime())

  // 2. Walk Assigned Covered Calls chronologically, consuming FIFO lots on the same ticker.
  const calledAwayCalls = trades
    .filter((t) => t.status === 'Assigned' && t.strategy === 'Covered Call')
    .sort((a, b) => new Date(a.closeDate || a.updatedAt).getTime() - new Date(b.closeDate || b.updatedAt).getTime())

  for (const call of calledAwayCalls) {
    let sharesToCall = call.contracts * 100
    const date = call.closeDate || call.updatedAt
    const tickerLots = lots.filter((l) => l.ticker === call.ticker && l.shares > 0)
    for (const lot of tickerLots) {
      if (sharesToCall <= 0) break
      const take = Math.min(lot.shares, sharesToCall)
      if (take <= 0) continue
      lot.shares -= take
      lot.calledAwayShares += take
      lot.calledAwayInfo.push({ tradeId: call.id, shares: take, price: call.strike, date })
      lot.status = lot.shares <= 0 ? 'Called Away' : 'Partially Called'
      sharesToCall -= take
    }
  }

  return lots
}

/** Rolls up Security Lots into a per-ticker holdings summary, netting out shares reserved by currently-Open Covered Calls. */
export function deriveHoldingsSummary(trades: Trade[]): HoldingsSummary[] {
  const lots = deriveSecurityLots(trades)
  const byTicker = new Map<string, SecurityLot[]>()
  for (const lot of lots) {
    if (!byTicker.has(lot.ticker)) byTicker.set(lot.ticker, [])
    byTicker.get(lot.ticker)!.push(lot)
  }

  const openCallsByTicker = new Map<string, number>()
  for (const t of trades) {
    if (t.status === 'Open' && t.strategy === 'Covered Call') {
      openCallsByTicker.set(t.ticker, (openCallsByTicker.get(t.ticker) || 0) + t.contracts * 100)
    }
  }

  const summaries: HoldingsSummary[] = []
  for (const [ticker, tickerLots] of byTicker.entries()) {
    const heldShares = tickerLots.reduce((sum, l) => sum + l.shares, 0)
    if (heldShares <= 0 && !tickerLots.some((l) => l.shares > 0)) {
      // Ticker fully called away — skip unless caller wants full history (kept out of summary view)
      if (heldShares <= 0) continue
    }
    const totalCostOfHeldShares = tickerLots.reduce((sum, l) => sum + l.shares * l.costBasis, 0)
    const avgCostBasis = heldShares > 0 ? totalCostOfHeldShares / heldShares : 0
    const reservedByOpenCalls = openCallsByTicker.get(ticker) || 0
    summaries.push({
      ticker,
      heldShares,
      avgCostBasis,
      reservedByOpenCalls,
      availableToCover: Math.max(0, heldShares - reservedByOpenCalls),
      lots: tickerLots,
    })
  }

  return summaries.sort((a, b) => a.ticker.localeCompare(b.ticker))
}
