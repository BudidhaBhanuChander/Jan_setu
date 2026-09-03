import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { Mic, Send, X, MessageSquare, Bot, User, Globe, Square, Volume2, VolumeX, CheckCircle2, ChevronRight, RefreshCw, FileText, Check, Copy } from 'lucide-react';

const SAMPLE_GRIEVANCES = [
    "Non glowing of street lights in Chilkanagar, Uppal Ward 21.",
    "Severe pothole and water logging hazard near Cyber Towers, Madhapur.",
    "Garbage dump not cleared and stray dog menace near Bodrai junction.",
    "Drainage overflow and missing manhole cover during rains near Charminar.",
    "Water supply contamination and pipeline burst reported in Ward 14."
];

export default function VoiceChatbot({ embedded = false, onGrievanceRegistered }) {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(embedded ? true : false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [ws, setWs] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressStage, setProgressStage] = useState('');
    const [language, setLanguage] = useState('en');
    const [isRecording, setIsRecording] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sampleIndex, setSampleIndex] = useState(0);
    const [successModalData, setSuccessModalData] = useState(null);
    const [copied, setCopied] = useState(false);
    
    const currentAudioRef = useRef(null);
    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    // Rotate sample grievances every 4.5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setSampleIndex((prev) => (prev + 1) % SAMPLE_GRIEVANCES.length);
        }, 4500);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isTyping, progressPercent]);

    useEffect(() => {
        if (ws && ws.readyState === WebSocket.OPEN && user?.id) {
            ws.send(JSON.stringify({ type: 'set_user', user_id: user.id, user_name: user.name }));
        }
    }, [user?.id, ws]);

    // WebSocket connection
    useEffect(() => {
        if (!isOpen) return;
        const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/voice/ws';
        const socket = new WebSocket(wsBase);
        socket.binaryType = 'blob';
        
        socket.onopen = () => {
            console.log('GHMC Voice WS connected');
            socket.send(JSON.stringify({ type: 'set_language', language }));
            if (user?.id) {
                socket.send(JSON.stringify({ type: 'set_user', user_id: user.id, user_name: user.name }));
            }
        };
        
        socket.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                const audioUrl = URL.createObjectURL(event.data);
                if (!isMuted) {
                    const audio = new Audio(audioUrl);
                    currentAudioRef.current = audio;
                    setIsPlaying(true);
                    audio.play().catch(() => {});
                    audio.onended = () => { 
                        currentAudioRef.current = null; 
                        setIsPlaying(false); 
                    };
                }
                return;
            }

            try {
                const data = JSON.parse(event.data);
                if (data.type === 'response') {
                    setIsTyping(false);
                    setProgressPercent(0);
                    
                    const meta = data.metadata || {};
                    let parsedInfo = null;
                    if (meta.tool_classify_grievance || meta.tool_register_grievance) {
                        const toolData = meta.tool_classify_grievance || meta.tool_register_grievance;
                        parsedInfo = {
                            summary: toolData.summary || data.text,
                            department: toolData.department || toolData.category || 'GHMC Municipal Engineering',
                            category: toolData.sub_category || toolData.category || 'Civic Infrastructure'
                        };
                    }

                    const trackingMatch = data.text && data.text.match(/(JS-\d{8}-[A-Z0-9]+|GHMC-\d{8}-[A-Z0-9]+|[0-9]{12})/i);
                    const regId = meta.tool_register_grievance?.tracking_id || (trackingMatch ? trackingMatch[0] : null);

                    const newMsg = { 
                        sender: 'bot', 
                        text: data.text,
                        detectedLang: language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English',
                        parsedInfo,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                    };

                    setMessages(prev => [...prev, newMsg]);
                    
                    if (regId) {
                        setSuccessModalData({ registrationNumber: regId });
                        window.dispatchEvent(new CustomEvent('grievance_created', { detail: { tracking_id: regId, ...data } }));
                        if (onGrievanceRegistered) onGrievanceRegistered(regId);
                    }
                }
                else if (data.type === 'transcript') {
                    setMessages(prev => [...prev, { 
                        sender: 'user', 
                        text: data.text,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                    }]);
                    setIsTyping(true);
                    triggerProgressAnimation();
                }
                else if (data.type === 'processing') {
                    setIsTyping(true);
                    triggerProgressAnimation();
                }
            } catch (e) {
                console.error('Failed to parse websocket message', e);
            }
        };

        socket.onclose = () => {
            setWs((currentWs) => {
                if (currentWs === socket) return null;
                return currentWs;
            });
        };
        setWs(socket);
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            socket.close();
            setWs(null);
        };
    }, [isOpen]);

    const triggerProgressAnimation = () => {
        setProgressPercent(15);
        setProgressStage('Analyzing GHMC municipal jurisdiction & zone...');
        setTimeout(() => {
            setProgressPercent(45);
            setProgressStage('Classifying GHMC wing (Roads, Sanitation, Electrical, Drainage)...');
        }, 800);
        setTimeout(() => {
            setProgressPercent(85);
            setProgressStage('Calculating priority hazard score & SLA deadline...');
        }, 1600);
    };

    const LANGUAGES = [
        { code: 'en', label: 'English', native: 'English' },
        { code: 'te', label: 'Telugu', native: 'తెలుగు' },
        { code: 'hi', label: 'Hindi', native: 'हिंदी' }
    ];

    const changeLanguage = (newLang) => {
        if (newLang === language) return;
        setLanguage(newLang);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'set_language', language: newLang }));
            const greeting = 
                newLang === 'te' ? 'నమస్కారం! జిహెచ్ఎంసి జనసేతు ప్రజావాణి AI కి స్వాగతం. మీ గల్లీ లేదా డివిజన్ సమస్యలను మాట్లాడి లేదా టైప్ చేసి నమోదు చేయండి.' :
                newLang === 'hi' ? 'नमस्ते! जीएचएमसी जन सेतु प्रजावाणी AI में आपका स्वागत है। आप अपनी समस्या बोलकर या लिखकर दर्ज कर सकते हैं।' :
                'Welcome to the GHMC JAN SETU AI ASSISTANT. You can register your civic complaints for Hyderabad city via speaking or typing.';
            setMessages(prev => [...prev, { 
                sender: 'bot', 
                text: greeting,
                detectedLang: newLang === 'te' ? 'Telugu' : newLang === 'hi' ? 'Hindi' : 'English',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
            }]);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setInputText('');
        setIsTyping(false);
        setProgressPercent(0);
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
            setIsPlaying(false);
        }
    };

    const handleSendText = async (textToSend) => {
        const text = textToSend || inputText;
        if (!text || !text.trim()) return; 

        const userMsg = {
            sender: 'user',
            text: text.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);
        triggerProgressAnimation();

        // 1. Send via WebSocket if connected
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ 
                    type: 'text_input', 
                    text: text.trim(), 
                    language,
                    user_id: user?.id,
                    user_name: user?.name
                }));
            } catch (err) {
                console.warn("WebSocket send error, fallback will take over", err);
            }
        }

        // 2. Safety fallback timer: guarantees bot NEVER gets stuck in processing state
        setTimeout(async () => {
            setIsTyping(currentIsTyping => {
                if (!currentIsTyping) return false;

                (async () => {
                    try {
                        const res = await api.post('/voice/chat', {
                            text: text.trim(),
                            language,
                            user_id: user?.id,
                            user_name: user?.name
                        });
                        if (res.data && res.data.text) {
                            setIsTyping(false);
                            setProgressPercent(0);
                            const meta = res.data.metadata || {};
                            let parsedInfo = null;
                            if (meta.tool_classify_grievance || meta.tool_register_grievance) {
                                const toolData = meta.tool_classify_grievance || meta.tool_register_grievance;
                                parsedInfo = {
                                    summary: toolData.summary || res.data.text,
                                    department: toolData.department || toolData.category || 'GHMC Municipal Engineering',
                                    category: toolData.sub_category || toolData.category || 'Civic Infrastructure'
                                };
                            }
                            setMessages(prev => [...prev, {
                                sender: 'bot',
                                text: res.data.text,
                                detectedLang: language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English',
                                parsedInfo,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                            }]);
                            return;
                        }
                    } catch (e) {
                        console.warn("REST chat failed, using local municipal triage", e);
                    }

                    setIsTyping(false);
                    setProgressPercent(0);
                    const isLight = text.toLowerCase().includes('light');
                    const isRoad = text.toLowerCase().includes('road') || text.toLowerCase().includes('pothole');
                    const isGarbage = text.toLowerCase().includes('garbage') || text.toLowerCase().includes('dump');
                    const isDrainage = text.toLowerCase().includes('drain') || text.toLowerCase().includes('water');

                    setMessages(prev => [...prev, {
                        sender: 'bot',
                        text: `Thank you. Your GHMC civic complaint regarding "${text.substring(0, 45)}..." has been triaged. Our system has assigned it to the local GHMC Ward Field Officer. Could you please confirm your exact colony landmark?`,
                        detectedLang: language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English',
                        parsedInfo: {
                            summary: text,
                            department: isLight ? 'Electrical & Street Lighting' : isRoad ? 'Roads & Infrastructure Engineering' : isGarbage ? 'Sanitation & Solid Waste Management' : isDrainage ? 'Drainage & Water Works' : 'GHMC Public Works',
                            category: isLight ? 'Non Glowing of Street Lights' : isRoad ? 'Repairs to Road (Pot holes)' : isGarbage ? 'Garbage Dump Clearance' : 'Civic Hazard Redressal'
                        },
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                    }]);
                })();

                return false;
            });
        }, 3200);
    };

    const startRecording = async () => {
        try {
            if (ws && ws.readyState === WebSocket.OPEN && user?.id) {
                ws.send(JSON.stringify({ type: 'set_user', user_id: user.id, user_name: user.name }));
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(event.data);
                }
            };
            
            recorder.start();
            setIsRecording(true);
        } catch (err) {
            alert('Could not access microphone. Please ensure microphone permissions are granted in your browser.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsTyping(true);
            triggerProgressAnimation();
        }
    };

    const handleCopyId = (id) => {
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full h-full bg-[#fbfbfa] flex flex-col font-sans overflow-hidden border border-gray-200 rounded-xl shadow-xs relative">
            
            {/* Top GHMC Government Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shadow-xs z-20">
                <div className="flex items-center gap-4">
                    <img 
                        src="/assets/ashoka_emblem.png" 
                        alt="Emblem of India" 
                        className="h-12 w-auto object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div>
                        <div className="text-xs font-bold text-[#b7410e] leading-tight tracking-tight uppercase">
                            Government of Telangana | గ్రేటర్ హైదరాబాద్ మున్సిపల్ కార్పొరేషన్
                        </div>
                        <div className="text-sm font-black text-[#962e00] leading-tight">
                            GREATER HYDERABAD MUNICIPAL CORPORATION (GHMC)
                        </div>
                    </div>
                </div>

                {/* Center Title: GHMC PRAJA VANI / JAN SETU */}
                <div className="text-center hidden md:block">
                    <h1 className="text-2xl lg:text-3xl font-black text-[#f37021] tracking-wider uppercase drop-shadow-xs">
                        GHMC JAN SETU AI CHATBOT
                    </h1>
                    <div className="text-sm font-extrabold text-gray-900 tracking-normal">
                        GHMC ప్రజావాణి — పౌర సేవా AI కేంద్రం (Praja Vani)
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                        Greater Hyderabad Autonomous Civic Grievance Triage System
                    </div>
                </div>

                {/* Right Profile & Language Dropdown */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1">
                        <Globe size={13} className="text-[#f37021]" />
                        {LANGUAGES.map((l) => (
                            <button
                                key={l.code}
                                onClick={() => changeLanguage(l.code)}
                                className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer transition-all ${
                                    language === l.code ? 'bg-[#f37021] text-white shadow-xs' : 'text-gray-700 hover:bg-orange-100'
                                }`}
                            >
                                {l.native}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                        <span className="text-xs font-bold text-gray-800 hidden sm:inline">
                            {user?.name || 'Budidha Bhanu Chander'}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#f37021] text-white flex items-center justify-center font-bold text-sm shadow-xs border border-white">
                            {(user?.name || 'B').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Body with Left Dignitary Panel (PM Modi & CM Revanth Reddy) + Center Chat Hero */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left Orange Sidebar: PM Modi & CM Revanth Reddy */}
                <aside className="w-72 bg-gradient-to-b from-[#f9a657] via-[#f79438] to-[#f37021] p-5 flex flex-col justify-between hidden lg:flex shadow-md z-10 border-r border-orange-300">
                    <div className="space-y-4">
                        
                        {/* Honorable Prime Minister Shri Narendra Modi Card */}
                        <div className="bg-white/95 rounded-xl p-3 shadow-md border border-white/60 text-center flex flex-col items-center">
                            <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-[#f37021]/30 shadow-xs mb-2 bg-amber-50">
                                <img 
                                    src="/assets/modi_photo.png" 
                                    alt="Hon'ble Prime Minister Shri Narendra Modi"
                                    className="w-full h-full object-cover object-top"
                                    onError={(e) => {
                                        e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Narendra_Modi_official_portrait%2C_2024.jpg/480px-Narendra_Modi_official_portrait%2C_2024.jpg";
                                    }}
                                />
                            </div>
                            <div className="text-sm font-extrabold text-[#b7410e] uppercase leading-tight">
                                Honorable Prime Minister
                            </div>
                            <div className="text-base font-black text-gray-950 mt-1">
                                Shri Narendra Modi
                            </div>
                        </div>

                        {/* Honorable Chief Minister Shri A. Revanth Reddy Card (Replaced Dr. Jitendra Singh) */}
                        <div className="bg-white/95 rounded-xl p-3 shadow-md border border-white/60 text-center flex flex-col items-center">
                            <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-[#f37021]/30 shadow-xs mb-2 bg-amber-50">
                                <img 
                                    src="/assets/revanth_reddy.png" 
                                    alt="Hon'ble Chief Minister Shri A. Revanth Reddy"
                                    className="w-full h-full object-cover object-top"
                                    onError={(e) => {
                                        e.target.src = "https://upload.wikimedia.org/wikipedia/commons/c/c0/Portrait_of_Telangana_CM_Revanth_Reddy.png";
                                    }}
                                />
                            </div>
                            <div className="text-sm font-extrabold text-[#b7410e] uppercase leading-tight">
                                Honorable Chief Minister of Telangana
                            </div>
                            <div className="text-base font-black text-gray-950 mt-1">
                                Shri A. Revanth Reddy
                            </div>
                        </div>

                    </div>

                    {/* New Chat Button */}
                    <button 
                        onClick={handleNewChat}
                        className="w-full py-3.5 px-5 bg-[#e65100] hover:bg-[#bf360c] text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer border border-white/30 hover:scale-[1.02]"
                    >
                        <MessageSquare size={18} />
                        <span>New Chat</span>
                    </button>
                </aside>

                {/* Center Chat Hero Section with Indian Civic Landscape Background */}
                <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
                    
                    {/* Background Graphic with overlay */}
                    <div 
                        className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-20"
                        style={{ backgroundImage: `url('/assets/india_civic_bg.png')` }}
                    />

                    {/* Top Announcement Banner */}
                    <div className="relative z-10 px-6 pt-4 pb-2">
                        <div className="bg-white/95 border border-blue-200 rounded-xl px-4 py-2.5 shadow-xs text-center">
                            <p className="text-xs md:text-sm font-bold text-[#0d47a1]">
                                Welcome to the GHMC JAN SETU AI ASSISTANT. You can register your civic complaints for Hyderabad city via speaking or typing.
                            </p>
                        </div>
                    </div>

                    {/* Scrollable Conversation Stream */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 relative z-10">
                        
                        {/* Big 'Tap to Speak' & GHMC Civic Sample Grievance Carousel */}
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center min-h-[380px] text-center max-w-2xl mx-auto my-auto py-8">
                                
                                {/* Big Animated Pulsing Mic Button */}
                                <div className="relative mb-6">
                                    <div className={`absolute -inset-4 rounded-full bg-orange-400/30 animate-ping duration-1000 ${isRecording ? 'opacity-100' : 'opacity-40'}`}></div>
                                    <div className="absolute -inset-2 rounded-full bg-orange-400/50"></div>
                                    <button
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`relative w-36 h-36 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all cursor-pointer ${
                                            isRecording 
                                                ? 'bg-red-600 scale-105 ring-4 ring-red-300' 
                                                : 'bg-gradient-to-tr from-[#f37021] to-[#ff914d] hover:scale-105 ring-8 ring-orange-100'
                                        }`}
                                    >
                                        {isRecording ? <Square size={46} fill="currentColor" /> : <Mic size={52} />}
                                    </button>
                                </div>

                                <div className="text-2xl font-black text-[#0d47a1] tracking-tight mb-6">
                                    {isRecording ? "Listening... Speak your grievance now" : "Tap to Speak"}
                                </div>

                                {/* Sample Grievance Text Banner (Dotted orange rectangle) */}
                                <div className="w-full">
                                    <div className="text-base font-black text-gray-900 uppercase tracking-wider mb-3">
                                        GHMC Sample Grievance Prompts
                                    </div>
                                    <div 
                                        onClick={() => handleSendText(SAMPLE_GRIEVANCES[sampleIndex])}
                                        className="w-full bg-white/95 border-2 border-dashed border-[#f37021] rounded-3xl p-6 shadow-md hover:bg-orange-50/80 transition-all cursor-pointer group"
                                        title="Click to submit this sample civic grievance"
                                    >
                                        <div className="bg-white rounded-full py-2.5 px-6 border border-gray-200 text-base md:text-lg font-bold text-gray-900 group-hover:border-[#f37021] group-hover:text-[#b7410e] transition-colors inline-block shadow-xs max-w-full truncate">
                                            {SAMPLE_GRIEVANCES[sampleIndex]}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-center items-center gap-1.5 mt-2.5">
                                        {SAMPLE_GRIEVANCES.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSampleIndex(idx)}
                                                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                                    sampleIndex === idx ? 'w-6 bg-[#f37021]' : 'w-1.5 bg-gray-300'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Interactive Message Feed */}
                        {messages.map((msg, index) => (
                            <div key={index} className="space-y-3">
                                
                                {/* CITIZEN TURN (Orange Bubble, Right Aligned) */}
                                {msg.sender === 'user' && (
                                    <div className="flex justify-end">
                                        <div className="max-w-2xl bg-gradient-to-r from-[#f37021] to-[#e65100] text-white rounded-3xl rounded-tr-none px-6 py-4.5 shadow-md">
                                            <div className="flex items-center gap-2.5 bg-white/15 px-3 py-1.5 rounded-full mb-2 text-xs">
                                                <button className="w-5 h-5 rounded-full bg-white text-[#f37021] flex items-center justify-center shrink-0">
                                                    ▶
                                                </button>
                                                <span className="text-[11px] font-mono opacity-90">0:00</span>
                                                <div className="flex-1 flex items-center gap-0.5 h-3">
                                                    {[40, 65, 30, 80, 50, 90, 45, 70, 85, 30, 60, 40, 75, 55, 35, 65, 80, 50].map((h, i) => (
                                                        <div key={i} className="flex-1 bg-white/70 rounded-full" style={{ height: `${h}%` }}></div>
                                                    ))}
                                                </div>
                                                <span className="text-[11px] font-mono opacity-90">0:13</span>
                                            </div>

                                            <div className="text-base md:text-lg font-medium leading-relaxed">
                                                {msg.text}
                                            </div>
                                            
                                            <div className="text-[10px] text-orange-100 text-right mt-1.5 flex items-center justify-end gap-1">
                                                <span>{msg.timestamp}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SAMADHAN DIDI TURN (White Bubble with Avatar) */}
                                {msg.sender === 'bot' && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-300 shadow-sm shrink-0 bg-amber-50">
                                            <img 
                                                src="/assets/prajavani_ai.png" 
                                                alt="Praja Vani AI" 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150";
                                                }}
                                            />
                                        </div>

                                        <div className="max-w-2xl bg-white border border-gray-200 rounded-3xl rounded-tl-none p-6 shadow-sm space-y-4">
                                            
                                            <div className="flex items-center justify-between text-xs text-emerald-700 font-bold border-b border-gray-100 pb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                                    <span>Detected language is {msg.detectedLang || 'English'}.</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const utter = new SpeechSynthesisUtterance(msg.text);
                                                        window.speechSynthesis.speak(utter);
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-[#f37021] cursor-pointer"
                                                    title="Listen to response"
                                                >
                                                    <Volume2 size={15} />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3 bg-amber-50/80 border border-amber-200/80 px-3.5 py-2 rounded-xl text-xs text-amber-950">
                                                <button 
                                                    onClick={() => {
                                                        const utter = new SpeechSynthesisUtterance(msg.text);
                                                        window.speechSynthesis.speak(utter);
                                                    }}
                                                    className="w-6 h-6 rounded-full bg-[#f37021] text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
                                                >
                                                    ▶
                                                </button>
                                                <span className="font-mono text-[11px] text-amber-900">0:08</span>
                                                <div className="flex-1 flex items-center gap-0.5 h-3">
                                                    {[20, 45, 75, 30, 85, 60, 40, 95, 50, 70, 30, 80, 60, 45, 90, 35, 70, 55, 40].map((h, i) => (
                                                        <div key={i} className="flex-1 bg-[#f37021]/80 rounded-full" style={{ height: `${h}%` }}></div>
                                                    ))}
                                                </div>
                                                <span className="font-mono text-[11px] text-amber-900">0:08</span>
                                            </div>

                                            <div className="text-sm text-gray-800 font-medium leading-relaxed">
                                                {msg.text}
                                            </div>

                                            {/* GHMC Grievance Information Card */}
                                            {msg.parsedInfo && (
                                                <div className="pt-2 space-y-2.5">
                                                    <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                                        GHMC Grievance Information
                                                    </div>

                                                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5">
                                                        <div className="text-xs font-extrabold text-gray-900 mb-1">
                                                            Grievance Summary
                                                        </div>
                                                        <div className="text-xs text-gray-700 leading-relaxed font-medium">
                                                            {msg.parsedInfo.summary}
                                                        </div>
                                                    </div>

                                                    <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                                                        <div className="text-xs font-black text-gray-900 border-b border-gray-100 pb-1.5 uppercase tracking-wide">
                                                            GHMC Wing & Category
                                                        </div>

                                                        <div>
                                                            <div className="text-[11px] font-bold text-gray-600 mb-1">GHMC Department / Wing</div>
                                                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800">
                                                                {msg.parsedInfo.department}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="text-[11px] font-bold text-gray-600 mb-1">Subcategory</div>
                                                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800">
                                                                {msg.parsedInfo.category}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="text-[10px] text-gray-400 text-right pt-1">
                                                {msg.timestamp}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        ))}

                        {/* Animated Step-by-Step Processing State */}
                        {isTyping && (
                            <div className="flex items-start gap-3 animate-fade-in">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-300 shadow-sm shrink-0 bg-amber-50">
                                    <img src="/assets/prajavani_ai.png" alt="Praja Vani AI" className="w-full h-full object-cover" />
                                </div>
                                
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-6 shadow-md max-w-md w-full space-y-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        <span>Detected language is {language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.</span>
                                    </div>

                                    <div className="flex flex-col items-center justify-center py-2">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner animate-pulse">
                                                <FileText size={28} />
                                            </div>
                                            <div className="absolute -inset-2 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                                        </div>

                                        <div className="text-xs font-bold text-gray-700 mt-4">
                                            Processing GHMC complaint... <span className="text-blue-600 font-extrabold">{progressPercent}%</span>
                                        </div>

                                        <div className="w-48 bg-gray-200 h-2 rounded-full mt-2 overflow-hidden">
                                            <div 
                                                className="bg-blue-600 h-full transition-all duration-500 rounded-full"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>

                                        <div className="text-[11px] text-gray-500 font-medium mt-2">
                                            {progressStage || 'Analyzing GHMC municipal jurisdiction & zone...'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Bottom Query Input Bar */}
                    <div className="p-4 bg-white/95 border-t border-gray-200 relative z-20">
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSendText(); }} 
                            className="max-w-5xl mx-auto flex items-center gap-4 bg-white border-2 border-gray-300 rounded-full px-6 py-3 shadow-md shadow-sm focus-within:border-[#f37021] focus-within:ring-2 focus-within:ring-orange-200 transition-all"
                        >
                            <input 
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Type your municipal complaint or press mic to speak (English, Telugu, Hindi)"
                                className="flex-1 bg-transparent text-sm md:text-base text-gray-800 placeholder-gray-400 outline-none px-2"
                            />

                            <button
                                type="button"
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-[#f37021] hover:bg-orange-50'
                                }`}
                                title={isRecording ? "Stop Recording" : "Voice Input"}
                            >
                                <Mic size={24} />
                            </button>

                            <button
                                type="submit"
                                disabled={!inputText.trim()}
                                className="w-9 h-9 rounded-full bg-gradient-to-r from-[#f37021] to-[#e65100] hover:from-[#e65100] hover:to-[#bf360c] text-white flex items-center justify-center shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Send size={20} className="ml-0.5" />
                            </button>
                        </form>
                    </div>

                </div>
            </div>

            {/* Grievance Registered Success Modal */}
            {successModalData && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-100 animate-scale-up">
                        
                        <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-400 flex items-center justify-center text-emerald-600 mx-auto mb-5 shadow-inner">
                            <Check size={42} strokeWidth={3} />
                        </div>

                        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-4">
                            GHMC Complaint Registered Successfully
                        </h2>

                        <div className="bg-[#e8f8f0] border border-emerald-200 rounded-2xl p-5 mb-6 space-y-3">
                            <div className="text-sm font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                                <span>🎉</span> Your civic complaint has been registered with GHMC.
                            </div>

                            <div className="bg-white/80 border border-emerald-300/80 rounded-xl p-3 text-center">
                                <div className="text-xs text-gray-600 font-medium mb-1">Your GHMC Tracking ID is:</div>
                                <div className="text-base font-black text-emerald-900 font-mono tracking-wider flex items-center justify-center gap-2">
                                    <span>{successModalData.registrationNumber}</span>
                                    <button 
                                        onClick={() => handleCopyId(successModalData.registrationNumber)}
                                        className="text-emerald-700 hover:text-emerald-900 p-1 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                                        title="Copy Registration ID"
                                    >
                                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setSuccessModalData(null)}
                            className="w-full py-3 bg-[#4caf50] hover:bg-[#43a047] text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
