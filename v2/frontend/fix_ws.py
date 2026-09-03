import sys

file_path = "src/components/VoiceChatbot.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """    useEffect(() => {
        if (!isOpen || ws) return;
        const socket = new WebSocket('ws://localhost:8000/voice/ws');"""

replacement = """    useEffect(() => {
        if (!isOpen) return;
        const socket = new WebSocket('ws://localhost:8000/voice/ws');"""

content = content.replace(target, replacement)

target2 = """        socket.onclose = () => setWs(null);
        setWs(socket);
        return () => {
            if (isRecording) stopRecording();
            socket.close();
        };
    }, [isOpen]);"""

replacement2 = """        socket.onclose = () => setWs(null);
        setWs(socket);
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            socket.close();
            setWs(null);
        };
    }, [isOpen]);"""

content = content.replace(target2, replacement2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
