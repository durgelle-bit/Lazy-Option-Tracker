import React, { useMemo, useState } from 'react'
import { HoldingsSummary, SharePurchase, StockPLEvent } from '../types'
import { formatCurrency, formatDate } from '../utils/calc'
import { Boxes, ChevronDown, ChevronRight, PhoneCall, History, ShoppingCart, Pencil, Trash2 } from 'lucide-react'

interface Props {
  holdings: HoldingsSummary[]
  stockPLEvents: StockPLEvent[]
  currency: string
  onSellCoveredCall: (ticker: string, availableShares: number, avgCostBasis: number) => void
  onBuyShares: (ticker?: string) => void
  onEditPurchase: (p: SharePurchase) => void
  onDeletePurchase: (p: SharePurchase) => void
  sharePurchases: SharePurchase[]
}

export default function SecuritiesLedger({
  holdings,
  stockPLEvents,
  currency,
  onSellCoveredCall,
  onBuyShares,
  onEditPurchase,
  onDeletePurchase,
  sharePurchases,
}: Props) {
  const purchaseById = useMemo(() => new Map(sharePurchases.map((p) => [p.id, p])), [sharePurchases])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(ticker: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(ticker)) next.delete(ticker)
      else next.add(ticker)
      return next
    })
  }

  const totals = useMemo(() => {
    const heldShares = holdings.reduce((sum, h) => sum + h.heldShares, 0)
    const totalCostBasis = holdings.reduce((sum, h) => sum + h.heldShares * h.avgCostBasis, 0)
    const availableToCover = holdings.reduce((sum, h) => sum + h.availableToCover, 0)
    return { heldShares, totalCostBasis, availableToCover }
  }, [holdings])

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Assigned Securities</h2>
          <p className="text-sm text-slate-500">
            {holdings.length} ticker{holdings.length === 1 ? '' : 's'} held ·{' '}
            <span className="text-slate-300">{totals.heldShares.toLocaleString()} shares</span> ·{' '}
            Cost basis <span className="text-slate-300">{formatCurrency(totals.totalCostBasis, currency)}</span>
          </p>
        </div>
        <button onClick={() => onBuyShares()} className="btn-primary shrink-0">
          <ShoppingCart size={16} strokeWidth={2.5} /> Buy Shares
        </button>
      </div>

      {holdings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-vault-700 bg-vault-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-vault-700 bg-vault-850 text-xs uppercase tracking-wider text-slate-500">
                  <th className="w-8 px-4 py-3" />
                  <th className="px-4 py-3 font-semibold">Ticker</th>
                  <th className="px-4 py-3 text-right font-semibold">Held Shares</th>
                  <th className="px-4 py-3 text-right font-semibold">Avg Cost Basis</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Reserved (Open CCs)</th>
                  <th className="px-4 py-3 text-right font-semibold">Available to Cover</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <HoldingGroup
                    key={h.ticker}
                    holding={h}
                    currency={currency}
                    expanded={expanded.has(h.ticker)}
                    onToggle={() => toggle(h.ticker)}
                    onSellCoveredCall={onSellCoveredCall}
                    onBuyShares={onBuyShares}
                    onEditPurchase={onEditPurchase}
                    onDeletePurchase={onDeletePurchase}
                    purchaseById={purchaseById}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RealizedStockPLHistory events={stockPLEvents} currency={currency} />

      <div className="rounded-lg border border-vault-700 bg-vault-850 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-400">How this works:</strong> Shares land here two ways — automatically, when
        you settle a Cash-Secured Put or Naked Put trade as <span className="text-gold-glow">Assigned</span> (a lot
        is created at the strike price), or manually via <em>Buy Shares</em>, which spends your Cash Safe For
        Deployment to add shares directly. Both paths blend into the same average cost basis and count toward the
        100-share covered-call threshold. Use <em>Sell Covered Call</em> once "Available to Cover" hits 100 — that
        figure already excludes shares committed to any Covered Call you currently have Open. If that Covered Call is
        later Assigned, shares are removed from the oldest lot(s) first (FIFO, regardless of source), and the
        resulting stock-level gain or loss is logged below as a Realized Stock P/L event.
      </div>
    </div>
  )
}

function RealizedStockPLHistory({ events, currency }: { events: StockPLEvent[]; currency: string }) {
  const totalPL = useMemo(() => events.reduce((sum, ev) => sum + ev.pl, 0), [events])

  if (events.length === 0) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-vault-700 bg-vault-900/40">
      <div className="flex items-center justify-between border-b border-vault-700 bg-vault-850 px-4 py-3">
        <div className="flex items-center gap-2">
          <History size={14} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">Realized Stock P/L History</h3>
          <span className="rounded-full bg-vault-700 px-2 py-0.5 text-[10px] font-bold leading-none text-slate-300">
            {events.length}
          </span>
        </div>
        <span className={`font-mono text-sm font-bold ${totalPL >= 0 ? 'text-profit-glow' : 'text-loss-glow'}`}>
          {formatCurrency(totalPL, currency)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-vault-700 bg-vault-850/60 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2 font-semibold">Ticker</th>
              <th className="px-4 py-2 text-right font-semibold">Shares</th>
              <th className="px-4 py-2 text-right font-semibold">Cost Basis</th>
              <th className="px-4 py-2 text-right font-semibold">Sale Price</th>
              <th className="px-4 py-2 text-right font-semibold">Date</th>
              <th className="px-4 py-2 text-right font-semibold">Stock P/L</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => (
              <tr key={`${ev.putTradeId}-${ev.callTradeId}-${i}`} className="border-b border-vault-800/60 text-xs">
                <td className="px-4 py-2 font-mono font-bold text-white">{ev.ticker}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-300">{ev.shares.toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">${ev.costBasis.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">${ev.salePrice.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">{formatDate(ev.date)}</td>
                <td className="px-4 py-2 text-right">
                  <span className={`font-mono font-semibold ${ev.pl >= 0 ? 'text-profit-glow' : 'text-loss-glow'}`}>
                    {formatCurrency(ev.pl, currency)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HoldingGroup({
  holding,
  currency,
  expanded,
  onToggle,
  onSellCoveredCall,
  onBuyShares,
  onEditPurchase,
  onDeletePurchase,
  purchaseById,
}: {
  holding: HoldingsSummary
  currency: string
  expanded: boolean
  onToggle: () => void
  onSellCoveredCall: (ticker: string, availableShares: number, avgCostBasis: number) => void
  onBuyShares: (ticker?: string) => void
  onEditPurchase: (p: SharePurchase) => void
  onDeletePurchase: (p: SharePurchase) => void
  purchaseById: Map<string, SharePurchase>
}) {
  const totalCost = holding.heldShares * holding.avgCostBasis
  const canSell = holding.availableToCover >= 100
  const sharesToGo = Math.max(0, 100 - holding.heldShares)

  return (
    <>
      <tr className="border-b border-vault-800 transition hover:bg-vault-850/60">
        <td className="px-4 py-3">
          <button onClick={onToggle} className="btn-icon !h-6 !w-6" title={expanded ? 'Collapse lots' : 'Show lots'}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono font-bold text-white">{holding.ticker}</span>
          {sharesToGo > 0 && (
            <p className="mt-0.5 text-[10px] text-slate-500">{sharesToGo} more to reach 100</p>
          )}
        </td>
        <td className="px-4 py-3 text-right font-mono text-slate-300">{holding.heldShares.toLocaleString()}</td>
        <td className="px-4 py-3 text-right font-mono text-slate-300">${holding.avgCostBasis.toFixed(2)}</td>
        <td className="px-4 py-3 text-right font-mono text-slate-300">{formatCurrency(totalCost, currency)}</td>
        <td className="px-4 py-3 text-right font-mono text-slate-500">
          {holding.reservedByOpenCalls > 0 ? holding.reservedByOpenCalls.toLocaleString() : '—'}
        </td>
        <td className="px-4 py-3 text-right">
          <span className={`font-mono font-semibold ${canSell ? 'text-profit-glow' : 'text-slate-500'}`}>
            {holding.availableToCover.toLocaleString()}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => onBuyShares(holding.ticker)}
              className="btn-icon !border-accent/30 !bg-accent/10 !text-accent"
              title={`Buy more ${holding.ticker} shares with cash`}
            >
              <ShoppingCart size={14} />
            </button>
            <button
              onClick={() => onSellCoveredCall(holding.ticker, holding.availableToCover, holding.avgCostBasis)}
              disabled={!canSell}
              className="btn-icon !border-profit/30 !bg-profit/10 !text-profit-glow disabled:cursor-not-allowed disabled:opacity-30"
              title={canSell ? 'Sell a Covered Call against these shares' : 'Need at least 100 available shares'}
            >
              <PhoneCall size={14} />
            </button>
          </div>
        </td>
      </tr>
      {expanded &&
        holding.lots.map((lot) => {
          const purchase = lot.source === 'Purchase' ? purchaseById.get(lot.sourceTradeId) : undefined
          return (
            <tr key={lot.id} className="border-b border-vault-800/60 bg-vault-900/30 text-xs">
              <td className="px-4 py-2" />
              <td className="px-4 py-2 pl-2 text-slate-500">
                <span
                  className={`mr-1.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                    lot.source === 'Purchase' ? 'bg-accent/10 text-accent' : 'bg-gold/10 text-gold-glow'
                  }`}
                >
                  {lot.source === 'Purchase' ? 'Bought' : 'Assigned'}
                </span>
                {formatDate(lot.acquiredDate)}
              </td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">
                {lot.shares.toLocaleString()}
                {lot.calledAwayShares > 0 && (
                  <span className="ml-1 text-slate-600">/ {lot.originalShares.toLocaleString()}</span>
                )}
              </td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">${lot.costBasis.toFixed(2)}</td>
              <td className="px-4 py-2 text-right font-mono text-slate-500">
                {formatCurrency(lot.shares * lot.costBasis, currency)}
              </td>
              <td className="px-4 py-2 text-right text-slate-600">—</td>
              <td className="px-4 py-2 text-right">
                <span
                  className={`badge ${
                    lot.status === 'Held'
                      ? 'bg-profit/10 text-profit-glow'
                      : lot.status === 'Partially Called'
                      ? 'bg-gold/10 text-gold-glow'
                      : 'bg-vault-700 text-slate-400'
                  }`}
                >
                  {lot.status}
                </span>
              </td>
              <td className="px-4 py-2">
                {purchase && (
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => onEditPurchase(purchase)} className="btn-icon !h-6 !w-6" title="Edit purchase">
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => onDeletePurchase(purchase)}
                      className="btn-icon !h-6 !w-6 !border-loss/30 !bg-loss/10 !text-loss-glow"
                      title="Delete purchase"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          )
        })}
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-vault-700 bg-vault-900/30 py-20 text-center">
      <Boxes size={36} className="text-slate-700" />
      <div>
        <p className="font-semibold text-slate-300">No assigned securities yet.</p>
        <p className="text-sm text-slate-500">
          Settle a Cash-Secured Put or Naked Put as "Assigned" from the Active Ledger, or click <em>Buy Shares</em>{' '}
          above to add a position directly with cash.
        </p>
      </div>
    </div>
  )
}
