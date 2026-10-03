import React, { useEffect, useMemo, useState } from 'react'
import { HoldingsSummary, SharePurchase } from '../types'
import { formatCurrency, previewSharePurchase, uid } from '../utils/calc'
import { X, Save, TrendingDown, TrendingUp, Target, Wallet } from 'lucide-react'
import ModalShell from './ModalShell'

interface Props {
  purchase: SharePurchase | null
  prefillTicker?: string
  holdings: HoldingsSummary[]
  cashSafeForDeployment: number
  currency: string
  onSave: (p: SharePurchase) => void
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function BuySharesModal({
  purchase,
  prefillTicker,
  holdings,
  cashSafeForDeployment,
  currency,
  onSave,
  onClose,
}: Props) {
  const isEdit = !!purchase

  const [ticker, setTicker] = useState(purchase?.ticker || prefillTicker || '')
  const [date, setDate] = useState(purchase?.date?.slice(0, 10) || todayISO())
  const [shares, setShares] = useState(purchase ? String(purchase.shares) : '')
  const [pricePerShare, setPricePerShare] = useState(purchase ? String(purchase.pricePerShare) : '')
  const [fees, setFees] = useState(purchase ? String(purchase.fees) : '0')
  const [notes, setNotes] = useState(purchase?.notes || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const currentHolding = useMemo(
    () => holdings.find((h) => h.ticker === ticker.trim().toUpperCase()),
    [holdings, ticker]
  )

  const sharesN = parseFloat(shares)
  const priceN = parseFloat(pricePerShare)
  const feesN = parseFloat(fees || '0')

  // When editing, exclude this purchase's own contribution from the "current" baseline so
  // the preview shows the effect of this edit in isolation, not double-counted against itself.
  const baselineHolding = useMemo(() => {
    if (!isEdit || !currentHolding || !purchase) return currentHolding
    const origCost = purchase.pricePerShare * purchase.shares + purchase.fees
    const remainingShares = currentHolding.heldShares - purchase.shares
    if (remainingShares <= 0) return undefined
    const remainingCost = currentHolding.heldShares * currentHolding.avgCostBasis - origCost
    return { ...currentHolding, heldShares: remainingShares, avgCostBasis: remainingCost / remainingShares }
  }, [isEdit, currentHolding, purchase])

  const preview = useMemo(() => {
    if (isNaN(sharesN) || sharesN <= 0 || isNaN(priceN) || priceN < 0) return null
    return previewSharePurchase(baselineHolding, sharesN, priceN, isNaN(feesN) ? 0 : feesN)
  }, [baselineHolding, sharesN, priceN, feesN])

  const cashRemainingAfter = cashSafeForDeployment - (preview?.totalCost || 0)
  const exceedsCash = preview !== null && cashRemainingAfter < 0

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!ticker.trim()) errs.ticker = 'Required'
    if (!date) errs.date = 'Required'
    const sN = parseFloat(shares)
    if (isNaN(sN) || sN <= 0) errs.shares = 'Must be > 0'
    const pN = parseFloat(pricePerShare)
    if (isNaN(pN) || pN <= 0) errs.pricePerShare = 'Must be > 0'
    const fN = parseFloat(fees || '0')
    if (isNaN(fN) || fN < 0) errs.fees = 'Must be ≥ 0'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const now = new Date().toISOString()
    const record: SharePurchase = {
      id: purchase?.id || uid(),
      ticker: ticker.trim().toUpperCase(),
      date: new Date(date).toISOString(),
      shares: parseFloat(shares),
      pricePerShare: parseFloat(pricePerShare),
      fees: parseFloat(fees || '0'),
      notes: notes.trim() || undefined,
      createdAt: purchase?.createdAt || now,
      updatedAt: now,
    }
    onSave(record)
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-vault-700 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">{isEdit ? 'Edit Share Purchase' : 'Buy Shares with Cash'}</h3>
            <p className="text-xs text-slate-500">Spend idle cash to build toward a 100-share covered-call position.</p>
          </div>
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
              <label className="label-field">Purchase Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field font-mono" />
              {errors.date && <p className="mt-1 text-xs text-loss-glow">{errors.date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-field">Shares</label>
              <input
                type="number"
                step="1"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="25"
                className="input-field font-mono"
              />
              {errors.shares && <p className="mt-1 text-xs text-loss-glow">{errors.shares}</p>}
            </div>
            <div>
              <label className="label-field">Price / Share</label>
              <input
                type="number"
                step="0.01"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                placeholder="150.00"
                className="input-field font-mono"
              />
              {errors.pricePerShare && <p className="mt-1 text-xs text-loss-glow">{errors.pricePerShare}</p>}
            </div>
            <div>
              <label className="label-field">Fees ($)</label>
              <input
                type="number"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0.00"
                className="input-field font-mono"
              />
              {errors.fees && <p className="mt-1 text-xs text-loss-glow">{errors.fees}</p>}
            </div>
          </div>

          <div>
            <label className="label-field">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Topping up toward 100 shares for covered calls..."
              className="input-field resize-none"
            />
          </div>

          {/* Live preview: cost-basis delta + progress to 100 + cash remaining */}
          {preview && (
            <div className="space-y-3 rounded-xl border border-vault-700 bg-vault-850 px-4 py-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span>Purchase Preview</span>
                <span className="font-mono text-sm font-bold text-white">{formatCurrency(preview.totalCost, currency)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-vault-900/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Avg Cost Basis</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-sm text-slate-400">${preview.currentAvgCostBasis.toFixed(2)}</span>
                    <span className="text-slate-600">→</span>
                    <span className="font-mono text-sm font-bold text-white">${preview.newAvgCostBasis.toFixed(2)}</span>
                  </div>
                  <p
                    className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
                      preview.costBasisDelta <= 0 ? 'text-profit-glow' : 'text-gold-glow'
                    }`}
                  >
                    {preview.costBasisDelta <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {preview.costBasisDelta === 0
                      ? 'No change'
                      : `${preview.costBasisDelta > 0 ? '+' : ''}$${preview.costBasisDelta.toFixed(2)}/share`}
                  </p>
                </div>

                <div className="rounded-lg bg-vault-900/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Shares Held</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-sm text-slate-400">{preview.currentShares}</span>
                    <span className="text-slate-600">→</span>
                    <span className="font-mono text-sm font-bold text-white">{preview.newShares}</span>
                  </div>
                  <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${preview.sharesToGo === 0 ? 'text-profit-glow' : 'text-slate-400'}`}>
                    <Target size={12} />
                    {preview.sharesToGo === 0
                      ? preview.willReach100
                        ? '🎉 Covered-call eligible!'
                        : 'Covered-call eligible'
                      : `${preview.sharesToGo} more to reach 100`}
                  </p>
                </div>
              </div>

              {/* Progress bar toward 100 shares */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Progress to 100 shares</span>
                  <span className="font-mono">{Math.min(100, preview.newShares)}/100</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-vault-700">
                  <div
                    className={`h-full transition-all ${preview.newShares >= 100 ? 'bg-profit' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, (preview.newShares / 100) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-vault-700 pt-3 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <Wallet size={12} /> Cash Safe For Deployment after this buy
                </span>
                <span className={`font-mono font-bold ${exceedsCash ? 'text-loss-glow' : 'text-white'}`}>
                  {formatCurrency(cashRemainingAfter, currency)}
                </span>
              </div>
            </div>
          )}

          {exceedsCash && (
            <div className="rounded-lg border border-loss/30 bg-loss/10 px-4 py-3 text-xs text-loss-glow">
              Heads up: this purchase exceeds your current Cash Safe For Deployment. You can still record it, but
              you'd be spending cash you haven't actually set aside for new positions.
            </div>
          )}

          <div className="rounded-lg border border-vault-700 bg-vault-850 px-4 py-3 text-xs text-slate-500">
            <strong className="text-slate-400">How this works:</strong> This creates a share lot exactly like a put
            assignment does — it blends into the ticker's average cost basis, counts toward the 100-share
            covered-call threshold, and its cost is deducted from Total Cash / Cash Safe For Deployment immediately
            (it's real cash leaving the account to buy stock).
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-vault-700 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            <Save size={16} /> {isEdit ? 'Save Changes' : 'Buy Shares'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
