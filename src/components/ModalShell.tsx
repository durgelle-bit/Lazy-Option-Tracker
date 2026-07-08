import React from 'react'

interface Props {
  children: React.ReactNode
  onClose: () => void
  maxWidth?: string
}

export default function ModalShell({ children, onClose, maxWidth = 'max-w-lg' }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full ${maxWidth} animate-slide-up rounded-2xl border border-vault-700 bg-vault-900 shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
