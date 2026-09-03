import React from 'react'
import { Brain, GitBranch, Clock, MessageCircle, CheckCircle2 } from 'lucide-react'

const AGENTS = [
  { key: 'intake', label: 'Intake & Classify', icon: Brain, color: 'var(--accent-cyan)' },
  { key: 'routing', label: 'Route & Assign', icon: GitBranch, color: 'var(--accent-primary-light)' },
  { key: 'tracking', label: 'Track & Escalate', icon: Clock, color: 'var(--accent-orange)' },
  { key: 'communication', label: 'Communicate', icon: MessageCircle, color: 'var(--accent-green)' },
]

export default function AgentPipeline({ events = [] }) {
  // Map event agent_name to pipeline step
  const completedAgents = new Set(events.map(e => e.agent_name).filter(Boolean))

  return (
    <div className="agent-pipeline">
      {AGENTS.map((agent, idx) => {
        const isCompleted = completedAgents.has(agent.key)
        const Icon = agent.icon
        return (
          <div
            key={agent.key}
            className={`agent-step ${isCompleted ? 'completed' : ''}`}
          >
            <div className="agent-icon-wrap">
              <Icon size={16} color={isCompleted ? agent.color : 'var(--text-muted)'} />
            </div>
            <div className="agent-label">{agent.label}</div>
          </div>
        )
      })}
    </div>
  )
}
