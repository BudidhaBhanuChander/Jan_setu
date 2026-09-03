import React from 'react'
import { RefreshCw, Plus } from 'lucide-react'

export default function Header({ title, subtitle, activePage, setActivePage }) {
  return (
    <div className="header">
      <div className="header-left">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-right">
        {activePage === 'admin' && (
          <button className="header-btn" onClick={() => window.location.reload()}>
            <RefreshCw size={14} />
            Refresh
          </button>
        )}
        {activePage === 'citizen' && (
          <button
            className="header-btn primary"
            onClick={() => window.dispatchEvent(new CustomEvent('jansetu:new-complaint'))}
          >
            <Plus size={14} />
            New Complaint
          </button>
        )}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--gradient-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: 'white',
          cursor: 'pointer', boxShadow: 'var(--shadow-glow)',
        }}>
          GH
        </div>
      </div>
    </div>
  )
}
