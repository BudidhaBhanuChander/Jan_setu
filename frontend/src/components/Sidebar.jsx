import React from 'react'
import {
  LayoutDashboard, FileText, Users, BarChart3,
  Bot, Shield, ChevronRight, Cpu, Mic
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'citizen', label: 'Citizen Portal', icon: FileText, section: 'Citizen' },
  { id: 'voice', label: 'Voice Agent', icon: Mic, section: 'Citizen' },
  { id: 'officer', label: 'Officer Dashboard', icon: Users, section: 'Operations' },
  { id: 'admin', label: 'Admin Analytics', icon: BarChart3, section: 'Operations' },
  { id: 'agents', label: 'AI Agent Monitor', icon: Bot, section: 'Intelligence' },
]

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-badge">
          <div className="logo-icon">
            <Shield size={18} color="white" />
          </div>
          <div className="logo-text">
            <span className="logo-title">Jan Setu</span>
            <span className="logo-subtitle">AI Grievance System</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {['Citizen', 'Operations', 'Intelligence'].map(section => {
          const items = NAV_ITEMS.filter(i => i.section === section)
          return (
            <div key={section}>
              <div className="sidebar-section">{section}</div>
              {items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`nav-item ${activePage === id ? 'active' : ''}`}
                  onClick={() => setActivePage(id)}
                >
                  <Icon className="nav-icon" size={16} />
                  {label}
                  {activePage === id && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                </button>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="ai-status-pill">
          <div className="pulse-dot" />
          <Cpu size={12} />
          <span>4 Agents Active</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          GHMC-Modelled Architecture
        </div>
      </div>
    </aside>
  )
}
