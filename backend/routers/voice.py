"""
routers/voice.py — Voice Agent WebSocket endpoint for Jan Setu
Bridges the browser microphone → Deepgram STT → Jan Setu AI → Deepgram TTS pipeline.
"""
import asyncio
import uuid
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from database import get_db
from agents.voice_agent import (
    transcribe_audio, generate_speech,
    process_voice_intent, clear_session, voice_available
)
from agents.translations import get_message
from config import settings

router = APIRouter(prefix="/api/voice", tags=["Voice Agent"])


@router.websocket("/ws")
async def voice_websocket(websocket: WebSocket):
    """
    WebSocket protocol:
        Client → Server:
            bytes  — raw audio blob (WebM/Opus from MediaRecorder)
            text   — JSON control messages {"type": "ping"} / {"type": "reset"}

        Server → Client:
            {"type": "connected",    "session_id": "..."}
            {"type": "processing",   "step": "transcribing" | "thinking" | "speaking"}
            {"type": "transcript",   "text": "...", "confidence": 0.95}
            {"type": "response",     "text": "...", "agent_used": "intake", "metadata": {...}}
            {"type": "audio_ready"}
            bytes  — MP3 audio for TTS playback
            {"type": "no_speech",    "message": "..."}
            {"type": "error",        "message": "..."}
            {"type": "pong"}
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())

    # If voice is not configured, tell the client and close cleanly.
    if not voice_available():
        await websocket.send_json({
            "type": "error",
            "message": "Voice agent is disabled: no DEEPGRAM_API_KEY configured on the server.",
        })
        await websocket.close()
        return

    db = next(get_db())
    loop = asyncio.get_event_loop()

    print(f"[Voice WS] Session {session_id[:8]} connected")

    # Send welcome + greeting audio
    await websocket.send_json({
        "type": "connected",
        "session_id": session_id,
        "message": "Voice Agent ready",
    })

    try:
        # Generate and send welcome audio
        welcome_msg = get_message("WELCOME", "en")
        welcome_audio = await loop.run_in_executor(None, lambda: generate_speech(welcome_msg))
        await websocket.send_json({
            "type": "response",
            "text": welcome_msg,
            "agent_used": "communication",
            "metadata": {"intent": "greeting"},
        })
        if welcome_audio:
            await websocket.send_json({"type": "audio_ready"})
            await websocket.send_bytes(welcome_audio)

        # Main message loop
        while True:
            message = await websocket.receive()

            # ── Binary audio payload ──
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]
                if len(audio_bytes) < 100:
                    # Too small, likely noise
                    await websocket.send_json({"type": "no_speech", "message": "Audio too short. Please speak clearly."})
                    continue

                # Step 1: Transcribe
                await websocket.send_json({"type": "processing", "step": "transcribing"})
                transcript, confidence, lang = await loop.run_in_executor(
                    None, lambda: transcribe_audio(audio_bytes)
                )

                if not transcript:
                    await websocket.send_json({
                        "type": "no_speech",
                        "message": "No speech detected. Please speak closer to your microphone.",
                    })
                    continue

                # Send transcript immediately for real-time display
                await websocket.send_json({
                    "type": "transcript",
                    "text": transcript,
                    "confidence": round(confidence, 3),
                })

                # Step 2: Process intent with Jan Setu AI
                await websocket.send_json({"type": "processing", "step": "thinking"})
                response_text, agent_used, metadata = await loop.run_in_executor(
                    None,
                    lambda: process_voice_intent(transcript, session_id, db, lang),
                )

                # Send text response
                await websocket.send_json({
                    "type": "response",
                    "text": response_text,
                    "agent_used": agent_used,
                    "metadata": metadata,
                    "transcript": transcript,
                })

                # Step 3: TTS
                await websocket.send_json({"type": "processing", "step": "speaking"})
                audio_response = await loop.run_in_executor(
                    None, lambda: generate_speech(response_text, lang)
                )

                if audio_response:
                    await websocket.send_json({"type": "audio_ready"})
                    await websocket.send_bytes(audio_response)
                else:
                    await websocket.send_json({"type": "audio_error", "message": "TTS generation failed"})

            # ── Text control messages ──
            elif "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type", "")

                    if msg_type == "ping":
                        await websocket.send_json({"type": "pong"})

                    elif msg_type == "reset":
                        clear_session(session_id)
                        session_id = str(uuid.uuid4())
                        await websocket.send_json({
                            "type": "reset_ack",
                            "session_id": session_id,
                        })
                        
                    elif msg_type == "text_input":
                        user_text = data.get("text", "").strip()
                        if not user_text:
                            continue
                            
                        lang = "en"  # Default for text input, LLM can still reply in requested language
                        
                        # Add to conversation history immediately
                        await websocket.send_json({
                            "type": "transcript",
                            "text": user_text,
                            "confidence": 1.0,
                        })
                        
                        # Process intent with Jan Setu AI
                        await websocket.send_json({"type": "processing", "step": "thinking"})
                        response_text, agent_used, metadata = await loop.run_in_executor(
                            None,
                            lambda: process_voice_intent(user_text, session_id, db, lang),
                        )

                        # Send text response
                        await websocket.send_json({
                            "type": "response",
                            "text": response_text,
                            "agent_used": agent_used,
                            "metadata": metadata,
                            "transcript": user_text,
                        })

                        # TTS
                        await websocket.send_json({"type": "processing", "step": "speaking"})
                        audio_response = await loop.run_in_executor(
                            None, lambda: generate_speech(response_text, lang)
                        )

                        if audio_response:
                            await websocket.send_json({"type": "audio_ready"})
                            await websocket.send_bytes(audio_response)
                        else:
                            await websocket.send_json({"type": "audio_error", "message": "TTS generation failed"})

                except json.JSONDecodeError:
                    pass

    except WebSocketDisconnect:
        print(f"[Voice WS] Session {session_id[:8]} disconnected")
    except Exception as e:
        print(f"[Voice WS] Error in session {session_id[:8]}: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        clear_session(session_id)
        db.close()


@router.get("/status")
def voice_status():
    """Check voice agent configuration and Deepgram connectivity."""
    available = voice_available()
    return {
        "status": "active" if available else "disabled",
        "available": available,
        "reason": None if available else "DEEPGRAM_API_KEY not configured on the server.",
        "stt_model": settings.STT_MODEL,
        "tts_model": settings.TTS_MODEL,
        "supported_languages": ["en", "hi", "te", "ur"],
        "capabilities": [
            "Submit grievance by voice",
            "Track complaint status by voice",
            "Multilingual support",
            "Multi-turn conversation",
            "AI classification pipeline",
        ],
        "pipeline": "Deepgram STT → Jan Setu AI Agents → Deepgram TTS",
    }
