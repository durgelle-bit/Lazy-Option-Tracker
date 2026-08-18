import React, { useMemo, useState } from 'react'
import { HoldingsSummary } from '../types'
import { formatCurrency, formatDate } from '../utils/calc'
import { Boxes, ChevronDown, ChevronRight, PhoneCall } from 'lucide-react'

interface Props {
  holdings: HoldingsSummary[]
  currency: string
  onSellCoveredCall: (ticker: string, availableShares: number, avgCostBasis: number) => void
}

export default function SecuritiesLedger({ holdings, currency, onSellCoveredCall }: Props) {
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-vault-700 bg-vault-850 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-400">How this works:</strong> When you settle a Cash-Secured Put or Naked Put
        trade as <span className="text-gold-glow">Assigned</span>, this app automatically creates a share lot here at
        the strike price. Use <em>Sell Covered Call</em> to write a call against those shares — the "Available to
        Cover" figure already excludes shares committed to any Covered Call you currently have Open. If that Covered
        Call is later Assigned, the shares are removed from the oldest lot(s) first (FIFO).
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
}: {
  holding: HoldingsSummary
  currency: string
  expanded: boolean
  onToggle: () => void
  onSellCoveredCall: (ticker: string, availableShares: number, avgCostBasis: number) => void
}) {
  const totalCost = holding.heldShares * holding.avgCostBasis
  const canSell = holding.availableToCover >= 100

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
          <div className="flex items-center justify-center">
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
        holding.lots.map((lot) => (
          <tr key={lot.id} className="border-b border-vault-800/60 bg-vault-900/30 text-xs">
            <td className="px-4 py-2" />
            <td className="px-4 py-2 pl-2 text-slate-500">Lot · {formatDate(lot.acquiredDate)}</td>
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
            <td className="px-4 py-2" />
          </tr>
        ))}
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
          Settle a Cash-Secured Put or Naked Put as "Assigned" from the Active Ledger, and the shares will show up
          here automatically.
        </p>
      </div>
    </div>
  )
}
