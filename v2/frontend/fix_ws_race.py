import sys

file_path = "src/components/VoiceChatbot.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = "socket.onclose = () => setWs(null);"
replacement = """socket.onclose = () => {
            setWs((currentWs) => {
                if (currentWs === socket) return null;
                return currentWs;
            });
        };"""

content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
