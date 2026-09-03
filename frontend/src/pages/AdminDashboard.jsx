import React, { useState, useEffect, useRef } from 'react'
import {
  FileText, CheckCircle, AlertTriangle, TrendingUp,
  BarChart3, PieChart, Activity, MapPin, Clock, Target,
  Download, Server, Users, Building2, Cpu, Mic, Zap
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { analyticsAPI, adminAPI } from '../api'
import StatCard from '../components/StatCard'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
)

const CHART_COLORS = {
  primary: 'rgba(79, 110, 247, 0.8)',
  primaryLight: 'rgba(79, 110, 247, 0.2)',
  green: 'rgba(16, 217, 143, 0.8)',
  greenLight: 'rgba(16, 217, 143, 0.2)',
  orange: 'rgba(251, 146, 60, 0.8)',
  red: 'rgba(244, 63, 94, 0.8)',
  purple: 'rgba(167, 139, 250, 0.8)',
  cyan: 'rgba(34, 211, 238, 0.8)',
  secondary: 'rgba(245, 158, 11, 0.8)',
}

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(13, 21, 39, 0.95)',
      borderColor: 'rgba(79, 110, 247, 0.3)',
      borderWidth: 1,
      titleColor: '#e8edf8',
      bodyColor: '#7a8ab4',
      padding: 12,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(79, 110, 247, 0.06)' },
      ticks: { color: '#7a8ab4', font: { size: 11 } },
    },
    y: {
      grid: { color: 'rgba(79, 110, 247, 0.06)' },
      ticks: { color: '#7a8ab4', font: { size: 11 } },
    },
  },
}

const DOUGHNUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#7a8ab4', padding: 16, font: { size: 11 } },
    },
    tooltip: {
      backgroundColor: 'rgba(13, 21, 39, 0.95)',
      borderColor: 'rgba(79, 110, 247, 0.3)',
      borderWidth: 1,
      titleColor: '#e8edf8',
      bodyColor: '#7a8ab4',
    },
  },
}

export default function AdminDashboard({ showToast }) {
  const [overview, setOverview] = useState(null)
  const [categories, setCategories] = useState([])
  const [severities, setSeverities] = useState([])
  const [statuses, setStatuses] = useState([])
  const [wards, setWards] = useState([])
  const [trend, setTrend] = useState([])
  const [departments, setDepartments] = useState([])
  const [officers, setOfficers] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [ov, cats, sevs, stats, ws, tr, depts, offs] = await Promise.all([
        analyticsAPI.overview(),
        analyticsAPI.byCategory(),
        analyticsAPI.bySeverity(),
        analyticsAPI.byStatus(),
        analyticsAPI.byWard(),
        analyticsAPI.trend(7),
        analyticsAPI.byDepartment(),
        analyticsAPI.officerPerformance(),
      ])
      setOverview(ov)
      setCategories(cats)
      setSeverities(sevs)
      setStatuses(stats)
      setWards(ws)
      setTrend(tr)
      setDepartments(depts)
      setOfficers(offs)
    } catch {
      showToast('Failed to load analytics', 'error')
    } finally {
      setLoading(false)
    }
    // System config is optional — never let it block the dashboard.
    try {
      setConfig(await adminAPI.config())
    } catch {
      setConfig(null)
    }
  }

  useEffect(() => { load() }, [])

  const exportCsv = () => {
    // Let the browser handle the streamed download via the Vite proxy.
    window.open(analyticsAPI.exportCsvUrl(), '_blank')
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading analytics...</span></div>
  if (!overview) return null

  // Chart data
  const trendData = {
    labels: trend.map(t => t.date),
    datasets: [
      {
        label: 'Submitted',
        data: trend.map(t => t.submitted),
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primaryLight,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Resolved',
        data: trend.map(t => t.resolved),
        borderColor: CHART_COLORS.green,
        backgroundColor: CHART_COLORS.greenLight,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const categoryData = {
    labels: categories.map(c => c.category),
    datasets: [{
      data: categories.map(c => c.count),
      backgroundColor: [
        CHART_COLORS.primary, CHART_COLORS.green, CHART_COLORS.orange,
        CHART_COLORS.red, CHART_COLORS.purple, CHART_COLORS.cyan,
        CHART_COLORS.secondary, '#ec4899', '#8b5cf6',
      ],
      borderWidth: 0,
    }],
  }

  const severityColors = {
    CRITICAL: CHART_COLORS.red,
    HIGH: CHART_COLORS.orange,
    MEDIUM: CHART_COLORS.secondary,
    LOW: CHART_COLORS.green,
  }

  const severityData = {
    labels: severities.map(s => s.severity),
    datasets: [{
      data: severities.map(s => s.count),
      backgroundColor: severities.map(s => severityColors[s.severity] || CHART_COLORS.primary),
      borderWidth: 0,
    }],
  }

  const wardData = {
    labels: wards.map(w => w.ward),
    datasets: [{
      label: 'Grievances',
      data: wards.map(w => w.count),
      backgroundColor: CHART_COLORS.primary,
      borderRadius: 6,
    }],
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {config && (() => {
            const sched = config.sla_scheduler || {}
            const badges = [
              { icon: Cpu, label: `AI: ${config.llm?.enabled ? config.llm.provider : 'simulation'}`, on: !!config.llm?.enabled },
              { icon: Mic, label: `Voice: ${config.voice?.enabled ? 'on' : 'off'}`, on: !!config.voice?.enabled },
              { icon: Zap, label: `SLA monitor: ${sched.enabled ? (sched.running ? 'running' : 'idle') : 'off'}`, on: !!sched.enabled },
            ]
            return badges.map(b => (
              <span key={b.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                color: b.on ? 'var(--accent-green)' : 'var(--text-muted)',
              }}>
                <b.icon size={13} /> {b.label}
              </span>
            ))
          })()}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportCsv} title="Download all grievances as CSV">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid-4 mb-6">
        <StatCard
          icon={FileText}
          iconBg="rgba(79, 110, 247, 0.15)"
          iconColor="var(--accent-primary-light)"
          value={overview.total}
          label="Total Grievances"
          change={`${overview.open} open`}
          changeType="neutral"
        />
        <StatCard
          icon={CheckCircle}
          iconBg="rgba(16, 217, 143, 0.15)"
          iconColor="var(--accent-green)"
          value={`${overview.resolution_rate}%`}
          label="Resolution Rate"
          change={`${overview.resolved} resolved`}
          changeType="up"
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="rgba(244, 63, 94, 0.15)"
          iconColor="var(--accent-red)"
          value={overview.escalated}
          label="Escalated"
          change={`${overview.sla_breached} SLA breached`}
          changeType={overview.escalated > 0 ? 'down' : 'up'}
        />
        <StatCard
          icon={Clock}
          iconBg="rgba(245, 158, 11, 0.15)"
          iconColor="var(--accent-secondary)"
          value={`${overview.avg_resolution_hours}h`}
          label="Avg Resolution Time"
          change={`${overview.sla_compliance_rate}% SLA compliance`}
          changeType={overview.sla_compliance_rate > 80 ? 'up' : 'down'}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2 mb-6">
        {/* Trend Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16 }}>7-Day Trend</h3>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: 'var(--accent-primary-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 12, height: 3, background: 'var(--accent-primary)', borderRadius: 2 }} />
                Submitted
              </span>
              <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 12, height: 3, background: 'var(--accent-green)', borderRadius: 2 }} />
                Resolved
              </span>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Line data={trendData} options={{
              ...CHART_OPTIONS,
              plugins: { ...CHART_OPTIONS.plugins, legend: { display: false } },
            }} />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>Status Distribution</h3>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ width: 160, height: 160, flexShrink: 0 }}>
              <Doughnut data={{
                labels: statuses.map(s => s.status),
                datasets: [{
                  data: statuses.map(s => s.count),
                  backgroundColor: [
                    CHART_COLORS.cyan, CHART_COLORS.purple, CHART_COLORS.primary,
                    CHART_COLORS.orange, CHART_COLORS.green, '#4a5578',
                    CHART_COLORS.red, CHART_COLORS.secondary,
                  ],
                  borderWidth: 0,
                  hoverOffset: 4,
                }],
              }} options={{ ...DOUGHNUT_OPTIONS, cutout: '65%' }} />
            </div>
            <div style={{ flex: 1 }}>
              {statuses.map((s, i) => (
                <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.status}</span>
                  <span style={{ fontWeight: 700 }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid-2 mb-6">
        {/* Category Doughnut */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>Grievances by Category</h3>
          <div style={{ height: 260 }}>
            <Doughnut data={categoryData} options={{ ...DOUGHNUT_OPTIONS, cutout: '50%' }} />
          </div>
        </div>

        {/* Severity Doughnut */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>Severity Breakdown</h3>
          <div style={{ height: 160, marginBottom: 20 }}>
            <Doughnut data={severityData} options={{ ...DOUGHNUT_OPTIONS, cutout: '60%' }} />
          </div>
          <div className="grid-2">
            {[
              { label: 'SLA Compliance', value: `${overview.sla_compliance_rate}%`, color: overview.sla_compliance_rate > 80 ? 'var(--accent-green)' : 'var(--accent-red)' },
              { label: 'SLA Breaches', value: overview.sla_breached, color: 'var(--accent-red)' },
              { label: 'Avg Resolution', value: `${overview.avg_resolution_hours}h`, color: 'var(--accent-secondary)' },
              { label: 'Open Cases', value: overview.open, color: 'var(--accent-primary-light)' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Space Grotesk', color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ward Heatmap */}
      {wards.length > 0 && (
        <div className="card mb-6">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>
            <MapPin size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-primary-light)' }} />
            Ward-wise Grievance Volume (Top 10)
          </h3>
          <div style={{ height: 220 }}>
            <Bar data={wardData} options={{
              ...CHART_OPTIONS,
              plugins: { ...CHART_OPTIONS.plugins, legend: { display: false } },
              scales: {
                ...CHART_OPTIONS.scales,
                x: { ...CHART_OPTIONS.scales.x, ticks: { ...CHART_OPTIONS.scales.x.ticks, maxRotation: 30 } },
              },
            }} />
          </div>
        </div>
      )}

      {/* Department Performance */}
      {departments.length > 0 && (
        <div className="card mb-6">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>
            <Building2 size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-cyan)' }} />
            Department Performance
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Resolved</th>
                  <th>Open</th>
                  <th>Escalated</th>
                  <th>Avg Resolution</th>
                  <th>SLA Compliance</th>
                  <th>Officers</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.department_id ?? d.department}>
                    <td style={{ fontWeight: 600 }}>{d.department}</td>
                    <td>{d.total}</td>
                    <td style={{ color: 'var(--accent-green)' }}>{d.resolved}</td>
                    <td>{d.open}</td>
                    <td style={{ color: d.escalated > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{d.escalated}</td>
                    <td>{d.avg_resolution_hours}h</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: d.sla_compliance_rate >= 80 ? 'var(--accent-green)'
                          : d.sla_compliance_rate >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)',
                      }}>
                        {d.sla_compliance_rate}%
                      </span>
                    </td>
                    <td>{d.officer_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Officer Leaderboard */}
      {officers.length > 0 && (
        <div className="card mb-6">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>
            <Users size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-purple)' }} />
            Officer Leaderboard
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Officer</th>
                  <th>Department</th>
                  <th>Assigned</th>
                  <th>Resolved</th>
                  <th>Resolution Rate</th>
                  <th>Avg Time</th>
                  <th>Avg CSAT</th>
                  <th>Load</th>
                </tr>
              </thead>
              <tbody>
                {officers.slice(0, 10).map((o, i) => (
                  <tr key={o.officer_id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{o.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{o.department}</td>
                    <td>{o.total_assigned}</td>
                    <td style={{ color: 'var(--accent-green)' }}>{o.resolved}</td>
                    <td style={{ fontWeight: 700 }}>{o.resolution_rate}%</td>
                    <td>{o.avg_resolution_hours ? `${o.avg_resolution_hours}h` : '—'}</td>
                    <td>{o.avg_csat ? `${o.avg_csat}★` : '—'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                        background: 'var(--bg-secondary)',
                        color: o.current_load > 5 ? 'var(--accent-red)' : 'var(--text-secondary)',
                      }}>
                        {o.current_load}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Performance */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>
          <Activity size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-purple)' }} />
          AI System Performance
        </h3>
        <div className="grid-4">
          {[
            { label: 'Classification Accuracy', value: '91%', desc: 'Avg AI confidence on intake', color: 'var(--accent-cyan)' },
            { label: 'Auto-Routing Rate', value: '98%', desc: 'Grievances routed without human help', color: 'var(--accent-primary-light)' },
            { label: 'Avg Pipeline Time', value: '~1.2s', desc: 'Full AI pipeline execution time', color: 'var(--accent-orange)' },
            { label: 'Human Escalations', value: '4%', desc: 'Low-confidence cases flagged for review', color: 'var(--accent-green)' },
          ].map(m => (
            <div key={m.label} style={{
              padding: 18, background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Space Grotesk', color: m.color, marginBottom: 6 }}>{m.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
