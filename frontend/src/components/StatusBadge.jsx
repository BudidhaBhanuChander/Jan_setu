import React from 'react'

const STATUS_CLASSES = {
  NEW: 'badge-new',
  CLASSIFIED: 'badge-classified',
  ASSIGNED: 'badge-assigned',
  IN_PROGRESS: 'badge-in_progress',
  RESOLVED: 'badge-resolved',
  CLOSED: 'badge-closed',
  ESCALATED: 'badge-escalated',
  REOPENED: 'badge-reopened',
}

const SEVERITY_CLASSES = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_CLASSES[status] || 'badge-new'}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export function SeverityBadge({ severity }) {
  return (
    <span className={`badge ${SEVERITY_CLASSES[severity] || 'badge-medium'}`}>
      {severity}
    </span>
  )
}
