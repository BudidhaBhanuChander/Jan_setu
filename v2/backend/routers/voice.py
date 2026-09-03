import json
import uuid
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from database import get_db
from config import settings
from agents.voice_agent import (
    voice_available, 
    transcribe_audio, 
    generate_speech, 
    process_voice_intent, 
    clear_session, 
    get_message,
    get_session
)

router = APIRouter(prefix="/voice", tags=["voice"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())

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

    await websocket.send_json({
        "type": "connected",
        "session_id": session_id,
        "message": "Voice Agent ready",
    })

    try:
        session_data = get_session(session_id)
        current_lang = session_data.get('language', 'en')
        
        welcome_msg = get_message("WELCOME", current_lang)
        welcome_audio = await loop.run_in_executor(None, lambda: generate_speech(welcome_msg, current_lang))
        await websocket.send_json({
            "type": "response",
            "text": welcome_msg,
            "agent_used": "communication",
            "metadata": {"intent": "greeting"},
        })
        if welcome_audio:
            await websocket.send_json({"type": "audio_ready"})
            await websocket.send_bytes(welcome_audio)

        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
            current_lang = get_session(session_id).get('language', 'en')

            # Binary audio payload
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]
                if len(audio_bytes) < 100:
                    await websocket.send_json({"type": "no_speech", "message": "Audio too short. Please speak clearly."})
                    continue

                await websocket.send_json({"type": "processing", "step": "transcribing"})
                
                # Pass explicit language if it's not English (or even if it is)
                explicit = current_lang if current_lang != 'auto' else None
                transcript, confidence, detected_lang = await loop.run_in_executor(
                    None, lambda: transcribe_audio(audio_bytes, explicit)
                )
                
                lang_to_use = explicit if explicit else detected_lang

                if not transcript:
                    await websocket.send_json({
                        "type": "no_speech",
                        "message": "No speech detected. Please speak closer to your microphone.",
                    })
                    continue

                await websocket.send_json({
                    "type": "transcript",
                    "text": transcript,
                    "confidence": round(confidence, 3),
                })

                await websocket.send_json({"type": "processing", "step": "thinking"})
                response_text, agent_used, metadata = await loop.run_in_executor(
                    None,
                    lambda: process_voice_intent(transcript, session_id, db, lang_to_use),
                )

                await websocket.send_json({
                    "type": "response",
                    "text": response_text,
                    "agent_used": agent_used,
                    "metadata": metadata,
                    "transcript": transcript,
                })

                await websocket.send_json({"type": "processing", "step": "speaking"})
                audio_response = await loop.run_in_executor(
                    None, lambda: generate_speech(response_text, lang_to_use)
                )

                if audio_response:
                    await websocket.send_json({"type": "audio_ready"})
                    await websocket.send_bytes(audio_response)
                else:
                    await websocket.send_json({"type": "audio_error", "message": "TTS generation failed"})

            # Text control messages
            elif "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type", "")

                    if msg_type == "ping":
                        await websocket.send_json({"type": "pong"})

                    elif msg_type == "set_user":
                        session_data = get_session(session_id)
                        if data.get("user_id"):
                            session_data['user_id'] = data.get("user_id")
                        if data.get("user_name"):
                            session_data['user_name'] = data.get("user_name")
                        await websocket.send_json({"type": "user_updated", "user_id": session_data.get('user_id')})

                    elif msg_type == "set_language":
                        new_lang = data.get("language", "en")
                        session_data = get_session(session_id)
                        session_data['language'] = new_lang
                        await websocket.send_json({"type": "language_updated", "language": new_lang})

                    elif msg_type == "reset":
                        clear_session(session_id)
                        session_id = str(uuid.uuid4())
                        await websocket.send_json({"type": "reset_ack", "session_id": session_id})
                        
                    elif msg_type == "text_input":
                        user_text = data.get("text", "").strip()
                        if not user_text:
                            continue
                            
                        # Update session user details if provided in payload
                        session_data = get_session(session_id)
                        if data.get("user_id"):
                            session_data['user_id'] = data.get("user_id")
                        if data.get("user_name"):
                            session_data['user_name'] = data.get("user_name")

                        # Default to session language instead of hardcoded 'en'
                        lang = data.get("language") or session_data.get('language', 'en')
                        
                        await websocket.send_json({"type": "transcript", "text": user_text, "confidence": 1.0})
                        
                        await websocket.send_json({"type": "processing", "step": "thinking"})
                        response_text, agent_used, metadata = await loop.run_in_executor(
                            None,
                            lambda: process_voice_intent(user_text, session_id, db, lang),
                        )

                        await websocket.send_json({
                            "type": "response",
                            "text": response_text,
                            "agent_used": agent_used,
                            "metadata": metadata,
                            "transcript": user_text,
                        })

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
    available = voice_available()
    return {
        "status": "active" if available else "disabled",
        "available": available,
        "supported_languages": ["en", "hi", "te", "ur"],
    }


