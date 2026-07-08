import React, { useMemo, useState } from 'react'
import { Trade } from '../types'
import {
  annualizedExpectedReturn,
  capitalAtRisk,
  daysFromToday,
  formatCurrency,
  formatDate,
  formatPercent,
  isCredit,
} from '../utils/calc'
import { Pencil, Trash2, CheckCircle2, Plus, ListChecks, ArrowUpDown } from 'lucide-react'

interface Props {
  trades: Trade[]
  currency: string
  onAdd: () => void
  onEdit: (t: Trade) => void
  onDelete: (t: Trade) => void
  onClose: (t: Trade) => void
}

type SortKey = 'expiry' | 'ticker' | 'aer' | 'risk'

export default function ActiveLedger({ trades, currency, onAdd, onEdit, onDelete, onClose }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('expiry')
  const [sortAsc, setSortAsc] = useState(true)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase()
    let list = q ? trades.filter((t) => t.ticker.toUpperCase().includes(q) || t.strategy.toUpperCase().includes(q)) : trades
    list = [...list].sort((a, b) => {
      let av: number | string = 0
      let bv: number | string = 0
      switch (sortKey) {
        case 'expiry':
          av = a.expiry
          bv = b.expiry
          break
        case 'ticker':
          av = a.ticker
          bv = b.ticker
          break
        case 'aer':
          av = annualizedExpectedReturn(a) ?? -Infinity
          bv = annualizedExpectedReturn(b) ?? -Infinity
          break
        case 'risk':
          av = capitalAtRisk(a)
          bv = capitalAtRisk(b)
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
      setSortAsc(true)
    }
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Option Ledger</h2>
          <p className="text-sm text-slate-500">{trades.length} open position{trades.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by ticker or strategy..."
            className="input-field w-56"
          />
          <button onClick={onAdd} className="btn-primary shrink-0">
            <Plus size={16} strokeWidth={2.5} /> Log Trade
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState onAdd={onAdd} hasTrades={trades.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-vault-700 bg-vault-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-vault-700 bg-vault-850 text-xs uppercase tracking-wider text-slate-500">
                  <Th label="Ticker" active={sortKey === 'ticker'} asc={sortAsc} onClick={() => toggleSort('ticker')} />
                  <th className="px-4 py-3 font-semibold">Strategy</th>
                  <th className="px-4 py-3 text-right font-semibold">Strike</th>
                  <th className="px-4 py-3 text-right font-semibold">Contracts</th>
                  <th className="px-4 py-3 text-right font-semibold">Premium</th>
                  <th className="px-4 py-3 text-right font-semibold">Fees</th>
                  <Th label="Expiry" active={sortKey === 'expiry'} asc={sortAsc} onClick={() => toggleSort('expiry')} align="right" />
                  <Th label="Capital @ Risk" active={sortKey === 'risk'} asc={sortAsc} onClick={() => toggleSort('risk')} align="right" />
                  <Th label="Ann. Exp. Return" active={sortKey === 'aer'} asc={sortAsc} onClick={() => toggleSort('aer')} align="right" />
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <TradeRow key={t.id} trade={t} currency={currency} onEdit={onEdit} onDelete={onDelete} onClose={onClose} />
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

function TradeRow({
  trade,
  currency,
  onEdit,
  onDelete,
  onClose,
}: {
  trade: Trade
  currency: string
  onEdit: (t: Trade) => void
  onDelete: (t: Trade) => void
  onClose: (t: Trade) => void
}) {
  const aer = annualizedExpectedReturn(trade)
  const dte = daysFromToday(trade.expiry)
  const risk = capitalAtRisk(trade)
  const credit = isCredit(trade.strategy)

  let dteColor = 'text-slate-400'
  if (dte <= 3) dteColor = 'text-loss-glow font-semibold'
  else if (dte <= 10) dteColor = 'text-gold-glow font-semibold'

  return (
    <tr className="border-b border-vault-800 transition hover:bg-vault-850/60">
      <td className="px-4 py-3">
        <span className="font-mono font-bold text-white">{trade.ticker}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${credit ? 'bg-profit/10 text-profit-glow' : 'bg-accent/10 text-accent'}`}>
          {trade.strategy}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-300">${trade.strike.toFixed(2)}</td>
      <td className="px-4 py-3 text-right font-mono text-slate-300">{trade.contracts}</td>
      <td className="px-4 py-3 text-right font-mono text-slate-300">${trade.premium.toFixed(2)}</td>
      <td className="px-4 py-3 text-right font-mono text-slate-500">{formatCurrency(trade.fees, currency)}</td>
      <td className="px-4 py-3 text-right">
        <div className="font-mono text-slate-300">{formatDate(trade.expiry)}</div>
        <div className={`text-xs ${dteColor}`}>{dte}d left</div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-300">{formatCurrency(risk, currency)}</td>
      <td className="px-4 py-3 text-right">
        {aer === null ? (
          <span className="text-slate-600">—</span>
        ) : (
          <span className={`font-mono font-semibold ${aer >= 0 ? 'text-profit-glow' : 'text-loss-glow'}`}>
            {formatPercent(aer)}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => onClose(trade)} className="btn-icon !border-profit/30 !bg-profit/10 !text-profit-glow" title="Settle / Close">
            <CheckCircle2 size={14} />
          </button>
          <button onClick={() => onEdit(trade)} className="btn-icon" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(trade)} className="btn-icon !border-loss/30 !bg-loss/10 !text-loss-glow" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function EmptyState({ onAdd, hasTrades }: { onAdd: () => void; hasTrades: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-vault-700 bg-vault-900/30 py-20 text-center">
      <ListChecks size={36} className="text-slate-700" />
      <div>
        <p className="font-semibold text-slate-300">{hasTrades ? 'No trades match your filter.' : 'Your ledger is empty.'}</p>
        <p className="text-sm text-slate-500">
          {hasTrades ? 'Try a different ticker or strategy search.' : 'Log your first options trade to get started.'}
        </p>
      </div>
      {!hasTrades && (
        <button onClick={onAdd} className="btn-primary mt-1">
          <Plus size={16} strokeWidth={2.5} /> Log Your First Trade
        </button>
      )}
    </div>
  )
}
