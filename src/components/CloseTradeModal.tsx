import React, { useMemo, useState } from 'react'
import { CLOSE_STATUS_OPTIONS, Trade, TradeStatus } from '../types'
import { formatCurrency, isCredit, realizedPL } from '../utils/calc'
import { X, CheckCircle2 } from 'lucide-react'
import ModalShell from './ModalShell'

interface Props {
  trade: Trade
  onConfirm: (t: Trade) => void
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function CloseTradeModal({ trade, onConfirm, onClose }: Props) {
  const credit = isCredit(trade.strategy)
  const [status, setStatus] = useState<TradeStatus>('Closed')
  const [closeDate, setCloseDate] = useState(todayISO())
  const [closePremium, setClosePremium] = useState(status === 'Expired' ? '0' : '')
  const [closeFees, setCloseFees] = useState('0')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleStatusChange(s: TradeStatus) {
    setStatus(s)
    if (s === 'Expired') {
      setClosePremium('0')
      setCloseFees('0')
    } else if (s === 'Assigned' && credit) {
      // Assignment on a short option: no buy-back premium paid, option is exercised
      setClosePremium('0')
    }
  }

  const previewTrade: Trade = useMemo(
    () => ({
      ...trade,
      status,
      closeDate: new Date(closeDate || todayISO()).toISOString(),
      closePremium: parseFloat(closePremium || '0'),
      closeFees: parseFloat(closeFees || '0'),
    }),
    [trade, status, closeDate, closePremium, closeFees]
  )

  const previewPL = realizedPL(previewTrade)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!closeDate) errs.closeDate = 'Required'
    const cp = parseFloat(closePremium)
    if (closePremium !== '' && (isNaN(cp) || cp < 0)) errs.closePremium = 'Must be ≥ 0'
    if (closePremium === '') errs.closePremium = 'Required'
    const cf = parseFloat(closeFees || '0')
    if (isNaN(cf) || cf < 0) errs.closeFees = 'Must be ≥ 0'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onConfirm({
      ...trade,
      status,
      closeDate: new Date(closeDate).toISOString(),
      closePremium: parseFloat(closePremium),
      closeFees: parseFloat(closeFees || '0'),
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-vault-700 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">Settle Trade</h3>
            <p className="text-xs text-slate-500">
              {trade.ticker} · {trade.strategy} · Strike ${trade.strike.toFixed(2)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="label-field">Resolution Status</label>
            <div className="grid grid-cols-3 gap-2">
              {CLOSE_STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    status === s
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-vault-600 bg-vault-800 text-slate-400 hover:border-vault-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Close Date</label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="input-field font-mono"
              />
              {errors.closeDate && <p className="mt-1 text-xs text-loss-glow">{errors.closeDate}</p>}
            </div>
            <div>
              <label className="label-field">{credit ? 'Buy-back Premium' : 'Sale Premium'} (per share)</label>
              <input
                type="number"
                step="0.01"
                value={closePremium}
                onChange={(e) => setClosePremium(e.target.value)}
                placeholder="0.00"
                disabled={status === 'Expired'}
                className="input-field font-mono disabled:opacity-50"
              />
              {errors.closePremium && <p className="mt-1 text-xs text-loss-glow">{errors.closePremium}</p>}
            </div>
          </div>

          <div>
            <label className="label-field">Closing Fees ($)</label>
            <input
              type="number"
              step="0.01"
              value={closeFees}
              onChange={(e) => setCloseFees(e.target.value)}
              placeholder="0.00"
              disabled={status === 'Expired'}
              className="input-field font-mono disabled:opacity-50"
            />
            {errors.closeFees && <p className="mt-1 text-xs text-loss-glow">{errors.closeFees}</p>}
          </div>

          <div className="rounded-xl border border-vault-700 bg-vault-850 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Realized P/L Preview</span>
              <span className={`font-mono text-lg font-bold ${previewPL >= 0 ? 'text-profit-glow' : 'text-loss-glow'}`}>
                {formatCurrency(previewPL, 'USD')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-vault-700 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary !bg-profit hover:!bg-profit-glow">
            <CheckCircle2 size={16} /> Move to Settled
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
