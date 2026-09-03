import React from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

export default function Toast({ message, type, onClose }) {
  const icons = { success: CheckCircle, error: XCircle, info: Info }
  const Icon = icons[type] || Info
  return (
    <div className={`toast toast-${type}`} onClick={onClose} style={{ cursor: 'pointer' }}>
      <Icon size={18} />
      {message}
    </div>
  )
}
