import React from 'react'
import { Menu, RefreshCw, Plus, Bell } from 'lucide-react'

export default function Header({ title, subtitle, activePage, setActivePage, onMenuClick }) {
  return (
    <div className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuClick} aria-label="Open navigation"><Menu size={20} /></button>
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
        <button className="notification-btn" aria-label="Notifications"><Bell size={17} /><span /></button>
        <div className="profile-avatar" title="GHMC User">
          GH
        </div>
      </div>
    </div>
  )
}
