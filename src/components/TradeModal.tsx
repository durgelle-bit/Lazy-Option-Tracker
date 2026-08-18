import React, { useEffect, useState } from 'react'
import { ALL_STRATEGIES, StrategyType, Trade } from '../types'
import { uid } from '../utils/calc'
import { X, Save } from 'lucide-react'
import ModalShell from './ModalShell'

interface Prefill {
  ticker: string
  strategy: StrategyType
  strike?: number
  notes?: string
}

interface Props {
  trade: Trade | null
  prefill?: Prefill
  onSave: (t: Trade) => void
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const defaultExpiryISO = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

export default function TradeModal({ trade, prefill, onSave, onClose }: Props) {
  const isEdit = !!trade

  const [ticker, setTicker] = useState(trade?.ticker || prefill?.ticker || '')
  const [strategy, setStrategy] = useState<StrategyType>(trade?.strategy || prefill?.strategy || 'Cash-Secured Put')
  const [strike, setStrike] = useState(trade ? String(trade.strike) : prefill?.strike !== undefined ? String(prefill.strike) : '')
  const [contracts, setContracts] = useState(trade ? String(trade.contracts) : '1')
  const [premium, setPremium] = useState(trade ? String(trade.premium) : '')
  const [fees, setFees] = useState(trade ? String(trade.fees) : '0')
  const [openDate, setOpenDate] = useState(trade?.openDate?.slice(0, 10) || todayISO())
  const [expiry, setExpiry] = useState(trade?.expiry?.slice(0, 10) || defaultExpiryISO())
  const [notes, setNotes] = useState(trade?.notes || prefill?.notes || '')
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
    if (!ticker.trim()) errs.ticker = 'Required'
    const strikeN = parseFloat(strike)
    if (isNaN(strikeN) || strikeN <= 0) errs.strike = 'Must be > 0'
    const contractsN = parseInt(contracts, 10)
    if (isNaN(contractsN) || contractsN <= 0) errs.contracts = 'Must be > 0'
    const premiumN = parseFloat(premium)
    if (isNaN(premiumN) || premiumN < 0) errs.premium = 'Must be ≥ 0'
    const feesN = parseFloat(fees || '0')
    if (isNaN(feesN) || feesN < 0) errs.fees = 'Must be ≥ 0'
    if (!openDate) errs.openDate = 'Required'
    if (!expiry) errs.expiry = 'Required'
    if (openDate && expiry && new Date(expiry) < new Date(openDate)) {
      errs.expiry = 'Must be after open date'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const now = new Date().toISOString()
    const newTrade: Trade = {
      id: trade?.id || uid(),
      ticker: ticker.trim().toUpperCase(),
      strategy,
      strike: parseFloat(strike),
      contracts: parseInt(contracts, 10),
      premium: parseFloat(premium),
      fees: parseFloat(fees || '0'),
      openDate: new Date(openDate).toISOString(),
      expiry: new Date(expiry).toISOString(),
      status: trade?.status || 'Open',
      closeDate: trade?.closeDate,
      closePremium: trade?.closePremium,
      closeFees: trade?.closeFees,
      notes: notes.trim() || undefined,
      createdAt: trade?.createdAt || now,
      updatedAt: now,
    }
    onSave(newTrade)
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-vault-700 px-6 py-4">
          <h3 className="text-lg font-bold text-white">{isEdit ? 'Edit Trade' : 'Log New Trade'}</h3>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Ticker</label>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="input-field font-mono"
                maxLength={10}
              />
              {errors.ticker && <p className="mt-1 text-xs text-loss-glow">{errors.ticker}</p>}
            </div>
            <div>
              <label className="label-field">Strategy Type</label>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyType)} className="select-field">
                {ALL_STRATEGIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">Strike ($)</label>
              <input
                type="number"
                step="0.5"
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
                placeholder="150.00"
                className="input-field font-mono"
              />
              {errors.strike && <p className="mt-1 text-xs text-loss-glow">{errors.strike}</p>}
            </div>
            <div>
              <label className="label-field">Contracts</label>
              <input
                type="number"
                step="1"
                value={contracts}
                onChange={(e) => setContracts(e.target.value)}
                placeholder="1"
                className="input-field font-mono"
              />
              {errors.contracts && <p className="mt-1 text-xs text-loss-glow">{errors.contracts}</p>}
            </div>
            <div>
              <label className="label-field">Premium (per share)</label>
              <input
                type="number"
                step="0.01"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                placeholder="1.25"
                className="input-field font-mono"
              />
              {errors.premium && <p className="mt-1 text-xs text-loss-glow">{errors.premium}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">Fees / Commissions ($)</label>
              <input
                type="number"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0.65"
                className="input-field font-mono"
              />
              {errors.fees && <p className="mt-1 text-xs text-loss-glow">{errors.fees}</p>}
            </div>
            <div>
              <label className="label-field">Open Date</label>
              <input
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                className="input-field font-mono"
              />
              {errors.openDate && <p className="mt-1 text-xs text-loss-glow">{errors.openDate}</p>}
            </div>
            <div>
              <label className="label-field">Expiry Date</label>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="input-field font-mono"
              />
              {errors.expiry && <p className="mt-1 text-xs text-loss-glow">{errors.expiry}</p>}
            </div>
          </div>

          <div>
            <label className="label-field">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Thesis, exit plan, adjustments..."
              className="input-field resize-none"
            />
          </div>

          {prefill && strategy === 'Covered Call' ? (
            <div className="rounded-lg border border-profit/30 bg-profit/5 px-4 py-3 text-xs text-slate-400">
              <strong className="text-profit-glow">Covered against held shares:</strong> This trade is pre-filled
              from your Assigned Securities holding in {prefill.ticker}. Set the Strike and Contracts to match the
              shares you want to cover (100 shares per contract).
            </div>
          ) : (
            <div className="rounded-lg border border-vault-700 bg-vault-850 px-4 py-3 text-xs text-slate-500">
              <strong className="text-slate-400">Tip:</strong> Credit strategies (Cash-Secured Put, Covered Call, Naked
              Put/Call, Credit Spread) collect premium up front. Debit strategies (Long Call/Put, Debit Spread) pay
              premium up front. This determines how cash flow and Annualized Expected Return are calculated.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-vault-700 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            <Save size={16} /> {isEdit ? 'Save Changes' : 'Add to Ledger'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
