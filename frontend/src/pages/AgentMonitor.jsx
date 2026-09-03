import React, { useState, useEffect } from 'react'
import {
  Brain, GitBranch, Clock, MessageCircle, RefreshCw,
  Activity, Zap, CheckCircle, AlertCircle, Filter
} from 'lucide-react'
import { analyticsAPI } from '../api'

const AGENTS = [
  {
    key: 'intake',
    label: 'Intake & Classification Agent',
    icon: Brain,
    color: 'var(--accent-cyan)',
    chipClass: 'chip-intake',
    description: 'Classifies complaint category, sub-category, severity, sentiment, and detects duplicates using NLP.',
    capabilities: ['Text classification', 'Severity scoring', 'Sentiment analysis', 'Duplicate detection', 'Entity extraction'],
  },
  {
    key: 'routing',
    label: 'Routing & Assignment Agent',
    icon: GitBranch,
    color: 'var(--accent-primary-light)',
    chipClass: 'chip-routing',
    description: 'Maps category to department, resolves ward/zone, assigns least-loaded officer, and sets SLA deadline.',
    capabilities: ['Dept mapping', 'Officer load-balancing', 'SLA calculation', 'Multi-dept case splitting', 'Priority assignment'],
  },
  {
    key: 'tracking',
    label: 'Resolution Tracking & Escalation Agent',
    icon: Clock,
    color: 'var(--accent-orange)',
    chipClass: 'chip-tracking',
    description: 'Monitors SLA timers, predicts breaches, nudges officers, escalates to senior officials, and verifies resolution proof.',
    capabilities: ['SLA monitoring', 'Breach prediction', 'Officer nudging', 'Auto-escalation', 'Proof verification'],
  },
  {
    key: 'communication',
    label: 'Citizen Communication Agent',
    icon: MessageCircle,
    color: 'var(--accent-green)',
    chipClass: 'chip-communication',
    description: 'Sends multilingual acknowledgements, proactive status updates, collects CSAT feedback, and handles reopen logic.',
    capabilities: ['Multilingual messaging', 'Acknowledgements', 'Status notifications', 'CSAT analysis', 'Reopen detection'],
  },
]

function AgentCard({ agent }) {
  const Icon = agent.icon
  return (
    <div className="card" style={{ borderTop: `3px solid ${agent.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: `${agent.color}18`,
          border: `1px solid ${agent.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={agent.color} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{agent.label}</div>
          <div className={`agent-chip ${agent.chipClass}`} style={{ marginTop: 4, display: 'inline-flex' }}>
            {agent.key}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pulse-dot" style={{ background: agent.color }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Active</span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
        {agent.description}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {agent.capabilities.map(c => (
          <span key={c} style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 99,
            background: `${agent.color}10`,
            color: agent.color,
            border: `1px solid ${agent.color}20`,
          }}>{c}</span>
        ))}
      </div>
    </div>
  )
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const agent = AGENTS.find(a => a.key === log.agent_name) || { color: 'var(--text-secondary)', chipClass: '' }

  return (
    <div className="agent-log-card" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
      <div className="agent-log-header">
        <span className={`agent-chip ${agent.chipClass || ''}`}>{log.agent_name}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{log.action}</span>
        {log.tracking_id && (
          <span style={{ fontSize: 11, color: 'var(--accent-primary-light)', fontFamily: 'Space Grotesk', fontWeight: 700 }}>
            {log.tracking_id}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
        </span>
        {log.confidence != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="confidence-bar" style={{ width: 60 }}>
              <div className="confidence-fill" style={{ width: `${Math.round(log.confidence * 100)}%` }} />
            </div>
            <span className="confidence-label">{Math.round(log.confidence * 100)}%</span>
          </div>
        )}
        <span style={{
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 99,
          background: log.status === 'SUCCESS' ? 'rgba(16, 217, 143, 0.12)' : 'rgba(244, 63, 94, 0.12)',
          color: log.status === 'SUCCESS' ? 'var(--accent-green)' : 'var(--accent-red)',
          fontWeight: 700,
        }}>{log.status}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.duration_ms}ms</span>
      </div>

      {/* Input/Output Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, marginTop: 8 }}>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>INPUT</div>
          <div style={{ color: 'var(--text-secondary)' }} className="truncate">{log.input_summary || '—'}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>OUTPUT</div>
          <div style={{ color: 'var(--text-secondary)' }} className="truncate">{log.output_summary || '—'}</div>
        </div>
      </div>

      {/* Reasoning (expanded) */}
      {expanded && log.reasoning && (
        <div className="timeline-reasoning" style={{ marginTop: 12 }}>
          <strong>AI Reasoning:</strong> {log.reasoning}
        </div>
      )}
    </div>
  )
}

export default function AgentMonitor({ showToast }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [agentFilter, setAgentFilter] = useState('ALL')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = async () => {
    try {
      const params = { limit: 100 }
      if (agentFilter !== 'ALL') params.agent_name = agentFilter
      const data = await analyticsAPI.agentLogs(params)
      setLogs(data)
    } catch {
      showToast('Failed to load agent logs', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [agentFilter])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, agentFilter])

  const agentStats = AGENTS.map(a => ({
    ...a,
    count: logs.filter(l => l.agent_name === a.key).length,
    avgConf: logs.filter(l => l.agent_name === a.key && l.confidence != null).reduce((s, l, _, arr) =>
      arr.length ? s + l.confidence / arr.length : 0, 0
    ),
    avgMs: logs.filter(l => l.agent_name === a.key).reduce((s, l, _, arr) =>
      arr.length ? s + l.duration_ms / arr.length : 0, 0
    ),
  }))

  return (
    <div>
      {/* Architecture Overview */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,110,247,0.08), rgba(167,139,250,0.05))',
        border: '1px solid rgba(79,110,247,0.2)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 28px',
        marginBottom: 28,
      }}>
        <h3 style={{ marginBottom: 8 }}>
          <Zap size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-secondary)' }} />
          Multi-Agent Orchestration Architecture
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 800, marginBottom: 16 }}>
          Jan Setu uses <strong style={{ color: 'var(--text-primary)' }}>4 specialized AI agents</strong> coordinated by an
          <strong style={{ color: 'var(--text-primary)' }}> Orchestration Layer</strong> implementing an event-driven state machine.
          Each grievance flows through the pipeline asynchronously — ensuring intake is never blocked by slow downstream steps.
        </p>

        {/* Pipeline Visual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'auto', paddingBottom: 4 }}>
          {[
            { label: 'Citizen', bg: 'rgba(34, 211, 238, 0.12)', color: 'var(--accent-cyan)' },
            ...AGENTS.map(a => ({ label: a.label.split(' ')[0] + '\nAgent', bg: `${a.color}12`, color: a.color })),
            { label: 'Citizen\nNotified', bg: 'rgba(16, 217, 143, 0.12)', color: 'var(--accent-green)' },
          ].map((node, i) => (
            <React.Fragment key={i}>
              <div style={{
                background: node.bg, border: `1px solid ${node.color}30`,
                borderRadius: 'var(--radius-md)', padding: '10px 16px', flexShrink: 0,
                textAlign: 'center', fontSize: 12, fontWeight: 600, color: node.color,
                whiteSpace: 'pre-line', lineHeight: 1.3,
              }}>
                {node.label}
              </div>
              {i < 5 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 16, padding: '0 6px' }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid-2 mb-6">
        {AGENTS.map(a => <AgentCard key={a.key} agent={a} />)}
      </div>

      {/* Agent Stats */}
      <div className="grid-4 mb-6">
        {agentStats.map(a => (
          <div key={a.key} className="card" style={{ textAlign: 'center' }}>
            <div style={{ color: a.color, marginBottom: 8 }}>
              <a.icon size={22} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{a.key}</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Space Grotesk', color: a.color }}>{a.count}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>executions</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Avg confidence: {a.avgConf > 0 ? `${Math.round(a.avgConf * 100)}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Avg latency: {a.avgMs > 0 ? `${Math.round(a.avgMs)}ms` : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Live Log */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 16, flex: 1 }}>
            <Activity size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-purple)' }} />
            Agent Decision Audit Log
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {['ALL', ...AGENTS.map(a => a.key)].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${agentFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAgentFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={12} className={autoRefresh ? 'spinning' : ''} />
            {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={load}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><AlertCircle size={24} color="var(--text-muted)" /></div>
            <h3>No Logs Yet</h3>
            <p>Submit a grievance to see the AI agent pipeline in action.</p>
          </div>
        ) : (
          <div>
            {logs.map(log => <LogRow key={log.id} log={log} />)}
          </div>
        )}
      </div>
    </div>
  )
}
