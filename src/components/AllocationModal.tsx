import React, { useEffect, useState } from 'react'
import { ALLOCATION_CATEGORIES, AllocationCategory, ProfitAllocation } from '../types'
import { uid } from '../utils/calc'
import { X, Save } from 'lucide-react'
import ModalShell from './ModalShell'

interface Props {
  allocation: ProfitAllocation | null
  maxDeployable: number
  currency: string
  onSave: (a: ProfitAllocation) => void
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AllocationModal({ allocation, maxDeployable, currency, onSave, onClose }: Props) {
  const isEdit = !!allocation

  const [date, setDate] = useState(allocation?.date?.slice(0, 10) || todayISO())
  const [amount, setAmount] = useState(allocation ? String(allocation.amount) : '')
  const [category, setCategory] = useState<AllocationCategory>(allocation?.category || 'Withdrawal')
  const [notes, setNotes] = useState(allocation?.notes || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!date) errs.date = 'Required'
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) errs.amount = 'Must be > 0'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const now = new Date().toISOString()
    const record: ProfitAllocation = {
      id: allocation?.id || uid(),
      date: new Date(date).toISOString(),
      amount: parseFloat(amount),
      category,
      notes: notes.trim() || undefined,
      createdAt: allocation?.createdAt || now,
      updatedAt: now,
    }
    onSave(record)
  }

  const amtNum = parseFloat(amount)
  const exceedsBankroll = !isEdit && !isNaN(amtNum) && amtNum > maxDeployable && maxDeployable >= 0

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-vault-700 px-6 py-4">
          <h3 className="text-lg font-bold text-white">{isEdit ? 'Edit Allocation' : 'Record Profit Allocation'}</h3>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="label-field">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {ALLOCATION_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    category === c
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-vault-600 bg-vault-800 text-slate-400 hover:border-vault-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field font-mono" />
              {errors.date && <p className="mt-1 text-xs text-loss-glow">{errors.date}</p>}
            </div>
            <div>
              <label className="label-field">Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input-field font-mono"
              />
              {errors.amount && <p className="mt-1 text-xs text-loss-glow">{errors.amount}</p>}
            </div>
          </div>

          <div>
            <label className="label-field">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Transferred to savings, bought 10 shares of VOO..."
              className="input-field resize-none"
            />
          </div>

          {exceedsBankroll && (
            <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-gold-glow">
              Heads up: this allocation exceeds your current Cash Available for Trade. You can still record it, but
              your bankroll will go negative — worth double-checking before confirming.
            </div>
          )}

          <div className="rounded-lg border border-vault-700 bg-vault-850 px-4 py-3 text-xs text-slate-500">
            <strong className="text-slate-400">Note:</strong> This entry never reduces your Total Realized Profit
            (Scoreboard). It only reduces your Cash Available for Trade — the actual bankroll you have left to
            deploy into new positions.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-vault-700 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            <Save size={16} /> {isEdit ? 'Save Changes' : 'Record Allocation'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
