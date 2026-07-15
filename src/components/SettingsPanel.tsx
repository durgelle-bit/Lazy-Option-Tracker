import React, { useRef, useState } from 'react'
import { AppData } from '../types'
import { exportToFile, importFromFile, describeLastExport } from '../utils/storage'
import { X, Download, Upload, Save, AlertTriangle, Trash2, Settings as SettingsIcon, Clock, ShieldCheck } from 'lucide-react'
import ModalShell from './ModalShell'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  data: AppData
  onClose: () => void
  onImport: (data: AppData) => void
  onUpdateSettings: (
    startingCash: number,
    displayCurrency: string,
    reserveBufferEnabled: boolean,
    reserveBufferPercent: number
  ) => void
  onFactoryReset: () => void
  onExported: () => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const CURRENCIES = ['USD', 'SGD', 'EUR', 'GBP', 'AUD', 'HKD', 'JPY']

export default function SettingsPanel({ data, onClose, onImport, onUpdateSettings, onFactoryReset, onExported, onToast }: Props) {
  const [startingCash, setStartingCash] = useState(String(data.settings.startingCash))
  const [currency, setCurrency] = useState(data.settings.displayCurrency)
  const [reserveBufferEnabled, setReserveBufferEnabled] = useState(data.settings.reserveBufferEnabled)
  const [reserveBufferPercent, setReserveBufferPercent] = useState(String(data.settings.reserveBufferPercent))
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSaveSettings() {
    const cash = parseFloat(startingCash)
    if (isNaN(cash) || cash < 0) {
      onToast('Starting cash must be a valid non-negative number.', 'error')
      return
    }
    const percent = parseFloat(reserveBufferPercent)
    if (isNaN(percent) || percent < 0 || percent > 50) {
      onToast('Reserve Buffer Percentage must be between 0 and 50.', 'error')
      return
    }
    onUpdateSettings(cash, currency, reserveBufferEnabled, percent)
  }

  function handleExport() {
    const ok = exportToFile(data)
    if (ok) onExported()
    onToast(ok ? 'Data exported. Check your downloads folder.' : 'Export failed.', ok ? 'success' : 'error')
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importFromFile(file)
      onImport(imported)
    } catch (err: any) {
      onToast(err?.message || 'Failed to import file.', 'error')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <ModalShell onClose={onClose} maxWidth="max-w-lg">
        <div className="flex items-center justify-between border-b border-vault-700 px-6 py-4">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-accent" />
            <h3 className="text-lg font-bold text-white">Settings & Data Portability</h3>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
          {/* Portfolio Settings */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Portfolio Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Starting Cash</label>
                <input
                  type="number"
                  step="100"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label-field">Display Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="select-field">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-vault-700 bg-vault-850 p-3">
              <div className="flex items-center justify-between">
                <label htmlFor="reserve-buffer-toggle" className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                  <ShieldCheck size={14} className="text-accent" /> Enable Reserve Buffer
                </label>
                <button
                  id="reserve-buffer-toggle"
                  type="button"
                  role="switch"
                  aria-checked={reserveBufferEnabled}
                  onClick={() => setReserveBufferEnabled((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    reserveBufferEnabled ? 'bg-accent' : 'bg-vault-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      reserveBufferEnabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Reserves a slice of your Starting Cash as a safety net, tracked against your Cash Safe For Deployment.
              </p>
              <div className={`mt-3 ${reserveBufferEnabled ? '' : 'opacity-40'}`}>
                <label className="label-field">Reserve Buffer Percentage (0–50%)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={reserveBufferPercent}
                  disabled={!reserveBufferEnabled}
                  onChange={(e) => setReserveBufferPercent(e.target.value)}
                  className="input-field font-mono"
                />
              </div>
            </div>

            <button onClick={handleSaveSettings} className="btn-primary mt-3 w-full">
              <Save size={16} /> Save Settings
            </button>
          </section>

          <div className="h-px bg-vault-700" />

          {/* Portability Suite */}
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Portability Suite</h4>
            <p className="mb-3 text-xs text-slate-500">
              Your data lives only in this browser's local storage. Export regularly to back it up, or move it to
              another device.
            </p>
            <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-vault-700 bg-vault-850 px-3 py-2 text-xs text-slate-400">
              <Clock size={13} className="text-slate-500" />
              {describeLastExport(data.settings.lastExportedAt)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExport} className="btn-secondary">
                <Download size={16} /> Export to JSON
              </button>
              <button onClick={handleImportClick} className="btn-secondary">
                <Upload size={16} /> Import from JSON
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileChange} />
            <p className="mt-2 text-[11px] text-slate-600">
              Importing will replace all current data in this browser. Export first if you want to keep a backup.
            </p>
          </section>

          <div className="h-px bg-vault-700" />

          {/* Danger Zone */}
          <section>
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-loss-glow">
              <AlertTriangle size={12} /> Danger Zone
            </h4>
            <button onClick={() => setConfirmReset(true)} className="btn-danger w-full">
              <Trash2 size={16} /> Clear All Data
            </button>
          </section>
        </div>
      </ModalShell>

      {confirmReset && (
        <ConfirmDialog
          title="Clear All Data?"
          message="This will permanently erase every trade and reset your settings on this device. Export a backup first if you're unsure."
          confirmLabel="Clear Everything"
          danger
          onConfirm={() => {
            setConfirmReset(false)
            onFactoryReset()
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </>
  )
}
