import React, { useState, useEffect } from 'react'
import {
  Clock, AlertTriangle, CheckCircle, MapPin,
  ArrowRight, ChevronDown, ChevronUp, User, RefreshCw, Search
} from 'lucide-react'
import { grievanceAPI } from '../api'
import { StatusBadge, SeverityBadge } from '../components/StatusBadge'
import AgentPipeline from '../components/AgentPipeline'

// ── Resolution Modal
function ResolveModal({ grievance, onClose, onResolved, showToast }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!notes.trim()) { showToast('Please add resolution notes', 'error'); return }
    setLoading(true)
    try {
      const result = await grievanceAPI.updateStatus(grievance.tracking_id, {
        status: 'RESOLVED',
        resolution_notes: notes,
      })
      if (result.success) {
        showToast(result.verified
          ? '✅ Resolution verified by AI! Citizen notified.'
          : `⚠ AI verification low confidence (${Math.round((result.confidence || 0) * 100)}%). Flagged for review.`,
          result.success ? 'success' : 'info')
        onResolved()
        onClose()
      }
    } catch {
      showToast('Resolution update failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Mark as Resolved</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>ORIGINAL COMPLAINT</div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{grievance.raw_text}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Resolution Notes *</label>
            <textarea
              className="form-textarea"
              placeholder="Describe what was done to resolve this grievance (AI will verify this matches the complaint)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div style={{
            background: 'rgba(79, 110, 247, 0.06)',
            border: '1px solid rgba(79, 110, 247, 0.15)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--accent-primary-light)',
            marginBottom: 20,
          }}>
            🤖 The <strong>Resolution Tracking Agent</strong> will automatically verify that your notes match the original complaint before marking it resolved.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-success" style={{ flex: 1 }} onClick={submit} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <CheckCircle size={16} />}
              Submit Resolution
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Grievance Row
function GrievanceRow({ g, onStatusChange, showToast }) {
  const [expanded, setExpanded] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const updateStatus = async (status) => {
    setUpdatingStatus(true)
    try {
      await grievanceAPI.updateStatus(g.tracking_id, { status })
      showToast(`Status updated to ${status}`, 'success')
      onStatusChange()
    } catch {
      showToast('Update failed', 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const slaColors = {
    healthy: 'var(--accent-green)',
    warning: 'var(--accent-orange)',
    critical: 'var(--accent-red)',
  }

  return (
    <>
      <tr>
        <td>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 700, color: 'var(--accent-primary-light)' }}>
            {g.tracking_id}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {new Date(g.created_at).toLocaleDateString()}
          </div>
        </td>
        <td>
          <div style={{ maxWidth: 200, fontSize: 13 }} className="truncate">{g.raw_text}</div>
          {g.location_text && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <MapPin size={11} /> {g.location_text}
            </div>
          )}
        </td>
        <td>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{g.category}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{g.sub_category}</div>
        </td>
        <td><SeverityBadge severity={g.severity} /></td>
        <td><StatusBadge status={g.status} /></td>
        <td>
          {g.sla_deadline ? (() => {
            const hoursLeft = (new Date(g.sla_deadline) - new Date()) / 3600000
            const pct = Math.min(100, Math.max(0, 100 - (hoursLeft / 48) * 100))
            const color = hoursLeft < 0 ? slaColors.critical : hoursLeft < 12 ? slaColors.warning : slaColors.healthy
            return (
              <div>
                <div style={{ fontSize: 12, color, fontWeight: 600 }}>
                  {hoursLeft < 0 ? `${Math.abs(hoursLeft).toFixed(0)}h overdue` : `${hoursLeft.toFixed(0)}h left`}
                </div>
                <div className="progress-bar" style={{ marginTop: 4 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })() : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No deadline</span>}
        </td>
        <td>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {g.status === 'ASSIGNED' && (
              <button className="btn btn-sm btn-secondary" onClick={() => updateStatus('IN_PROGRESS')} disabled={updatingStatus}>
                Start Work
              </button>
            )}
            {g.status === 'IN_PROGRESS' && (
              <button className="btn btn-sm btn-success" onClick={() => setResolveOpen(true)}>
                <CheckCircle size={12} /> Resolve
              </button>
            )}
            {g.status === 'ESCALATED' && (
              <button className="btn btn-sm btn-secondary" onClick={() => updateStatus('IN_PROGRESS')} disabled={updatingStatus}>
                Take Action
              </button>
            )}
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setExpanded(!expanded)}
              style={{ padding: '6px 8px' }}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'var(--bg-secondary)' }}>
          <td colSpan={7} style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>AI PROCESSING PIPELINE</div>
              <AgentPipeline events={g.events} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 12 }}>
              <strong>Full complaint:</strong> {g.raw_text}
            </div>
            {g.escalations?.length > 0 && (
              <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                <AlertTriangle size={14} color="var(--accent-red)" style={{ marginRight: 6, verticalAlign: 'middle' }} />
                <strong style={{ color: 'var(--accent-red)', fontSize: 12 }}>ESCALATION:</strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>
                  {g.escalations[0].reason} — Escalated to {g.escalations[0].escalated_to}
                </span>
              </div>
            )}
          </td>
        </tr>
      )}
      {resolveOpen && (
        <ResolveModal
          grievance={g}
          onClose={() => setResolveOpen(false)}
          onResolved={onStatusChange}
          showToast={showToast}
        />
      )}
    </>
  )
}

export default function OfficerDashboard({ showToast }) {
  const [allGrievances, setAllGrievances] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const FILTERS = ['ALL', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED']

  const load = async () => {
    setLoading(true)
    try {
      // Always fetch the full set so counts stay accurate regardless of filter.
      const data = await grievanceAPI.list({ limit: 100 })
      setAllGrievances(data)
    } catch {
      showToast('Failed to load grievances', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [refreshKey])

  const runSLACheck = async () => {
    try {
      const result = await grievanceAPI.runSLACheck()
      showToast(`SLA Check: ${result.actions_taken} escalation actions taken`, 'info')
      setRefreshKey(k => k + 1)
    } catch {
      showToast('SLA check failed', 'error')
    }
  }

  // Counts are derived from the full dataset, not the filtered view.
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'ALL' ? allGrievances.length : allGrievances.filter(g => g.status === f).length
    return acc
  }, {})

  // The visible rows apply the active filter + free-text search client-side.
  const q = query.trim().toLowerCase()
  const grievances = allGrievances
    .filter(g => filter === 'ALL' || g.status === filter)
    .filter(g => !q || [g.tracking_id, g.raw_text, g.category, g.location_text]
      .some(v => (v || '').toLowerCase().includes(q)))

  return (
    <div>
      {/* Stats Row */}
      <div className="grid-4 mb-6">
        {[
          { label: 'Total Assigned', value: counts['ALL'] || 0, color: 'var(--accent-primary-light)' },
          { label: 'In Progress', value: counts['IN_PROGRESS'] || 0, color: 'var(--accent-orange)' },
          { label: 'Escalated', value: counts['ESCALATED'] || 0, color: 'var(--accent-red)' },
          { label: 'Resolved Today', value: counts['RESOLVED'] || 0, color: 'var(--accent-green)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Space Grotesk', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginBottom: 0, flex: 1 }}>
          {FILTERS.map(f => (
            <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.replace('_', ' ')}
              <span style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 99, fontSize: 10, marginLeft: 4 }}>
                {counts[f] || 0}
              </span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search ID, text, category…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 32, height: 34, width: 220, fontSize: 13 }}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={runSLACheck}>
          <Clock size={13} /> Run SLA Check
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading grievances...</span></div>
      ) : grievances.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CheckCircle size={28} color="var(--accent-green)" /></div>
          <h3>All Clear!</h3>
          <p>No grievances match the current filter.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Complaint</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>SLA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grievances.map(g => (
                <GrievanceRow
                  key={g.id}
                  g={g}
                  onStatusChange={() => setRefreshKey(k => k + 1)}
                  showToast={showToast}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
