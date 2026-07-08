import React from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import ModalShell from './ModalShell'

interface Props {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-sm">
      <div className="px-6 py-6">
        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
            danger ? 'bg-loss/10 text-loss-glow' : 'bg-accent/10 text-accent'
          }`}
        >
          {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
        </div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-vault-700 px-6 py-4">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
