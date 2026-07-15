import React, { useMemo, useState } from 'react'
import { ProfitAllocation } from '../types'
import { formatCurrency, formatDate, totalDeployed } from '../utils/calc'
import { Pencil, Trash2, Plus, Landmark, ArrowUpDown, PiggyBank, ShoppingBag } from 'lucide-react'

interface Props {
  allocations: ProfitAllocation[]
  currency: string
  realizedProfit: number
  cashAvailableForTrade: number
  onAdd: () => void
  onEdit: (a: ProfitAllocation) => void
  onDelete: (a: ProfitAllocation) => void
}

type SortKey = 'date' | 'amount' | 'category'

const categoryStyles: Record<string, string> = {
  Withdrawal: 'bg-gold/10 text-gold-glow',
  'Stock Purchase': 'bg-accent/10 text-accent',
}

const categoryIcon: Record<string, React.ReactNode> = {
  Withdrawal: <PiggyBank size={13} />,
  'Stock Purchase': <ShoppingBag size={13} />,
}

export default function AllocationLedger({
  allocations,
  currency,
  realizedProfit,
  cashAvailableForTrade,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    let list = q
      ? allocations.filter(
          (a) => a.category.toLowerCase().includes(q) || (a.notes || '').toLowerCase().includes(q)
        )
      : allocations
    list = [...list].sort((a, b) => {
      let av: number | string = 0
      let bv: number | string = 0
      switch (sortKey) {
        case 'date':
          av = a.date
          bv = b.date
          break
        case 'amount':
          av = a.amount
          bv = b.amount
          break
        case 'category':
          av = a.category
          bv = b.category
          break
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [allocations, filter, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((s) => !s)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const deployed = useMemo(() => totalDeployed(allocations), [allocations])
  const withdrawn = useMemo(
    () => allocations.filter((a) => a.category === 'Withdrawal').reduce((s, a) => s + a.amount, 0),
    [allocations]
  )
  const invested = useMemo(
    () => allocations.filter((a) => a.category === 'Stock Purchase').reduce((s, a) => s + a.amount, 0),
    [allocations]
  )

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Profit Allocation</h2>
          <p className="text-sm text-slate-500">
            The 'Deployment' Ledger — where realized profits go once they leave the trading bankroll.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by category or notes..."
            className="input-field w-56"
          />
          <button onClick={onAdd} className="btn-primary shrink-0">
            <Plus size={16} strokeWidth={2.5} /> Record Allocation
          </button>
        </div>
      </div>

      {/* Mini summary strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryChip label="Total Deployed" value={formatCurrency(deployed, currency)} icon={<Landmark size={16} />} accent="gold" />
        <SummaryChip label="Withdrawn" value={formatCurrency(withdrawn, currency)} icon={<PiggyBank size={16} />} accent="gold" />
        <SummaryChip label="Stock Purchases" value={formatCurrency(invested, currency)} icon={<ShoppingBag size={16} />} accent="blue" />
      </div>

      <div className="rounded-xl border border-vault-700 bg-vault-850 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-400">Formula:</strong> Cash Safe For Deployment = (Starting Cash{' '}
        <span className="text-slate-400">+</span> Total Realized Profit <span className="font-mono text-profit-glow">{formatCurrency(realizedProfit, currency)}</span>){' '}
        <span className="text-slate-400">−</span> Total Deployed{' '}
        <span className="font-mono text-gold-glow">{formatCurrency(deployed, currency)}</span> ={' '}
        <span className={`font-mono font-bold ${cashAvailableForTrade >= 0 ? 'text-accent' : 'text-loss-glow'}`}>
          {formatCurrency(cashAvailableForTrade, currency)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState onAdd={onAdd} hasEntries={allocations.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-vault-700 bg-vault-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-vault-700 bg-vault-850 text-xs uppercase tracking-wider text-slate-500">
                  <Th label="Date" active={sortKey === 'date'} asc={sortAsc} onClick={() => toggleSort('date')} />
                  <Th label="Category" active={sortKey === 'category'} asc={sortAsc} onClick={() => toggleSort('category')} />
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  <Th label="Amount" active={sortKey === 'amount'} asc={sortAsc} onClick={() => toggleSort('amount')} align="right" />
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-vault-800 transition hover:bg-vault-850/60">
                    <td className="px-4 py-3 font-mono text-slate-300">{formatDate(a.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${categoryStyles[a.category]}`}>
                        {categoryIcon[a.category]}
                        {a.category}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-400">{a.notes || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-loss-glow">
                      -{formatCurrency(a.amount, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onEdit(a)} className="btn-icon" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(a)}
                          className="btn-icon !border-loss/30 !bg-loss/10 !text-loss-glow"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
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

function SummaryChip({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: 'gold' | 'blue'
}) {
  const accentMap = { gold: 'text-gold-glow bg-gold/10', blue: 'text-accent bg-accent/10' }
  return (
    <div className="stat-card !p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentMap[accent]}`}>{icon}</div>
      </div>
      <p className="font-mono text-xl font-bold text-white">{value}</p>
    </div>
  )
}

function EmptyState({ onAdd, hasEntries }: { onAdd: () => void; hasEntries: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-vault-700 bg-vault-900/30 py-20 text-center">
      <Landmark size={36} className="text-slate-700" />
      <div>
        <p className="font-semibold text-slate-300">{hasEntries ? 'No allocations match your filter.' : 'No allocations recorded yet.'}</p>
        <p className="text-sm text-slate-500">
          {hasEntries
            ? 'Try a different search term.'
            : 'Record a withdrawal or stock purchase to track profit deployed outside your trading bankroll.'}
        </p>
      </div>
      {!hasEntries && (
        <button onClick={onAdd} className="btn-primary mt-1">
          <Plus size={16} strokeWidth={2.5} /> Record Your First Allocation
        </button>
      )}
    </div>
  )
}
