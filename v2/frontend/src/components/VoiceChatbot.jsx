import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Mic, Send, X, MessageSquare, Bot, User, Globe, Square, Volume2, VolumeX } from 'lucide-react';

export default function VoiceChatbot({ embedded = false }) {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(embedded ? true : false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [ws, setWs] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [language, setLanguage] = useState('en');
    const [isRecording, setIsRecording] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const currentAudioRef = useRef(null);
    
    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioContextRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isTyping]);

    useEffect(() => {
        if (ws && ws.readyState === WebSocket.OPEN && user?.id) {
            ws.send(JSON.stringify({ type: 'set_user', user_id: user.id, user_name: user.name }));
        }
    }, [user?.id, ws]);

    useEffect(() => {
        if (!isOpen) return;
        const socket = new WebSocket('ws://localhost:8000/voice/ws');
        socket.binaryType = 'blob'; // Important for receiving audio
        
        socket.onopen = () => {
            console.log('Voice WS connected');
            socket.send(JSON.stringify({ type: 'set_language', language }));
            if (user?.id) {
                socket.send(JSON.stringify({ type: 'set_user', user_id: user.id, user_name: user.name }));
            }
        };
        
        socket.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                // Received audio bytes from Jan Setu
                const audioUrl = URL.createObjectURL(event.data);
                if (!isMuted) {
                    const audio = new Audio(audioUrl);
                    currentAudioRef.current = audio;
                    setIsPlaying(true);
                    audio.play();
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
                    setMessages(prev => [...prev, { sender: 'bot', text: data.text }]);
                    
                    // If a grievance was created, trigger live dashboard update
                    if (data.metadata?.tool_register_grievance || (data.text && data.text.includes('JS-'))) {
                        window.dispatchEvent(new CustomEvent('grievance_created', { detail: data }));
                    }
                }
                else if (data.type === 'transcript') {
                    setMessages(prev => [...prev, { sender: 'user', text: data.text }]);
                    setIsTyping(true);
                }
                else if (data.type === 'processing') {
                    setIsTyping(true);
                }
            } catch (e) {
                console.error("Failed to parse websocket message", e);
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

    const LANGUAGES = [
        { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
        { code: 'hi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
        { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' }
    ];

    const changeLanguage = (newLang) => {
        if (newLang === language) return;
        setLanguage(newLang);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'set_language', language: newLang }));
            const greeting = 
                newLang === 'hi' ? 'नमस्ते! भाषा हिंदी में बदल दी गई है। मैं आपकी क्या मदद कर सकता हूँ?' :
                newLang === 'te' ? 'నమస్కారం! భాష తెలుగులోకి మార్చబడింది. నేను మీకు ఎలా సహాయపడగలను?' :
                'Hello! Language switched to English. How can I assist you today?';
            setMessages(prev => [...prev, { sender: 'bot', text: greeting }]);
        }
    };

    const handleSendText = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return; 
        if (!ws || ws.readyState !== WebSocket.OPEN) { 
            alert("Connecting to AI... please try again in a moment."); 
            return; 
        }
        ws.send(JSON.stringify({ 
            type: 'text_input', 
            text: inputText, 
            language,
            user_id: user?.id,
            user_name: user?.name
        }));
        setInputText('');
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
            alert('Could not access microphone. Please ensure microphone permissions are granted.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    return (
        <>
            {!isOpen && !embedded && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-8 right-8 w-16 h-16 bg-primary hover:bg-blue-800 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-50 focus:outline-hidden focus:ring-4 focus:ring-blue-300"
                >
                    <MessageSquare size={28} />
                </button>
            )}

            {isOpen && (
                <div className={embedded ? "w-full h-full bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden border border-gray-200" : "fixed bottom-8 right-8 w-[420px] h-[620px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200 animate-fade-in"}>
                    {/* Header */}
                    <div className="bg-primary px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md z-10">
                        <div className="flex items-center gap-3 text-white">
                            <div className="relative">
                                <div className="bg-white/20 p-2.5 rounded-xl text-white">
                                    <Bot size={20} />
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-primary rounded-full"></span>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base leading-tight text-white">Jan Setu AI</h3>
                                <p className="text-[11px] text-blue-200 mt-0.5">Voice & Chat Civic Assistant</p>
                            </div>
                        </div>

                        {/* Prominent Language Selector & Voice Toggle */}
                        <div className="flex items-center gap-2">
                            {/* Language Pills */}
                            <div className="bg-blue-950/50 p-1 rounded-xl flex items-center gap-1 border border-white/15 shadow-inner">
                                <Globe size={13} className="text-blue-300 ml-1.5 mr-0.5 shrink-0" />
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => changeLanguage(lang.code)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                            language === lang.code
                                                ? 'bg-white text-primary shadow-xs ring-1 ring-black/5 font-extrabold'
                                                : 'text-blue-100/90 hover:text-white hover:bg-white/10'
                                        }`}
                                        title={`Switch to ${lang.label} (${lang.native})`}
                                    >
                                        <span>{lang.native}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Voice Mute Toggle */}
                            <button 
                                type="button"
                                onClick={() => { 
                                    setIsMuted(!isMuted); 
                                    if (!isMuted && currentAudioRef.current) { 
                                        currentAudioRef.current.pause(); 
                                        currentAudioRef.current = null; 
                                        setIsPlaying(false); 
                                    } 
                                }} 
                                className={`p-2 rounded-xl transition-all border cursor-pointer ${
                                    isMuted 
                                        ? 'bg-red-500/20 text-red-200 border-red-400/30 hover:bg-red-500/30' 
                                        : 'bg-white/15 text-white border-white/15 hover:bg-white/25'
                                }`} 
                                title={isMuted ? "Unmute Audio" : "Mute Audio"}
                            >
                                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>

                            {!embedded && (
                                <button 
                                    type="button"
                                    onClick={() => setIsOpen(false)} 
                                    className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors focus:outline-hidden cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-50 flex flex-col gap-4 relative">
                        <div className="text-center text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Secure Connection Established</div>
                        
                        {messages.length === 0 && !isTyping && (
                             <div className="flex justify-start">
                                 <div className="flex gap-3 max-w-[85%]">
                                     <div className="w-8 h-8 rounded-full bg-primary text-white flex-shrink-0 flex items-center justify-center mt-1 shadow-sm"><Bot size={16}/></div>
                                     <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm text-sm text-gray-800">
                                         Hello! I am Jan Setu Voice Assistant. You can type or speak to me in English, Hindi, or Telugu.
                                     </div>
                                 </div>
                             </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 shadow-sm ${msg.sender === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-primary text-white'}`}>
                                        {msg.sender === 'user' ? <User size={16}/> : <Bot size={16}/>}
                                    </div>
                                    <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                        msg.sender === 'user' 
                                        ? 'bg-primary text-white rounded-tr-none' 
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="flex gap-3 max-w-[85%]">
                                    <div className="w-8 h-8 rounded-full bg-primary text-white flex-shrink-0 flex items-center justify-center mt-1 shadow-sm"><Bot size={16}/></div>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isPlaying && (
                            <div className="flex justify-center mt-2">
                                <button 
                                    onClick={() => {
                                        if (currentAudioRef.current) {
                                            currentAudioRef.current.pause();
                                            currentAudioRef.current = null;
                                            setIsPlaying(false);
                                        }
                                    }}
                                    className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Square size={12} fill="currentColor" /> Stop AI Voice
                                </button>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                        
                        {isRecording && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 animate-pulse border border-red-200">
                                <span className="w-3 h-3 bg-red-600 rounded-full"></span>
                                Listening...
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendText} className="p-4 bg-white border-t border-gray-100 flex gap-3 items-center">
                        {isRecording ? (
                            <button type="button" onClick={stopRecording} className="w-12 h-12 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors focus:outline-none shadow-inner border border-red-200">
                                <Square size={18} fill="currentColor" />
                            </button>
                        ) : (
                            <button type="button" onClick={startRecording} className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-primary flex items-center justify-center transition-colors focus:outline-none">
                                <Mic size={22} />
                            </button>
                        )}
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-100 border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all text-gray-800 outline-none"
                        />
                        <button type="submit" disabled={!inputText.trim()} className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-blue-800 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                            <Send size={18} className="ml-1" />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}




