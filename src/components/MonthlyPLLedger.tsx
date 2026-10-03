import React, { useMemo } from 'react'
import { MonthlyPL } from '../utils/calc'
import { formatCurrency, monthLabel } from '../utils/calc'
import { CalendarDays, TrendingUp, Boxes, DollarSign } from 'lucide-react'

interface Props {
  rows: MonthlyPL[]
  currency: string
}

export default function MonthlyPLLedger({ rows, currency }: Props) {
  const totals = useMemo(() => {
    const optionPL = rows.reduce((s, r) => s + r.optionPL, 0)
    const stockPL = rows.reduce((s, r) => s + r.stockPL, 0)
    const bestMonth = rows.reduce<MonthlyPL | null>(
      (best, r) => (best === null || r.totalPL > best.totalPL ? r : best),
      null
    )
    return { optionPL, stockPL, totalPL: optionPL + stockPL, bestMonth }
  }, [rows])

  const maxAbs = useMemo(() => Math.max(1, ...rows.map((r) => Math.abs(r.totalPL))), [rows])

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Monthly P/L</h2>
          <p className="text-sm text-slate-500">
            Realized profit broken out by calendar month — option premium and stock P/L shown side by side.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryChip
          label="Total Realized (All Months)"
          value={formatCurrency(totals.totalPL, currency)}
          icon={<DollarSign size={16} />}
          positive={totals.totalPL >= 0}
        />
        <SummaryChip
          label="Option Premium P/L"
          value={formatCurrency(totals.optionPL, currency)}
          icon={<TrendingUp size={16} />}
          positive={totals.optionPL >= 0}
        />
        <SummaryChip
          label="Stock P/L"
          value={formatCurrency(totals.stockPL, currency)}
          icon={<Boxes size={16} />}
          positive={totals.stockPL >= 0}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-vault-700 bg-vault-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-vault-700 bg-vault-850 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 text-right font-semibold">Trades Closed</th>
                  <th className="px-4 py-3 text-right font-semibold">Option Premium P/L</th>
                  <th className="px-4 py-3 text-right font-semibold">Stock P/L</th>
                  <th className="px-4 py-3 text-right font-semibold">Total P/L</th>
                  <th className="px-4 py-3 font-semibold">Relative</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isBest = totals.bestMonth?.month === r.month && r.totalPL > 0
                  const barWidth = (Math.abs(r.totalPL) / maxAbs) * 100
                  return (
                    <tr key={r.month} className="border-b border-vault-800 transition hover:bg-vault-850/60">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">{monthLabel(r.month)}</span>
                        {isBest && (
                          <span className="ml-2 rounded-full bg-profit/10 px-2 py-0.5 text-[10px] font-bold text-profit-glow">
                            Best Month
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{r.tradesClosed}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {formatCurrency(r.optionPL, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {r.stockPL !== 0 ? formatCurrency(r.stockPL, currency) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-bold ${r.totalPL >= 0 ? 'text-profit-glow' : 'text-loss-glow'}`}>
                          {formatCurrency(r.totalPL, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-vault-700">
                          <div
                            className={`h-full ${r.totalPL >= 0 ? 'bg-profit' : 'bg-loss'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-vault-700 bg-vault-850 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-400">How this works:</strong> Each settled trade's realized P/L is bucketed by
        its close date (or expiry if never explicitly closed). Each completed wheel-cycle Stock P/L event is bucketed
        by the date its shares were called away. Fully derived from your Settled Ledger and Assigned Securities
        history — nothing extra to maintain here.
      </div>
    </div>
  )
}

function SummaryChip({
  label,
  value,
  icon,
  positive,
}: {
  label: string
  value: string
  icon: React.ReactNode
  positive: boolean
}) {
  return (
    <div className="stat-card !p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${positive ? 'text-profit-glow bg-profit/10' : 'text-loss-glow bg-loss/10'}`}>
          {icon}
        </div>
      </div>
      <p className={`font-mono text-xl font-bold ${positive ? 'text-white' : 'text-loss-glow'}`}>{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-vault-700 bg-vault-900/30 py-20 text-center">
      <CalendarDays size={36} className="text-slate-700" />
      <div>
        <p className="font-semibold text-slate-300">No realized P/L yet.</p>
        <p className="text-sm text-slate-500">
          Settle a trade or complete a wheel cycle (assignment → covered call called away) to see monthly breakdowns here.
        </p>
      </div>
    </div>
  )
}
