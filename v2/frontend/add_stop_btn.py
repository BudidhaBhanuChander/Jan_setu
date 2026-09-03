import sys

file_path = "src/components/VoiceChatbot.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add isPlaying state
state_target = "const [isMuted, setIsMuted] = useState(false);"
state_replacement = "const [isMuted, setIsMuted] = useState(false);\n    const [isPlaying, setIsPlaying] = useState(false);"
content = content.replace(state_target, state_replacement)

# Update audio play block
audio_target = """                if (!isMuted) {
                    const audio = new Audio(audioUrl);
                    currentAudioRef.current = audio;
                    audio.play();
                    audio.onended = () => { currentAudioRef.current = null; };
                }"""

audio_replacement = """                if (!isMuted) {
                    const audio = new Audio(audioUrl);
                    currentAudioRef.current = audio;
                    setIsPlaying(true);
                    audio.play();
                    audio.onended = () => { 
                        currentAudioRef.current = null; 
                        setIsPlaying(false); 
                    };
                }"""
content = content.replace(audio_target, audio_replacement)

# Update mute toggle to also stop playing audio and clear state
mute_target = "if (!isMuted && currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }"
mute_replacement = "if (!isMuted && currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; setIsPlaying(false); }"
content = content.replace(mute_target, mute_replacement)

# Add Stop Audio button UI near the bottom of the chat area
ui_target = """                        <div ref={messagesEndRef} />"""
ui_replacement = """                        {isPlaying && (
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
                        <div ref={messagesEndRef} />"""
content = content.replace(ui_target, ui_replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
