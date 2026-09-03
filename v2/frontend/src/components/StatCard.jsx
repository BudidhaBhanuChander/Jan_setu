import React from 'react'

export default function StatCard({ icon: Icon, iconBg, iconColor, value, label, change, changeType }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div className="stat-value" style={{ color: iconColor }}>{value}</div>
      <div className="stat-label">{label}</div>
      {change && (
        <div className={`stat-change ${changeType || 'neutral'}`}>
          {change}
        </div>
      )}
    </div>
  )
}
