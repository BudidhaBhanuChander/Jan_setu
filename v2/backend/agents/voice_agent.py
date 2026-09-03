"""
voice_agent.py — Deepgram-powered Voice Agent for Jan Setu (LLM Rewrite)
"""
from typing import Optional
from agents.translations import get_message
from config import settings

# ─────────────────────────────────────────────
# Deepgram client — imported lazily and optionally.
# ─────────────────────────────────────────────
dg_client = None
_dg_import_error: Optional[str] = None

if settings.DEEPGRAM_API_KEY:
    try:
        from deepgram import DeepgramClient
        dg_client = DeepgramClient(api_key=settings.DEEPGRAM_API_KEY)
    except Exception as e:  # pragma: no cover - depends on optional dep
        _dg_import_error = str(e)
        print(f"[Voice Agent] Deepgram unavailable: {e}")
else:
    print("[Voice Agent] DEEPGRAM_API_KEY not set — voice features disabled.")

def voice_available() -> bool:
    """True only when the Deepgram client is ready to use."""
    return dg_client is not None


# ─────────────────────────────────────────────
# Deepgram STT — Transcribe audio bytes
# ─────────────────────────────────────────────
def transcribe_audio(audio_bytes: bytes, explicit_lang: str = None) -> tuple[str, float, str]:
    """
    Transcribe audio bytes using Deepgram nova-3 model.
    Returns (transcript, confidence, language_code) tuple.
    """
    if dg_client is None:
        return "", 0.0, "en"
    
    import requests
    try:
        url = f"https://api.deepgram.com/v1/listen?model={settings.STT_MODEL}&detect_language=true" if not explicit_lang else f"https://api.deepgram.com/v1/listen?model={settings.STT_MODEL}&language={explicit_lang}"
        headers = {
            "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
            "Content-Type": "audio/webm"
        }
        
        response = requests.post(url, headers=headers, data=audio_bytes, timeout=15)
        response.raise_for_status()
        
        data = response.json()
        channels = data.get("results", {}).get("channels", [])
        
        if channels and channels[0].get("alternatives"):
            alt = channels[0]["alternatives"][0]
            transcript = alt.get("transcript", "").strip()
            confidence = alt.get("confidence", 0.0)
            
            # Extract language
            lang = channels[0].get("detected_language", "en")
                
            return transcript, float(confidence), lang
    except Exception as e:
        print(f"[Voice Agent] STT error: {e}")
    return "", 0.0, "en"


# ─────────────────────────────────────────────
# Deepgram / gTTS TTS — Generate audio from text
# ─────────────────────────────────────────────
def generate_speech(text: str, lang: str = "en") -> bytes:
    """
    Generate speech from text. Uses Deepgram for English, gTTS for Hindi/Telugu.
    Returns MP3 bytes (browser-playable), or b"" if TTS is unavailable.
    """
    if lang in ["hi", "te"]:
        try:
            from gtts import gTTS
            import io
            tts = gTTS(text=text, lang=lang)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            return fp.getvalue()
        except Exception as e:
            print(f"[Voice Agent] gTTS error: {e}")
            lang = "en"  # Fallback to Deepgram if gTTS fails

    if dg_client is None:
        return b""

    try:
        response_generator = dg_client.speak.v1.audio.generate(
            text=text,
            model=settings.TTS_MODEL,
        )
        return b"".join(response_generator)
    except Exception as e:
        print(f"[Voice Agent] TTS error: {e}")
        return b""


# ─────────────────────────────────────────────
# Session Management
# ─────────────────────────────────────────────
_sessions: dict[str, dict] = {}

def get_session(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {
            'messages': [],  # Full conversation history for LLM
            'language': 'en',
            'turn_count': 0,
        }
    return _sessions[session_id]

def clear_session(session_id: str):
    _sessions.pop(session_id, None)


# ─────────────────────────────────────────────
# System Prompt
# ─────────────────────────────────────────────
SYSTEM_PROMPT = '''You are Jan Setu, an AI-powered grievance redressal voice assistant for GHMC (Greater Hyderabad Municipal Corporation). You help citizens:

1. **File civic complaints** — potholes, garbage, water supply issues, street lights, stray animals, drainage, sanitation, building issues
2. **Track existing complaints** by their tracking ID (format: JS-YYYYMMDD-XXXXXX) or when the citizen asks for the status of a complaint mentioned earlier in the conversation
3. **Provide information** about which department handles what type of issue

When a citizen reports an issue with an issue description and location (e.g. 'स्थान ...' or mentioning a street/colony):
- IMMEDIATELY invoke the `register_grievance` tool. Do NOT ask unnecessary clarifying questions if the core issue and area/location are present.
- If the user is logged in, their name is known and you do NOT need to ask for their name.
- Always retain all context across conversation turns. If details were provided in earlier turns, combine them and register.

When the citizen asks about the status of a complaint (e.g. "मैं ऊपर दिए गए शिकायत की स्थिति जानना चाहता हूँ" or "track my complaint"), use the `track_complaint` tool with the tracking ID from history.

IMPORTANT RULES:
- Be empathetic, professional, and concise
- Keep responses SHORT (2-3 sentences max) since they will be spoken aloud
- If the citizen speaks Hindi or Telugu, respond in the SAME language (Devanagari for Hindi, Telugu script for Telugu)
- When greeting, briefly explain what you can do
- CRITICAL: Do NOT output raw XML or `<tool_call>` tags in your text response. You MUST use the native JSON function calling format exclusively.
'''

# ─────────────────────────────────────────────
# Tool Definitions (for OpenAI function calling format)
# ─────────────────────────────────────────────
TOOLS = [
    {
        'type': 'function',
        'function': {
            'name': 'classify_grievance',
            'description': 'Classify a citizen complaint into category, sub-category, and severity. Call this when the citizen describes an issue.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'description': {'type': 'string', 'description': 'The citizen\'s complaint description'},
                },
                'required': ['description'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'register_grievance',
            'description': 'Register a new grievance in the system. Call this once you have the issue description and location.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'description': {'type': 'string', 'description': 'Full complaint description'},
                    'location': {'type': 'string', 'description': 'Location/area of the issue'},
                    'citizen_name': {'type': 'string', 'description': 'Citizen name (optional, defaults to logged in citizen)'},
                    'language': {'type': 'string', 'enum': ['en', 'hi', 'te'], 'description': 'Language of the conversation'},
                },
                'required': ['description', 'location', 'language'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'track_complaint',
            'description': 'Look up the status of an existing complaint by its tracking ID or from recent conversation context.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'tracking_id': {'type': 'string', 'description': 'The complaint tracking ID (format: JS-YYYYMMDD-XXXXXX) if known, or empty string to use context'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'check_duplicate',
            'description': 'Check if a similar complaint already exists in the same area.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'description': {'type': 'string', 'description': 'Complaint description'},
                    'location': {'type': 'string', 'description': 'Location of the issue'},
                },
                'required': ['description'],
            },
        },
    },
]

# ─────────────────────────────────────────────
# Tool Execution Functions
# ─────────────────────────────────────────────
def _execute_tool(tool_name: str, args: dict, db, session_id: str = "") -> str:
    """Execute a tool call and return the result as a string for the LLM."""
    import json
    import re
    try:
        if tool_name == 'classify_grievance':
            from agents import intake_agent
            result = intake_agent.run(args.get('description', ''), 'en', db)
            return json.dumps({
                'category': result.get('category', 'General'),
                'sub_category': result.get('sub_category', 'General'),
                'severity': result.get('severity', 'MEDIUM'),
                'sentiment': result.get('sentiment', 'NEUTRAL'),
                'confidence': result.get('confidence', 0.9),
                'duplicate_info': result.get('duplicate_info'),
            }, ensure_ascii=False)

        elif tool_name == 'register_grievance':
            from orchestrator import process_new_grievance
            session = get_session(session_id) if session_id else {}
            user_id = session.get('user_id')
            c_name = args.get('citizen_name') or session.get('user_name') or 'Citizen'
            if c_name.lower() in ['anonymous', 'citizen'] and session.get('user_name'):
                c_name = session.get('user_name')
                
            g = process_new_grievance(
                raw_text=args.get('description', ''),
                language=args.get('language', 'en'),
                location_text=args.get('location', ''),
                ward_id=None,
                citizen_name=c_name,
                citizen_phone='',
                citizen_email='',
                channel='IVR',
                db=db,
                citizen_user_id=user_id,
            )
            return json.dumps({
                'success': True,
                'tracking_id': g.tracking_id,
                'category': g.category,
                'sub_category': g.sub_category,
                'severity': g.severity,
                'department': 'Assigned',
            }, ensure_ascii=False)

        elif tool_name == 'track_complaint':
            from database import Grievance, Department, User
            from agents.tracking_agent import check_sla_status
            tid = (args.get('tracking_id') or '').upper().strip()
            
            # If tracking_id was omitted, search conversation history or last filed grievance
            session = get_session(session_id) if session_id else {}
            if not tid or not tid.startswith("JS-"):
                for m in reversed(session.get('messages', [])):
                    c = m.get('content', '') if isinstance(m, dict) else ''
                    found = re.findall(r'JS-\d{8}-[A-Z0-9]{6}', str(c))
                    if found:
                        tid = found[-1].upper().strip()
                        break
                
                # Check user's most recent grievance in DB if still not found
                if not tid and session.get('user_id'):
                    last_g = db.query(Grievance).filter(Grievance.citizen_id == session['user_id']).order_by(Grievance.created_at.desc()).first()
                    if last_g:
                        tid = last_g.tracking_id

            if not tid:
                return json.dumps({
                    'found': False, 
                    'message': 'No tracking ID provided. Please provide the tracking ID (format: JS-YYYYMMDD-XXXXXX).'
                }, ensure_ascii=False)

            g = db.query(Grievance).filter(Grievance.tracking_id == tid).first()
            if not g:
                return json.dumps({'found': False, 'message': f'No complaint found with ID {tid}'}, ensure_ascii=False)
            
            sla = check_sla_status(g)
            dept = db.query(Department).filter(Department.id == g.department_id).first() if g.department_id else None
            dept_name = dept.name if dept else "Assigned Department"
            cit = db.query(User).filter(User.id == g.citizen_id).first() if g.citizen_id else None
            citizen_name = cit.name if cit else "Citizen"
            
            # Assigned Officer details
            assigned_off = db.query(User).filter(User.id == g.assigned_officer_id).first() if g.assigned_officer_id else None
            officer_name = assigned_off.name if assigned_off else "Assigned Field Officer (Pending inspection)"
            officer_phone = assigned_off.phone if (assigned_off and assigned_off.phone) else "GHMC Central Helpline 040-21111111"
            
            hours_rem = sla.get('hours_remaining')
            eta_str = f"{hours_rem} hours remaining" if hours_rem is not None else "Within SLA window"
            if sla.get('is_breached'):
                eta_str = "SLA Breached (Escalated to Zonal Authority)"
            
            return json.dumps({
                'found': True,
                'tracking_id': g.tracking_id,
                'category': g.category,
                'sub_category': g.sub_category,
                'status': g.status,
                'severity': g.severity,
                'priority_level': g.priority,
                'department': dept_name,
                'assigned_officer': officer_name,
                'officer_contact': officer_phone,
                'eta': eta_str,
                'sla_deadline': str(g.sla_deadline) if g.sla_deadline else "",
                'field_inspection_notes': g.field_inspection_notes or "Pending on-ground verification",
                'citizen_name': citizen_name,
                'raw_text': g.raw_text,
                'sla_breached': sla.get('is_breached', False),
                'hours_remaining': hours_rem,
                'location': g.location_text or "",
            }, ensure_ascii=False)

        elif tool_name == 'check_duplicate':
            from agents.intake_agent import _check_duplicate
            dup = _check_duplicate(args.get('description', '') + ' ' + args.get('location', ''), db)
            if dup:
                return json.dumps({'duplicate_found': True, **dup}, ensure_ascii=False)
            return json.dumps({'duplicate_found': False}, ensure_ascii=False)

        else:
            return json.dumps({'error': f'Unknown tool: {tool_name}'})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return json.dumps({'error': str(e)})


# ─────────────────────────────────────────────
# Main process_voice_intent function
# ─────────────────────────────────────────────
def process_voice_intent(text: str, session_id: str, db, lang: str = None) -> tuple[str, str, dict]:
    """Process voice input using Groq LLM with full conversation context and tool calling."""
    import json
    from config import settings
    
    session = get_session(session_id)
    if lang:
        session['language'] = lang
    session['turn_count'] += 1
    current_lang = session['language']
    metadata = {'language': current_lang, 'turn': session['turn_count']}
    
    # Add language hint to system prompt if not English
    lang_hint = ''
    if current_lang == 'hi':
        lang_hint = '\n\nThe citizen is speaking Hindi. Respond in Hindi (Devanagari script).'
    elif current_lang == 'te':
        lang_hint = '\n\nThe citizen is speaking Telugu. Respond in Telugu script.'
    
    user_hint = ''
    if session.get('user_name'):
        user_hint = f"\n\nAuthenticated Citizen Name: '{session['user_name']}'. The citizen is already logged in; do NOT ask for their name. Register the complaint directly with their name once location and description are provided."

    # Build messages for LLM
    if not session['messages']:
        session['messages'].append({'role': 'system', 'content': SYSTEM_PROMPT + lang_hint + user_hint})
    else:
        # Keep system prompt updated with latest hints
        session['messages'][0] = {'role': 'system', 'content': SYSTEM_PROMPT + lang_hint + user_hint}
    
    session['messages'].append({'role': 'user', 'content': text})
    
    # Call Groq LLM
    try:
        import requests
        headers = {
            'Authorization': f'Bearer {settings.LLM_API_KEY}',
            'Content-Type': 'application/json',
        }
        payload = {
            'model': settings.LLM_MODEL or 'llama-3.3-70b-versatile',
            'messages': session['messages'],
            'tools': TOOLS,
            'tool_choice': 'auto',
            'temperature': 0.3,
            'max_tokens': 500,
        }
        
        response = requests.post(
            f'{(settings.LLM_BASE_URL or "https://api.groq.com/openai/v1").rstrip("/")}/chat/completions',
            headers=headers,
            json=payload,
            timeout=settings.LLM_TIMEOUT or 30,
        )
        
        if response.status_code != 200:
            print(f'[Voice Agent] LLM error {response.status_code}: {response.text[:200]}')
            return _fallback_response(text, current_lang, metadata)
        
        # LLM Tool Calling Loop (max 3 turns)
        final_content = ''
        agent_used = 'communication'
        
        for _ in range(3):
            data = response.json()
            choice = data.get('choices', [{}])[0]
            message = choice.get('message', {})
            
            # Fallback XML tool call parsing (for Qwen models on Groq)
            content = message.get('content', '') or ''
            if not message.get('tool_calls') and '<tool_call>' in content:
                import re
                tool_match = re.search(r'<parameter=([^>]+)>', content)
                if tool_match:
                    fn_name = tool_match.group(1).strip()
                    args = {}
                    params = re.findall(r'<parameter=([^>]+)>((?:(?!</?parameter).)*?)</parameter>', content, re.DOTALL)
                    for k, v in params:
                        args[k.strip()] = v.strip()
                    
                    if args:
                        import uuid
                        message['tool_calls'] = [{
                            'id': "call_" + uuid.uuid4().hex[:8],
                            'type': 'function',
                            'function': {
                                'name': fn_name,
                                'arguments': json.dumps(args)
                            }
                        }]
                        # Strip XML from content so it isn't spoken
                        message['content'] = re.sub(r'<tool_call>.*?</tool_call>', '', content, flags=re.DOTALL).strip()
            
            # If no tool calls, we are done
            if not message.get('tool_calls'):
                # Also strip any stray <tool_call> that didn't parse just in case
                import re
                final_content = re.sub(r'<tool_call>.*?</tool_call>', '', message.get('content', '') or '', flags=re.DOTALL).strip()
                if not final_content:
                    final_content = "Complaint processing completed."
                session['messages'].append({'role': 'assistant', 'content': final_content})
                break
            
            # Handle tool calls
            session['messages'].append(message)
            tool_results = []
            
            for tool_call in message['tool_calls']:
                fn_name = tool_call['function']['name']
                fn_args_raw = tool_call['function'].get('arguments', '{}')
                if isinstance(fn_args_raw, dict):
                    fn_args = fn_args_raw
                else:
                    try:
                        fn_args = json.loads(fn_args_raw)
                    except Exception:
                        fn_args = {}
                try:
                    print(f'[Voice Agent] Tool call: {fn_name}')
                except Exception:
                    pass
                
                result = _execute_tool(fn_name, fn_args, db, session_id)
                try:
                    metadata[f'tool_{fn_name}'] = json.loads(result)
                except Exception:
                    metadata[f'tool_{fn_name}'] = {"raw": result}
                
                tool_results.append({
                    'role': 'tool',
                    'tool_call_id': tool_call['id'],
                    'content': result,
                })
                
                if 'classify' in fn_name: agent_used = 'intake'
                elif 'register' in fn_name: agent_used = 'orchestrator'
                elif 'track' in fn_name: agent_used = 'tracking'
                elif 'duplicate' in fn_name: agent_used = 'intake'
            
            session['messages'].extend(tool_results)
            
            # Call LLM again with tool results (DO NOT remove 'tools' from payload!)
            payload['messages'] = session['messages']
            
            response = requests.post(
                f'{(settings.LLM_BASE_URL or "https://api.groq.com/openai/v1").rstrip("/")}/chat/completions',
                headers=headers,
                json=payload,
                timeout=settings.LLM_TIMEOUT or 30,
            )
            
            if response.status_code != 200:
                print(f'[Voice Agent] LLM follow-up error {response.status_code}')
                return _fallback_response(text, current_lang, metadata)
                
        return final_content, agent_used, metadata
    
    except Exception as e:
        print(f'[Voice Agent] LLM exception: {type(e).__name__}')
        return _fallback_response(text, current_lang, metadata)


def _fallback_response(text: str, lang: str, metadata: dict) -> tuple[str, str, dict]:
    """Fallback when LLM is unavailable."""
    from agents.translations import get_message
    metadata['fallback'] = True
    return get_message('FALLBACK', lang), 'communication', metadata

