import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic, MicOff, Volume2, VolumeX, RotateCcw, Radio,
  Brain, GitBranch, Clock, MessageCircle, Zap, ChevronDown, Info, Send, Square
} from 'lucide-react'

// ─── Agent metadata
const AGENT_META = {
  intake:       { label: 'Intake Agent',       color: 'var(--accent-cyan)',          icon: Brain },
  routing:      { label: 'Routing Agent',      color: 'var(--accent-primary-light)', icon: GitBranch },
  tracking:     { label: 'Tracking Agent',     color: 'var(--accent-orange)',        icon: Clock },
  communication:{ label: 'Comm Agent',         color: 'var(--accent-green)',         icon: MessageCircle },
  orchestrator: { label: 'Orchestrator',       color: 'var(--accent-purple)',        icon: Zap },
}

// ─── Waveform animation
function Waveform({ active, color = 'var(--accent-primary)' }) {
  const bars = 28
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 3, height: 48, padding: '0 8px',
    }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 99,
            background: color,
            opacity: active ? 0.85 : 0.2,
            height: active
              ? `${20 + Math.sin((Date.now() / 180 + i * 0.8)) * 14}%`
              : '20%',
            transition: active ? 'none' : 'height 0.5s ease',
            animation: active ? `wave-bar-${i % 4} ${0.5 + (i % 5) * 0.1}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes wave-bar-0 { from { height: 15%; } to { height: 85%; } }
        @keyframes wave-bar-1 { from { height: 25%; } to { height: 65%; } }
        @keyframes wave-bar-2 { from { height: 10%; } to { height: 75%; } }
        @keyframes wave-bar-3 { from { height: 30%; } to { height: 90%; } }
      `}</style>
    </div>
  )
}

// ─── Conversation bubble
function Bubble({ turn }) {
  const isUser = turn.role === 'user'
  const agentInfo = AGENT_META[turn.agent] || null

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 12,
      marginBottom: 20,
      alignItems: 'flex-start',
      animation: 'bubble-in 0.3s ease',
    }}>
      <style>{`
        @keyframes bubble-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isUser
          ? 'rgba(79, 110, 247, 0.2)'
          : agentInfo ? `${agentInfo.color}20` : 'rgba(167,139,250,0.2)',
        border: `1px solid ${isUser ? 'rgba(79,110,247,0.3)' : agentInfo ? `${agentInfo.color}40` : 'rgba(167,139,250,0.3)'}`,
        fontSize: 14,
      }}>
        {isUser ? '🎤' : '🤖'}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Agent badge */}
        {!isUser && agentInfo && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: agentInfo.color,
            alignSelf: 'flex-start',
          }}>
            <agentInfo.icon size={11} />
            {agentInfo.label}
          </div>
        )}
        {isUser && turn.confidence != null && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
            Confidence: {Math.round(turn.confidence * 100)}%
          </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: '12px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'rgba(79, 110, 247, 0.15)'
            : 'var(--bg-card)',
          border: isUser
            ? '1px solid rgba(79, 110, 247, 0.25)'
            : '1px solid var(--border-color)',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--text-primary)',
        }}>
          {turn.text}
        </div>

        {/* Metadata chips */}
        {!isUser && turn.metadata && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            {turn.metadata.category && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(79,110,247,0.1)', color: 'var(--accent-primary-light)', border: '1px solid rgba(79,110,247,0.2)' }}>
                📂 {turn.metadata.category}
              </span>
            )}
            {turn.metadata.severity && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(244,63,94,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(244,63,94,0.2)' }}>
                ⚡ {turn.metadata.severity}
              </span>
            )}
            {turn.metadata.tracking_id && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,217,143,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(16,217,143,0.2)', fontFamily: 'Space Grotesk', fontWeight: 700 }}>
                🎫 {turn.metadata.tracking_id}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Status pill
function StatusPill({ status, step }) {
  const STATUS_CONFIG = {
    idle:          { label: 'Ready to listen', color: 'var(--text-secondary)', bg: 'var(--bg-secondary)' },
    recording:     { label: 'Listening...', color: 'var(--accent-red)', bg: 'rgba(244,63,94,0.1)' },
    transcribing:  { label: 'Transcribing speech...', color: 'var(--accent-cyan)', bg: 'rgba(34,211,238,0.1)' },
    thinking:      { label: 'AI Agents processing...', color: 'var(--accent-purple)', bg: 'rgba(167,139,250,0.1)' },
    speaking:      { label: 'Generating voice response...', color: 'var(--accent-orange)', bg: 'rgba(251,146,60,0.1)' },
    playing:       { label: 'Playing response...', color: 'var(--accent-green)', bg: 'rgba(16,217,143,0.1)' },
    error:         { label: 'Connection error', color: 'var(--accent-red)', bg: 'rgba(244,63,94,0.1)' },
    connecting:    { label: 'Connecting to voice agent...', color: 'var(--accent-secondary)', bg: 'rgba(245,158,11,0.1)' },
  }
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle
  const isAnimated = ['recording', 'transcribing', 'thinking', 'speaking', 'playing', 'connecting'].includes(status)

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 14px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
      fontSize: 13, fontWeight: 500,
      border: `1px solid ${cfg.color}30`,
      transition: 'all 0.3s ease',
    }}>
      {isAnimated && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: cfg.color,
          animation: 'pulse-status 1.2s ease-in-out infinite',
        }} />
      )}
      <style>{`@keyframes pulse-status { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.3)} }`}</style>
      {cfg.label}
    </div>
  )
}

// ─── Main Voice Agent Page
export default function VoiceAgent({ showToast }) {
  const [status, setStatus] = useState('idle')
  const [connected, setConnected] = useState(false)
  const [recording, setRecording] = useState(false)
  const [muted, setMuted] = useState(false)
  const [conversation, setConversation] = useState([])
  const [liveTranscript, setLiveTranscript] = useState('')
  const [currentStep, setCurrentStep] = useState('')
  const [textInput, setTextInput] = useState('')

  const wsRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioRef = useRef(null)
  const bottomRef = useRef(null)
  const micStreamRef = useRef(null)
  const mutedRef = useRef(muted)

  const stopPlayback = useCallback(() => {
    if (audioRef.current && status === 'playing') {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setStatus('idle')
    }
  }, [status])

  const handleSendText = useCallback(() => {
    if (!textInput.trim() || !connected) return
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text_input', text: textInput }))
      setTextInput('')
      setStatus('thinking') // Will be updated by server anyway
    }
  }, [textInput, connected])

  // Keep a ref in sync so the (long-lived) WebSocket handler always sees the
  // current mute state instead of a stale closure value.
  useEffect(() => { mutedRef.current = muted }, [muted])

  // ── Auto-scroll conversation
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, liveTranscript])

  // ── Resolve the WebSocket URL from the current page origin so it works
  //    behind the Vite dev proxy and in production without code changes.
  const getWsUrl = () => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/api/voice/ws`
  }

  // ── Connect WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return
    setStatus('connecting')

    const ws = new WebSocket(getWsUrl())
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setStatus('idle')
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // TTS audio received
        if (mutedRef.current) return
        const blob = new Blob([event.data], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        if (!audioRef.current) audioRef.current = new Audio()
        audioRef.current.src = url
        audioRef.current.onplay = () => setStatus('playing')
        audioRef.current.onended = () => {
          setStatus('idle')
          URL.revokeObjectURL(url)
        }
        audioRef.current.onerror = () => setStatus('idle')
        audioRef.current.play().catch(() => setStatus('idle'))
      } else {
        // JSON control message
        try {
          const msg = JSON.parse(event.data)
          handleServerMessage(msg)
        } catch {}
      }
    }

    ws.onclose = () => {
      setConnected(false)
      setStatus('idle')
    }

    ws.onerror = () => {
      setStatus('error')
      showToast('Voice agent connection failed. Is the backend running?', 'error')
    }
  }, [showToast])

  const handleServerMessage = (msg) => {
    switch (msg.type) {
      case 'connected':
        break

      case 'processing':
        setCurrentStep(msg.step)
        setStatus(msg.step)
        break

      case 'transcript':
        setLiveTranscript(msg.text)
        setConversation(c => [...c, {
          role: 'user',
          text: msg.text,
          confidence: msg.confidence,
          ts: Date.now(),
        }])
        setLiveTranscript('')
        break

      case 'response':
        setConversation(c => [...c, {
          role: 'agent',
          text: msg.text,
          agent: msg.agent_used,
          metadata: msg.metadata || {},
          ts: Date.now(),
        }])
        break

      case 'audio_ready':
        setStatus('speaking')
        break

      case 'no_speech':
        setStatus('idle')
        showToast(msg.message, 'info')
        break

      case 'error':
        setStatus('error')
        showToast(`Voice error: ${msg.message}`, 'error')
        setTimeout(() => setStatus('idle'), 2000)
        break

      case 'pong':
        break

      default:
        break
    }
  }

  // ── Start recording
  const startRecording = async () => {
    if (!connected) {
      showToast('Voice agent not connected. Click Connect first.', 'error')
      return
    }
    if (status === 'recording') return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      })
      micStreamRef.current = stream
      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)  // collect chunks every 100ms
      setRecording(true)
      setStatus('recording')
    } catch (err) {
      showToast('Microphone access denied. Please allow microphone access.', 'error')
    }
  }

  // ── Stop recording and send
  const stopRecording = () => {
    if (!recording || !mediaRecorderRef.current) return
    setRecording(false)

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      audioChunksRef.current = []

      if (blob.size < 500) {
        setStatus('idle')
        return
      }

      // Send to WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const buffer = await blob.arrayBuffer()
        wsRef.current.send(buffer)
        setStatus('transcribing')
      }

      // Stop mic tracks
      micStreamRef.current?.getTracks().forEach(t => t.stop())
    }

    mediaRecorderRef.current.stop()
  }

  // ── Reset conversation
  const resetConversation = () => {
    setConversation([])
    setLiveTranscript('')
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reset' }))
    }
    showToast('Conversation reset', 'info')
  }

  // ── Disconnect
  const disconnect = () => {
    wsRef.current?.close()
    setConnected(false)
    setStatus('idle')
  }

  // ── Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      audioRef.current?.pause()
    }
  }, [])

  const isProcessing = ['transcribing', 'thinking', 'speaking', 'playing'].includes(status)
  const canRecord = connected && !isProcessing

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }}>

      {/* ── Hero Banner */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(79,110,247,0.10) 50%, rgba(34,211,238,0.08) 100%)',
        border: '1px solid rgba(167,139,250,0.25)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        overflow: 'hidden',
      }}>
        {/* Glowing orbs */}
        <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 60, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, position: 'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #a78bfa, #4f6ef7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(167,139,250,0.4)',
          }}>
            <Radio size={26} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, margin: 0 }}>Jan Setu Voice Agent</h2>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              Powered by Deepgram nova-3 STT · aura-2-asteria-en TTS
            </div>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 640, marginBottom: 16, position: 'relative' }}>
          Speak naturally to report civic grievances or track your complaints. Our AI pipeline —
          <span style={{ color: 'var(--accent-cyan)' }}> Intake</span> →
          <span style={{ color: 'var(--accent-primary-light)' }}> Routing</span> →
          <span style={{ color: 'var(--accent-orange)' }}> Tracking</span> →
          <span style={{ color: 'var(--accent-green)' }}> Communication</span> — processes your voice in real time.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
          {[
            { icon: '🎙️', text: 'Push-to-talk recording' },
            { icon: '🧠', text: 'Deepgram nova-3 STT' },
            { icon: '🗣️', text: 'Natural TTS response' },
            { icon: '🤖', text: '4 AI agents pipeline' },
            { icon: '📋', text: 'Auto-register complaints' },
          ].map(f => (
            <span key={f.text} style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 99,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
            }}>
              {f.icon} {f.text}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Conversation */}
        <div>
          {/* Conversation Panel */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            minHeight: 480,
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(13,21,39,0.6)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--accent-green)' : 'var(--accent-red)', boxShadow: connected ? '0 0 8px var(--accent-green)' : 'none', animation: connected ? 'pulse-green 2s infinite' : 'none' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Voice Conversation</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({conversation.length} turns)</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={resetConversation}
                  title="Reset conversation"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: muted ? 'rgba(244,63,94,0.15)' : 'rgba(16,217,143,0.1)', color: muted ? 'var(--accent-red)' : 'var(--accent-green)', border: '1px solid', borderColor: muted ? 'rgba(244,63,94,0.3)' : 'rgba(16,217,143,0.3)' }}
                  onClick={() => setMuted(!muted)}
                  title={muted ? 'Unmute' : 'Mute audio'}
                >
                  {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  {muted ? 'Muted' : 'Audio On'}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', minHeight: 380, maxHeight: 520 }}>
              {conversation.length === 0 && !liveTranscript ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                    background: 'rgba(167,139,250,0.1)',
                    border: '1px solid rgba(167,139,250,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Mic size={30} color="var(--accent-purple)" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {connected ? 'Ready to listen' : 'Connect to start'}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {connected
                      ? 'Press and hold the microphone button to speak'
                      : 'Click "Connect Voice Agent" to begin'}
                  </div>
                </div>
              ) : (
                <>
                  {conversation.map((turn, i) => <Bubble key={i} turn={turn} />)}
                  {liveTranscript && (
                    <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
                      <div style={{
                        padding: '12px 16px', borderRadius: '18px 18px 4px 18px',
                        background: 'rgba(79,110,247,0.08)',
                        border: '1px dashed rgba(79,110,247,0.3)',
                        fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic',
                        maxWidth: '72%',
                      }}>
                        {liveTranscript}
                        <span style={{ animation: 'blink 1s step-end infinite', marginLeft: 2 }}>|</span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Status bar */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
              background: 'rgba(13,21,39,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <StatusPill status={status} step={currentStep} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {status === 'playing' && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={stopPlayback}
                    title="Stop reading aloud"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    <Square size={12} style={{ fill: 'currentColor' }} />
                    Stop Audio
                  </button>
                )}
                
                {isProcessing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Processing...
                  </div>
                )}
              </div>
            </div>

            {/* Text Input Area */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex', gap: 12, alignItems: 'center'
            }}>
              <input 
                type="text" 
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !isProcessing) handleSendText() }}
                placeholder={connected ? (isProcessing ? "Agent is processing..." : "Type your message here...") : "Connect to start typing..."}
                disabled={!connected || isProcessing}
                style={{
                  flex: 1,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                  opacity: (!connected || isProcessing) ? 0.5 : 1
                }}
              />
              <button
                onClick={handleSendText}
                disabled={!connected || isProcessing || !textInput.trim()}
                style={{
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (!connected || isProcessing || !textInput.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (!connected || isProcessing || !textInput.trim()) ? 0.5 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* ── Waveform + Mic Button */}
          <div style={{
            marginTop: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            {/* Waveform */}
            <Waveform
              active={recording || status === 'playing'}
              color={recording ? 'var(--accent-red)' : status === 'playing' ? 'var(--accent-green)' : 'var(--accent-primary)'}
            />

            {/* Main Mic Button */}
            <div style={{ position: 'relative' }}>
              {recording && (
                <div style={{
                  position: 'absolute', inset: -12,
                  borderRadius: '50%',
                  border: '2px solid rgba(244,63,94,0.4)',
                  animation: 'mic-ring 1.5s ease-out infinite',
                }} />
              )}
              <style>{`
                @keyframes mic-ring {
                  0%   { transform: scale(1); opacity: 0.8; }
                  100% { transform: scale(1.6); opacity: 0; }
                }
                @keyframes blink { 50% { opacity: 0; } }
              `}</style>

              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={e => { e.preventDefault(); startRecording() }}
                onTouchEnd={e => { e.preventDefault(); stopRecording() }}
                disabled={!canRecord}
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  border: 'none', cursor: canRecord ? 'pointer' : 'not-allowed',
                  background: recording
                    ? 'linear-gradient(135deg, #f43f5e, #fb923c)'
                    : canRecord
                      ? 'linear-gradient(135deg, #4f6ef7, #a78bfa)'
                      : 'rgba(74,85,120,0.3)',
                  boxShadow: recording
                    ? '0 0 40px rgba(244,63,94,0.5), 0 8px 30px rgba(244,63,94,0.3)'
                    : canRecord
                      ? '0 0 30px rgba(79,110,247,0.4), 0 8px 24px rgba(79,110,247,0.25)'
                      : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: recording ? 'scale(0.95)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  opacity: !canRecord ? 0.5 : 1,
                }}
                aria-label="Hold to speak"
              >
                {recording ? <MicOff size={28} color="white" /> : <Mic size={28} color="white" />}
              </button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
              {!connected ? 'Connect voice agent to start' :
               recording ? '🔴 Recording — Release to send' :
               isProcessing ? `Processing: ${currentStep}...` :
               'Hold the button and speak your complaint'}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Controls + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Connection Card */}
          <div className="card">
            <h4 style={{ marginBottom: 16, fontSize: 15 }}>Voice Agent Connection</h4>
            {!connected ? (
              <button
                className="btn btn-primary w-full"
                onClick={connect}
                disabled={status === 'connecting'}
              >
                {status === 'connecting'
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Connecting...</>
                  : <><Radio size={15} /> Connect Voice Agent</>}
              </button>
            ) : (
              <button className="btn btn-danger w-full" onClick={disconnect}>
                <MicOff size={15} /> Disconnect
              </button>
            )}
            <div style={{
              marginTop: 14,
              padding: '10px 12px',
              background: connected ? 'rgba(16,217,143,0.06)' : 'rgba(244,63,94,0.06)',
              border: `1px solid ${connected ? 'rgba(16,217,143,0.2)' : 'rgba(244,63,94,0.15)'}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              color: connected ? 'var(--accent-green)' : 'var(--text-muted)',
            }}>
              {connected
                ? '✓ Connected to Jan Setu Voice Agent via WebSocket'
                : 'Disconnected — click Connect to start'}
            </div>
          </div>

          {/* Pipeline Info */}
          <div className="card">
            <h4 style={{ marginBottom: 14, fontSize: 15 }}>AI Pipeline</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { step: '1', label: 'Deepgram STT', detail: 'nova-3 model', color: 'var(--accent-cyan)', icon: '🎤' },
                { step: '2', label: 'Intent Engine', detail: 'NLP + Jan Setu AI', color: 'var(--accent-purple)', icon: '🧠' },
                { step: '3', label: 'AI Agents', detail: 'Intake / Routing / Tracking', color: 'var(--accent-primary-light)', icon: '🤖' },
                { step: '4', label: 'Deepgram TTS', detail: 'aura-2-asteria-en', color: 'var(--accent-green)', icon: '🗣️' },
              ].map(s => (
                <div key={s.step} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `3px solid ${s.color}`,
                }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.detail}</div>
                  </div>
                  <span style={{
                    marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
                    background: `${s.color}20`, color: s.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>{s.step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample phrases */}
          <div className="card">
            <h4 style={{ marginBottom: 14, fontSize: 15 }}>
              <Info size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent-secondary)' }} />
              Try saying...
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'There is a big pothole on the main road near metro station',
                'Garbage has not been collected for 5 days',
                'The street light near my colony is not working',
                'Track my complaint JS followed by your tracking code',
                'Which department handles water supply issues?',
              ].map((phrase, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12, color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  cursor: 'default',
                }}>
                  "{phrase}"
                </div>
              ))}
            </div>
          </div>

          {/* Deepgram badge */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(13, 21, 39, 0.8)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            🔊 Powered by <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Deepgram</span> Voice AI<br />
            STT: nova-3 · TTS: aura-2-asteria-en<br />
            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>developers.deepgram.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}
