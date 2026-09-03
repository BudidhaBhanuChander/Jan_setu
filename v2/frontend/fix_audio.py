import sys

file_path = "src/components/VoiceChatbot.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace audio play
target_audio = """                const audioUrl = URL.createObjectURL(event.data);
                const audio = new Audio(audioUrl);
                audio.play();"""

replacement_audio = """                const audioUrl = URL.createObjectURL(event.data);
                if (!isMuted) {
                    const audio = new Audio(audioUrl);
                    currentAudioRef.current = audio;
                    audio.play();
                    audio.onended = () => { currentAudioRef.current = null; };
                }"""

content = content.replace(target_audio, replacement_audio)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
