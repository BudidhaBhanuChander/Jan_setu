# translations.py - Multilingual response templates for Voice Agent

RESPONSES = {
    "en": {
        "WELCOME": "Namaste! Welcome to Jan Setu, the AI-powered GHMC grievance redressal voice assistant. How can I help you today?",
        "HELP": "Here's what I can do for you. You can report any civic issue, track your complaint by saying your tracking ID, or ask which department handles a specific type of problem.",
        "AWAITING_LOCATION": "I understood your complaint about {sub_cat}. Could you please tell me the street name or location where this issue is located?",
        "AWAITING_LOCATION_NAMED": "I understood your complaint about {sub_cat} near {location}. Could you please provide your name for the record?",
        "AWAITING_NAME": "Got it, {text}. May I also have your name for the record, or you can say 'skip' to remain anonymous.",
        "AWAITING_CONFIRM": "Thank you, {name}. To confirm, I am registering a new complaint for: {complaint} at {location}. Should I go ahead and file it?",
        "DUPLICATE_FOUND": "Thank you, {name}. I found a similar complaint already reported near {location}. Should I add your report to that existing issue to prioritize it, or file a completely new grievance?",
        "FILE_NEW": "Okay, I will file this as a separate new complaint. To confirm, I am registering: {complaint}. Should I go ahead?",
        "APPENDED": "I have successfully added your report to the existing complaint to increase its priority. The tracking ID is {id}. Our team is already working on it. Is there anything else I can help you with?",
        "REGISTERED": "Your complaint has been successfully registered. Your tracking ID is {id}. It has been classified as {category}, {sub_cat}, with {severity} severity. Our AI has assigned it to the relevant department. Is there anything else I can help you with?",
        "TRACK_FOUND": "I found your complaint. Tracking ID {id}. Category: {category}, {sub_cat}. Current status: {status}. Severity: {severity}. {sla_msg} Is there anything else I can help you with?",
        "TRACK_NOT_FOUND": "I could not find a complaint with that tracking ID. Please check the ID and try again.",
        "CANCELLED": "Okay, I've cancelled that. Is there anything else I can help you with?",
        "REPROMPT": "Should I go ahead and register it? Please say yes to confirm or no to cancel.",
        "TRACK_PROMPT": "To track your complaint, please say your tracking ID.",
        "INTAKE_ERROR": "I heard your complaint. Could you please tell me the location of the issue?",
        "SUBMIT_ERROR": "I'm sorry, I had trouble registering your complaint right now. Please try again or use the web portal.",
        "FALLBACK": "Could you please rephrase that? I can help you report civic problems or track complaints."
    },
    "hi": {
        "WELCOME": "नमस्ते! जन सेतु में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूँ?",
        "HELP": "आप नागरिक समस्याओं की रिपोर्ट कर सकते हैं या अपनी शिकायत को ट्रैक कर सकते हैं।",
        "AWAITING_LOCATION": "मैं {sub_cat} के बारे में आपकी शिकायत समझ गया। क्या आप कृपया मुझे उस स्थान का नाम बता सकते हैं जहाँ यह समस्या है?",
        "AWAITING_LOCATION_NAMED": "मैं {location} के पास {sub_cat} के बारे में आपकी शिकायत समझ गया। क्या आप कृपया रिकॉर्ड के लिए अपना नाम बता सकते हैं?",
        "AWAITING_NAME": "ठीक है, {text}। क्या आप कृपया रिकॉर्ड के लिए अपना नाम बता सकते हैं?",
        "AWAITING_CONFIRM": "धन्यवाद, {name}। पुष्टि करने के लिए, मैं {location} पर {complaint} के बारे में एक शिकायत दर्ज कर रहा हूँ। क्या मैं आगे बढ़ूँ?",
        "DUPLICATE_FOUND": "धन्यवाद, {name}। मुझे {location} के पास पहले से ही दर्ज एक समान शिकायत मिली है। क्या मुझे आपकी शिकायत को उसी में जोड़ना चाहिए, या एक नई शिकायत दर्ज करनी चाहिए?",
        "FILE_NEW": "ठीक है, मैं इसे एक नई शिकायत के रूप में दर्ज करूँगा। पुष्टि करने के लिए, मैं दर्ज कर रहा हूँ: {complaint}। क्या मैं आगे बढ़ूँ?",
        "APPENDED": "मैंने आपकी रिपोर्ट को मौजूदा शिकायत में जोड़ दिया है। आपकी ट्रैकिंग आईडी {id} है। हमारी टीम इस पर काम कर रही है। क्या मैं किसी और चीज़ में मदद कर सकता हूँ?",
        "REGISTERED": "आपकी शिकायत दर्ज कर ली गई है। आपकी ट्रैकिंग आईडी {id} है। इसे {category}, {sub_cat} के रूप में वर्गीकृत किया गया है। क्या मैं किसी और चीज़ में मदद कर सकता हूँ?",
        "TRACK_FOUND": "मुझे आपकी शिकायत मिल गई। ट्रैकिंग आईडी {id}। वर्तमान स्थिति: {status}। {sla_msg}",
        "TRACK_NOT_FOUND": "मुझे उस ट्रैकिंग आईडी वाली कोई शिकायत नहीं मिली। कृपया पुनः प्रयास करें।",
        "CANCELLED": "ठीक है, मैंने इसे रद्द कर दिया है। क्या मैं किसी और चीज़ में मदद कर सकता हूँ?",
        "REPROMPT": "क्या मुझे आगे बढ़कर इसे दर्ज करना चाहिए? पुष्टि करने के लिए हाँ कहें या रद्द करने के लिए ना।",
        "TRACK_PROMPT": "कृपया अपनी ट्रैकिंग आईडी बताएं।",
        "INTAKE_ERROR": "मैंने आपकी शिकायत सुन ली है। क्या आप कृपया मुझे समस्या का स्थान बता सकते हैं?",
        "SUBMIT_ERROR": "मुझे खेद है, मुझे अभी आपकी शिकायत दर्ज करने में परेशानी हुई। कृपया पुनः प्रयास करें।",
        "FALLBACK": "क्या आप कृपया इसे फिर से बता सकते हैं? मैं नागरिक समस्याओं की रिपोर्ट करने में आपकी मदद कर सकता हूँ।"
    },
    "te": {
        "WELCOME": "నమస్కారం! జన్ సేతుకు స్వాగతం. నేను మీకు ఎలా సహాయం చేయగలను?",
        "HELP": "మీరు పౌర సమస్యలను నివేదించవచ్చు లేదా మీ ఫిర్యాదును ట్రాక్ చేయవచ్చు.",
        "AWAITING_LOCATION": "{sub_cat} గురించి మీ ఫిర్యాదు నేను అర్థం చేసుకున్నాను. దయచేసి ఈ సమస్య ఉన్న స్థానాన్ని చెప్పగలరా?",
        "AWAITING_LOCATION_NAMED": "{location} సమీపంలో {sub_cat} గురించి మీ ఫిర్యాదు నేను అర్థం చేసుకున్నాను. దయచేసి రికార్డు కోసం మీ పేరు చెప్పగలరా?",
        "AWAITING_NAME": "అర్థమైంది, {text}. దయచేసి రికార్డు కోసం మీ పేరు చెప్పగలరా?",
        "AWAITING_CONFIRM": "ధన్యవాదాలు, {name}. నిర్ధారించడానికి, నేను {location} వద్ద {complaint} గురించి ఫిర్యాదును నమోదు చేస్తున్నాను. నేను ముందుకు సాగవచ్చా?",
        "DUPLICATE_FOUND": "ధన్యవాదాలు, {name}. {location} సమీపంలో ఇలాంటి ఫిర్యాదు ఇప్పటికే నమోదైంది. నేను మీ నివేదికను దానికి జత చేయాలా, లేదా కొత్త ఫిర్యాదును నమోదు చేయాలా?",
        "FILE_NEW": "సరే, నేను దీనిని కొత్త ఫిర్యాదుగా నమోదు చేస్తాను. నేను ముందుకు సాగవచ్చా?",
        "APPENDED": "నేను మీ నివేదికను ఉన్న ఫిర్యాదుకు విజయవంతంగా జత చేసాను. ట్రాకింగ్ ఐడి {id}. మా బృందం దీనిపై పని చేస్తోంది.",
        "REGISTERED": "మీ ఫిర్యాదు నమోదైంది. మీ ట్రాకింగ్ ఐడి {id}. ఇది {category}, {sub_cat} గా వర్గీకరించబడింది. నేను మీకు ఇంకేమైనా సహాయం చేయగలనా?",
        "TRACK_FOUND": "మీ ఫిర్యాదు దొరికింది. ట్రాకింగ్ ఐడి {id}. ప్రస్తుత స్థితి: {status}. {sla_msg}",
        "TRACK_NOT_FOUND": "ఆ ట్రాకింగ్ ఐడీతో ఏ ఫిర్యాదూ కనుగొనబడలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.",
        "CANCELLED": "సరే, నేను దాన్ని రద్దు చేసాను. ఇంకేమైనా సహాయం చేయగలనా?",
        "REPROMPT": "నేను దీనిని నమోదు చేయాలా? నిర్ధారించడానికి అవును అని లేదా రద్దు చేయడానికి కాదు అని చెప్పండి.",
        "TRACK_PROMPT": "దయచేసి మీ ట్రాకింగ్ ఐడీని చెప్పండి.",
        "INTAKE_ERROR": "నేను మీ ఫిర్యాదు విన్నాను. దయచేసి సమస్య ఉన్న స్థలాన్ని చెప్పగలరా?",
        "SUBMIT_ERROR": "క్షమించండి, ప్రస్తుతం మీ ఫిర్యాదును నమోదు చేయడంలో నాకు సమస్య ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
        "FALLBACK": "దయచేసి దాన్ని మళ్ళీ చెప్పగలరా? పౌర సమస్యలను నివేదించడంలో నేను మీకు సహాయపడగలను."
    }
}

def get_message(key: str, lang: str, **kwargs) -> str:
    lang = lang if lang in RESPONSES else "en"
    msg = RESPONSES[lang].get(key, RESPONSES["en"].get(key, ""))
    return msg.format(**kwargs)
