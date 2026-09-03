import React, { useState, useEffect } from 'react'
import {
  Search, MapPin, Calendar, Clock, MessageSquare,
  CheckCircle, AlertTriangle, FileText, Star, Send, Plus, X
} from 'lucide-react'
import { grievanceAPI } from '../api'
import { StatusBadge, SeverityBadge } from '../components/StatusBadge'
import AgentPipeline from '../components/AgentPipeline'

const CATEGORIES = [
  'Sanitation', 'Roads & Infrastructure', 'Water Supply', 'Street Lighting',
  'Encroachment', 'Stray Animals', 'Building & Construction', 'Noise Pollution', 'Other'
]

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'ur', label: 'اردو (Urdu)' },
]

function SubmitForm({ onSuccess, showToast }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    raw_text: '', location_text: '', language: 'en',
    latitude: '', longitude: '',
    citizen_name: '', citizen_phone: '', citizen_email: '',
    channel: 'WEB',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.raw_text.trim()) { showToast('Please describe your complaint', 'error'); return }
    setLoading(true)
    try {
      // Convert optional lat/long strings to numbers (or null) for the API.
      const payload = {
        ...form,
        latitude: form.latitude !== '' ? parseFloat(form.latitude) : null,
        longitude: form.longitude !== '' ? parseFloat(form.longitude) : null,
      }
      const g = await grievanceAPI.submit(payload)
      showToast(`Grievance submitted! ID: ${g.tracking_id}`, 'success')
      onSuccess(g)
    } catch (e) {
      showToast(e.response?.data?.detail || 'Submission failed. Is the backend running?', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 700 }}>
      {/* Step Indicator */}
      <div className="step-indicator">
        {['Complaint', 'Location', 'Contact', 'Submit'].map((s, i) => (
          <div key={s} className={`step ${step > i + 1 ? 'completed' : step === i + 1 ? 'active' : ''}`}>
            <div className="step-circle">
              {step > i + 1 ? <CheckCircle size={14} /> : i + 1}
            </div>
            <div className="step-label">{s}</div>
          </div>
        ))}
      </div>

      {/* Step 1: Complaint */}
      {step === 1 && (
        <div>
          <h3 style={{ marginBottom: 20 }}>Describe Your Grievance</h3>
          <div className="form-group">
            <label className="form-label">Preferred Language</label>
            <select className="form-select" value={form.language} onChange={e => set('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Complaint Description *</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your problem in detail — what, where, since when..."
              value={form.raw_text}
              onChange={e => set('raw_text', e.target.value)}
              style={{ minHeight: 150 }}
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {form.raw_text.length} characters — AI will analyze for category, severity & routing
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Channel</label>
            <select className="form-select" value={form.channel} onChange={e => set('channel', e.target.value)}>
              {['WEB', 'MOBILE', 'WHATSAPP', 'IVR'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn btn-primary w-full" onClick={() => setStep(2)} disabled={!form.raw_text.trim()}>
            Next: Add Location
          </button>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div>
          <h3 style={{ marginBottom: 20 }}>Location Details</h3>
          <div className="form-group">
            <label className="form-label">Area / Ward / Location</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 38 }}
                placeholder="e.g. Kukatpally Zone, Ward 3, near Metro Station"
                value={form.location_text}
                onChange={e => set('location_text', e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Latitude (optional)</label>
              <input className="form-input" placeholder="17.3850" type="number" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude (optional)</label>
              <input className="form-input" placeholder="78.4867" type="number" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>Next: Contact Info</button>
          </div>
        </div>
      )}

      {/* Step 3: Contact */}
      {step === 3 && (
        <div>
          <h3 style={{ marginBottom: 20 }}>Your Contact Details</h3>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Your name" value={form.citizen_name} onChange={e => set('citizen_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Mobile Number *</label>
            <input className="form-input" placeholder="9876543210" value={form.citizen_phone} onChange={e => set('citizen_phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email (optional)</label>
            <input className="form-input" type="email" placeholder="email@example.com" value={form.citizen_email} onChange={e => set('citizen_email', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(4)}>Review & Submit</button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div>
          <h3 style={{ marginBottom: 20 }}>Review & Submit</h3>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20, border: '1px solid var(--border-color)' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>COMPLAINT</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{form.raw_text}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>LOCATION</div>
                <div style={{ fontSize: 13 }}>{form.location_text || 'Not specified'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>NAME</div>
                <div style={{ fontSize: 13 }}>{form.citizen_name || 'Anonymous'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>PHONE</div>
                <div style={{ fontSize: 13 }}>{form.citizen_phone || 'Not provided'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>LANGUAGE</div>
                <div style={{ fontSize: 13 }}>{LANGUAGES.find(l => l.code === form.language)?.label}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Processing AI Pipeline...</>
              ) : (
                <><Send size={16} /> Submit Grievance</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TrackGrievance({ showToast, initialId }) {
  const [trackId, setTrackId] = useState(initialId || '')
  const [grievance, setGrievance] = useState(null)
  const [sla, setSla] = useState(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState({ score: 0, comment: '' })
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  const search = async (idOverride) => {
    const id = (typeof idOverride === 'string' ? idOverride : trackId).trim()
    if (!id) return
    setLoading(true)
    try {
      const g = await grievanceAPI.get(id.toUpperCase())
      setGrievance(g)
      const s = await grievanceAPI.getSLA(g.tracking_id)
      setSla(s)
    } catch {
      showToast('Grievance not found. Check tracking ID.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Auto-load the grievance the citizen just submitted.
  useEffect(() => {
    if (initialId) {
      setTrackId(initialId)
      search(initialId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId])

  const submitFeedback = async () => {
    if (!feedback.score) { showToast('Please select a rating', 'error'); return }
    try {
      await grievanceAPI.submitFeedback(grievance.tracking_id, feedback.score, feedback.comment)
      showToast('Thank you for your feedback!', 'success')
      setFeedbackSubmitted(true)
    } catch {
      showToast('Feedback submission failed', 'error')
    }
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="card mb-6" style={{ maxWidth: 700 }}>
        <h3 style={{ marginBottom: 16 }}>Track Your Grievance</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 38 }}
              placeholder="Enter Tracking ID (e.g. JS-20260828-ABC123)"
              value={trackId}
              onChange={e => setTrackId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>
          <button className="btn btn-primary" onClick={search} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Search size={16} />}
            Track
          </button>
        </div>
      </div>

      {/* Grievance Details */}
      {grievance && (
        <div style={{ maxWidth: 700 }}>
          {/* Header */}
          <div className="card mb-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>TRACKING ID</div>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: 'var(--accent-primary-light)' }}>
                  {grievance.tracking_id}
                </div>
              </div>
              <StatusBadge status={grievance.status} />
            </div>

            {/* AI Pipeline */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                AI Processing Pipeline
              </div>
              <AgentPipeline events={grievance.events} />
            </div>

            {/* SLA Bar */}
            {sla && sla.hours_remaining !== null && (
              <div className="sla-bar-container">
                <div className="sla-bar-label">
                  <span>SLA Progress</span>
                  <span style={{ color: sla.is_breached ? 'var(--accent-red)' : sla.elapsed_pct > 75 ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
                    {sla.is_breached
                      ? `⚠ Breached by ${Math.abs(sla.hours_remaining).toFixed(1)}h`
                      : `${sla.hours_remaining.toFixed(1)}h remaining`}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${sla.elapsed_pct}%`,
                      background: sla.is_breached ? 'var(--accent-red)' : sla.elapsed_pct > 75 ? 'var(--accent-orange)' : 'var(--gradient-primary)',
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CATEGORY</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{grievance.category || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{grievance.sub_category}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>SEVERITY</div>
                <SeverityBadge severity={grievance.severity} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>AI CONFIDENCE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary-light)' }}>
                  {Math.round((grievance.classification_confidence || 0) * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Complaint Text */}
          <div className="card mb-4">
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>YOUR COMPLAINT</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>{grievance.raw_text}</div>
            {grievance.location_text && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                <MapPin size={13} /> {grievance.location_text}
              </div>
            )}
          </div>

          {/* Timeline */}
          {grievance.events?.length > 0 && (
            <div className="card mb-4">
              <h4 style={{ marginBottom: 20 }}>Status Timeline</h4>
              <div className="timeline">
                {grievance.events.map((event, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-dot ${event.actor === 'AI_AGENT' ? 'ai' : 'officer'}`} />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <div className="timeline-title">
                          {event.from_status} → {event.to_status}
                          {event.agent_name && (
                            <span className={`agent-chip chip-${event.agent_name}`} style={{ marginLeft: 8 }}>
                              {event.agent_name}
                            </span>
                          )}
                        </div>
                        <div className="timeline-time">
                          {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
                        </div>
                      </div>
                      {event.note && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{event.note}</div>}
                      {event.ai_reasoning && (
                        <div className="timeline-reasoning">{event.ai_reasoning}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {grievance.status === 'RESOLVED' && !feedbackSubmitted && !grievance.csat_score && (
            <div className="card">
              <h4 style={{ marginBottom: 16 }}>Rate Your Experience</h4>
              <div className="stars mb-4">
                {[1, 2, 3, 4, 5].map(s => (
                  <span
                    key={s}
                    className={`star ${feedback.score >= s ? 'active' : ''}`}
                    onClick={() => setFeedback(f => ({ ...f, score: s }))}
                  >★</span>
                ))}
              </div>
              <textarea
                className="form-textarea"
                style={{ minHeight: 80 }}
                placeholder="Any additional comments?"
                value={feedback.comment}
                onChange={e => setFeedback(f => ({ ...f, comment: e.target.value }))}
              />
              <button className="btn btn-primary mt-3" onClick={submitFeedback}>
                <Send size={14} /> Submit Feedback
              </button>
            </div>
          )}
          {(feedbackSubmitted || grievance.csat_score) && (
            <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <CheckCircle size={32} color="var(--accent-green)" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600 }}>Feedback Received!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                CSAT Score: {grievance.csat_score || feedback.score}/5
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CitizenPortal({ showToast }) {
  const [activeTab, setActiveTab] = useState('submit')
  const [submittedGrievance, setSubmittedGrievance] = useState(null)

  const handleSuccess = (g) => {
    setSubmittedGrievance(g)
    setActiveTab('track')
  }

  // Header's "New Complaint" button switches back to the submit tab.
  useEffect(() => {
    const handler = () => { setSubmittedGrievance(null); setActiveTab('submit') }
    window.addEventListener('jansetu:new-complaint', handler)
    return () => window.removeEventListener('jansetu:new-complaint', handler)
  }, [])

  return (
    <div>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 110, 247, 0.12) 0%, rgba(167, 139, 250, 0.08) 100%)',
        border: '1px solid rgba(79, 110, 247, 0.2)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(79, 110, 247, 0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <h2 style={{ fontSize: 24, marginBottom: 8 }}>
          🏛️ Jan Setu — GHMC Grievance Portal
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
          Submit civic complaints instantly. Our <strong style={{ color: 'var(--accent-primary-light)' }}>4 AI Agents</strong> will classify,
          route, track, and keep you updated in real time — in your preferred language.
        </p>
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'AI Classification', color: 'var(--accent-cyan)' },
            { label: 'Auto-Routing', color: 'var(--accent-primary-light)' },
            { label: 'SLA Tracking', color: 'var(--accent-orange)' },
            { label: 'Multilingual Updates', color: 'var(--accent-green)' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: f.color }}>
              <CheckCircle size={14} /> {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'submit' ? 'active' : ''}`} onClick={() => setActiveTab('submit')}>
          <Plus size={14} /> Submit Complaint
        </button>
        <button className={`tab ${activeTab === 'track' ? 'active' : ''}`} onClick={() => setActiveTab('track')}>
          <Search size={14} /> Track Grievance
        </button>
      </div>

      {activeTab === 'submit' && <SubmitForm onSuccess={handleSuccess} showToast={showToast} />}
      {activeTab === 'track' && (
        <TrackGrievance
          showToast={showToast}
          initialId={submittedGrievance?.tracking_id}
        />
      )}
    </div>
  )
}
