import React, { useMemo, useState } from 'react'
import { Trade } from '../types'
import { formatCurrency, formatDate, isCredit, realizedPL, capitalAtRisk, daysBetween } from '../utils/calc'
import { RotateCcw, Trash2, Archive, ArrowUpDown } from 'lucide-react'

interface Props {
  trades: Trade[]
  currency: string
  onUndo: (t: Trade) => void
  onDelete: (t: Trade) => void
}

type SortKey = 'closeDate' | 'ticker' | 'pl'

const statusStyles: Record<string, string> = {
  Closed: 'bg-accent/10 text-accent',
  Expired: 'bg-slate-500/10 text-slate-400',
  Assigned: 'bg-gold/10 text-gold-glow',
}

export default function SettledLedger({ trades, currency, onUndo, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('closeDate')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase()
    let list = q ? trades.filter((t) => t.ticker.toUpperCase().includes(q) || t.strategy.toUpperCase().includes(q)) : trades
    list = [...list].sort((a, b) => {
      let av: number | string = 0
      let bv: number | string = 0
      switch (sortKey) {
        case 'closeDate':
          av = a.closeDate || ''
          bv = b.closeDate || ''
          break
        case 'ticker':
          av = a.ticker
          bv = b.ticker
          break
        case 'pl':
          av = realizedPL(a)
          bv = realizedPL(b)
          break
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [trades, filter, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((s) => !s)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const totalPL = useMemo(() => trades.reduce((sum, t) => sum + realizedPL(t), 0), [trades])

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Settled Ledger (Archive)</h2>
          <p className="text-sm text-slate-500">
            {trades.length} settled trade{trades.length === 1 ? '' : 's'} · Net{' '}
            <span className={totalPL >= 0 ? 'text-profit-glow' : 'text-loss-glow'}>{formatCurrency(totalPL, currency)}</span>
          </p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by ticker or strategy..."
          className="input-field w-56"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasTrades={trades.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-vault-700 bg-vault-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead>
                <tr className="border-b border-vault-700 bg-vault-850 text-xs uppercase tracking-wider text-slate-500">
                  <Th label="Ticker" active={sortKey === 'ticker'} asc={sortAsc} onClick={() => toggleSort('ticker')} />
                  <th className="px-4 py-3 font-semibold">Strategy</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Open Premium</th>
                  <th className="px-4 py-3 text-right font-semibold">Close Premium</th>
                  <th className="px-4 py-3 text-right font-semibold">Days Held</th>
                  <Th label="Close Date" active={sortKey === 'closeDate'} asc={sortAsc} onClick={() => toggleSort('closeDate')} align="right" />
                  <Th label="Realized P/L" active={sortKey === 'pl'} asc={sortAsc} onClick={() => toggleSort('pl')} align="right" />
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <SettledRow key={t.id} trade={t} currency={currency} onUndo={onUndo} onDelete={onDelete} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({
  label,
  active,
  asc,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  asc: boolean
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 font-semibold transition hover:text-slate-300 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={onClick}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <ArrowUpDown size={11} className={active ? 'text-accent' : 'text-slate-600'} />
      </span>
    </th>
  )
}

function SettledRow({
  trade,
  currency,
  onUndo,
  onDelete,
}: {
  trade: Trade
  currency: string
  onUndo: (t: Trade) => void
  onDelete: (t: Trade) => void
}) {
  const pl = realizedPL(trade)
  const credit = isCredit(trade.strategy)
  const days = daysBetween(trade.openDate, trade.closeDate || trade.expiry)

  return (
    <tr className="border-b border-vault-800 transition hover:bg-vault-850/60">
      <td className="px-4 py-3">
        <span className="font-mono font-bold text-white">{trade.ticker}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${credit ? 'bg-profit/10 text-profit-glow' : 'bg-accent/10 text-accent'}`}>{trade.strategy}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${statusStyles[trade.status] || 'bg-vault-700 text-slate-300'}`}>{trade.status}</span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-300">${trade.premium.toFixed(2)}</td>
      <td className="px-4 py-3 text-right font-mono text-slate-300">
        {trade.closePremium !== undefined ? `$${trade.closePremium.toFixed(2)}` : '—'}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-400">{days}d</td>
      <td className="px-4 py-3 text-right font-mono text-slate-300">{formatDate(trade.closeDate || '')}</td>
      <td className="px-4 py-3 text-right">
        <span className={`font-mono font-bold ${pl >= 0 ? 'text-profit-glow' : 'text-loss-glow'}`}>{formatCurrency(pl, currency)}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => onUndo(trade)} className="btn-icon !border-accent/30 !bg-accent/10 !text-accent" title="Undo & Reopen">
            <RotateCcw size={14} />
          </button>
          <button onClick={() => onDelete(trade)} className="btn-icon !border-loss/30 !bg-loss/10 !text-loss-glow" title="Delete permanently">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function EmptyState({ hasTrades }: { hasTrades: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-vault-700 bg-vault-900/30 py-20 text-center">
      <Archive size={36} className="text-slate-700" />
      <div>
        <p className="font-semibold text-slate-300">{hasTrades ? 'No settled trades match your filter.' : 'Nothing settled yet.'}</p>
        <p className="text-sm text-slate-500">
          {hasTrades ? 'Try a different ticker or strategy search.' : 'Close a position from the Active Ledger to see it here.'}
        </p>
      </div>
    </div>
  )
}
