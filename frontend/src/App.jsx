import React, { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import CitizenPortal from './pages/CitizenPortal'
import OfficerDashboard from './pages/OfficerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AgentMonitor from './pages/AgentMonitor'
import VoiceAgent from './pages/VoiceAgent'
import Toast from './components/Toast'

export const ToastContext = React.createContext()

export default function App() {
  const [activePage, setActivePage] = useState('citizen')
  const [toast, setToast] = useState(null)
  const [navOpen, setNavOpen] = useState(false)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const pages = {
    citizen: { title: 'Citizen Portal', subtitle: 'Submit & track your grievances', component: CitizenPortal },
    voice:   { title: 'Voice Agent', subtitle: 'Speak to report or track grievances — Powered by Deepgram', component: VoiceAgent },
    officer: { title: 'Officer Dashboard', subtitle: 'Manage assigned grievances', component: OfficerDashboard },
    admin:   { title: 'Admin Analytics', subtitle: 'City-wide insights & performance', component: AdminDashboard },
    agents:  { title: 'AI Agent Monitor', subtitle: 'Live agent decisions & audit trail', component: AgentMonitor },
  }

  const { title, subtitle, component: PageComponent } = pages[activePage] || pages.citizen

  return (
    <ToastContext.Provider value={showToast}>
      <div className="app-layout">
        <Sidebar activePage={activePage} setActivePage={setActivePage} isOpen={navOpen} onClose={() => setNavOpen(false)} />
        {navOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
        <div className="main-content">
          <Header title={title} subtitle={subtitle} activePage={activePage} setActivePage={setActivePage} onMenuClick={() => setNavOpen(true)} />
          <div className="page-content">
            <PageComponent showToast={showToast} />
          </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </ToastContext.Provider>
  )
}
