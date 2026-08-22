import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

type AssistantLanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu';

export const VoiceAssistant: React.FC = () => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('voice_assistant_welcome');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [botResponse, setBotResponse] = useState<string>('');
  const [assistantLang, setAssistantLang] = useState<AssistantLanguageCode>('en');
  const [loading, setLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync assistant language with global UI language initially
  useEffect(() => {
    const supported: AssistantLanguageCode[] = ['en', 'hi', 'ta', 'te'];
    if (supported.includes(language as any)) {
      setAssistantLang(language as AssistantLanguageCode);
    }
  }, [language]);

  const mapLangToText = (key: string, lang: AssistantLanguageCode): string => {
    const welcome: Record<AssistantLanguageCode, string> = {
      en: "Hello! I am your MedFlow Voice Assistant. How can I help you today?",
      hi: "नमस्ते! मैं आपका मेडफ्लो वॉयस असिस्टेंट हूं। आज मैं आपकी क्या मदद कर सकता हूं?",
      ta: "வணக்கம்! நான் உங்கள் மெட்ஃப்ளோ குரல் உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
      te: "నమస్తే! నేను మీ మెడ్‌ఫ్లో వాయిస్ అసిస్టెంట్‌ని. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
      kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಮೆಡ್‌ಫ್ಲೋ ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
      ml: "ഹലോ! ഞാൻ നിങ്ങളുടെ മെഡ്ഫ്ലോ വോയ്‌സ് അസിന്റന്റ് ആണ്. ഇന്ന് ഞാൻ നിങ്ങൾക്ക് എങ്ങനെ സഹായപ്പെടാം?",
      mr: "नमस्कार! मी आपला मेडफ्लो व्हॉइस असिस्टंट आहे. आज मी आपल्याला कशी मदत करू शकतो?",
      bn: "হ্যালো! আমি আপনার মেডফ্লো ভয়েস অ্যাসিস্ট্যান্ট। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
      gu: "નમસ્તે! હું તમારો મેડફ્લો વોઇસ આસિસ્ટન્ટ છું. આજે હું તમને કેવી રીતે મદદ કરી શકું?"
    };
    const listening: Record<AssistantLanguageCode, string> = {
      en: "Listening... Speak now.",
      hi: "सुन रहा हूँ... अब बोलें।",
      ta: "கேட்கிறது... இப்போது பேசுங்கள்.",
      te: "వింటున్నాను... ఇప్పుడు మాట్లాడండి.",
      kn: "ಕೇಳಿಸುತ್ತಿದೆ... ಈಗ ಮಾತನಾಡಿ.",
      ml: "കേൾക്കുന്നു... ഇപ്പോൾ സംസാരിക്കൂ.",
      mr: "ऐकत आहे... आता बोला.",
      bn: "শুনছি... এখন বলুন।",
      gu: "સાંભળી રહ્યા છીએ... હવે બોલો."
    };
    const processing: Record<AssistantLanguageCode, string> = {
      en: "Processing your request...",
      hi: "आपके अनुरोध पर कार्रवाई की जा रही है...",
      ta: "உங்கள் கோரிக்கையைச் செயலாக்குகிறது...",
      te: "మీ అభ్యర్థన ప్రాసెస్ చేయబడుతోంది...",
      kn: "ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ...",
      ml: "നിങ്ങളുടെ അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്യുന്നു...",
      mr: "आपल्या विनंतीवर प्रक्रिया केली जात आहे...",
      bn: "আপনার অনুরোধ প্রক্রিয়াকরণ করা হচ্ছে...",
      gu: "તમારી વિનંતી પર પ્રક્રિયા થઈ રહી છે..."
    };
    const speaking: Record<AssistantLanguageCode, string> = {
      en: "Speaking response...",
      hi: "उत्तर बोल रहा हूँ...",
      ta: "பதில் பேசுகிறது...",
      te: "సమాధానం చెబుతున్నాను...",
      kn: "ಉತ್ತರವನ್ನು ಹೇಳುತ್ತಿದ್ದೇನೆ...",
      ml: "മറുപടി സംസാരിക്കുന്നു...",
      mr: "उत्तर बोलत आहे...",
      bn: "উত্তর বলা হচ্ছে...",
      gu: "જવાબ બોલી રહ્યા છીએ..."
    };

    if (key === 'voice_assistant_welcome') return welcome[lang] || welcome.en;
    if (key === 'voice_assistant_listening') return listening[lang] || listening.en;
    if (key === 'voice_assistant_processing') return processing[lang] || processing.en;
    if (key === 'voice_assistant_speaking') return speaking[lang] || speaking.en;
    return key;
  };

  const getLanguageLabel = (code: AssistantLanguageCode) => {
    const labels = {
      en: "English",
      hi: "हिंदी",
      ta: "தமிழ்",
      te: "తెలుగు",
      kn: "ಕನ್ನಡ",
      ml: "മലയാളം",
      mr: "मराठी",
      bn: "বাংলা",
      gu: "ગુજરાતી"
    };
    return labels[code];
  };

  const startRecording = () => {
    setUserTranscript('');
    setBotResponse('');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Speech Recognition not supported in this browser. Please use Google Chrome.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      const langMap: Record<AssistantLanguageCode, string> = {
        en: 'en-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        mr: 'mr-IN',
        bn: 'bn-IN',
        gu: 'gu-IN'
      };
      
      recognition.lang = langMap[assistantLang] || 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setStatus('voice_assistant_listening');
      };

      recognition.onresult = async (event: any) => {
        const speechToTextResult = event.results[0][0].transcript;
        setUserTranscript(speechToTextResult);
        await processSpeechText(speechToTextResult);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setStatus(`Error: ${event.error}. Please try again.`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error('[VoiceAssistant] SpeechRecognition failed:', err);
      setStatus('Failed to start speech recognition.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const processSpeechText = async (text: string) => {
    setLoading(true);
    setStatus('voice_assistant_processing');

    try {
      const q = text.toLowerCase();
      let detectedSpecialty = '';

      if (q.includes('heart') || q.includes('cardiac') || q.includes('chest') || q.includes('pain') ||
          q.includes('दर्द') || q.includes('सीने') || q.includes('வலி') || q.includes('நெஞ்சு') ||
          q.includes('నొప్పి') || q.includes('గుండె') || q.includes('ಎದೆ') ||
          q.includes('छातीत') || q.includes('দুখাব')) {
        detectedSpecialty = 'Cardiology';
      } else if (q.includes('kidney') || q.includes('renal') || q.includes('dialysis') ||
                 q.includes('గుర్దే') || q.includes('కిడ్నీ') || q.includes('మూత్రపిండ') ||
                 q.includes('சிறுநீரகம்') || q.includes('ಕಿಡ್ನಿ') || q.includes('வൃക്ക')) {
        detectedSpecialty = 'Nephrology';
      } else if (q.includes('child') || q.includes('baby') || q.includes('pediatric') || q.includes('infant') ||
                 q.includes('బాళ') || q.includes('పిల్లల') || q.includes('குழந்தை') || q.includes('बच्चे') ||
                 q.includes('ಮಕ್ಕಳ') || q.includes('കുട്ടി') || q.includes('শিশু')) {
        detectedSpecialty = 'Pediatrics';
      } else if (q.includes('lung') || q.includes('breath') || q.includes('oxygen') || q.includes('cough') ||
                 q.includes('సాస') || q.includes('శ్వాస') || q.includes('சுவாசம்') || q.includes('सांस') ||
                 q.includes('ಉಸಿರಾಟ') || q.includes('ശ്വാസം')) {
        detectedSpecialty = 'Pulmonology';
      } else if (q.includes('medicine') || q.includes('drug') || q.includes('stock') || q.includes('supply') ||
                 q.includes('మందులు') || q.includes('స్టాక్') || q.includes('दवाई') ||
                 q.includes('மருந்து') || q.includes('ಔಷಧ')) {
        detectedSpecialty = 'Medicine Stock';
      } else if (q.includes('icu') || q.includes('bed') || q.includes('ventilator') ||
                 q.includes('emergency') || q.includes('accident') || q.includes('trauma')) {
        detectedSpecialty = 'Trauma';
      }

      // Dispatch filter event to live-update the UI
      window.dispatchEvent(new CustomEvent('medflow-voice-filter', {
        detail: { specialty: detectedSpecialty }
      }));

      // Fetch LIVE hospital data for real answers
      let liveContext = '';
      try {
        const apiBase = import.meta.env.VITE_API_URL ||
          (typeof window !== 'undefined' && window.location.port === '5173' ? '/api' : 'http://localhost:8000/api');
        const rootUrl = apiBase.replace('/api', '');
        const specParam = detectedSpecialty && detectedSpecialty !== 'Medicine Stock'
          ? `?specialty=${encodeURIComponent(detectedSpecialty)}` : '';
        const res = await fetch(`${rootUrl}/api/hospitals${specParam}`);
        if (res.ok) {
          const hospitals = await res.json();
          if (Array.isArray(hospitals) && hospitals.length > 0) {
            const names = hospitals.slice(0, 3).map((h: any) => h.name).join(', ');
            const totalICU = hospitals.reduce((s: number, h: any) =>
              s + (h.beds?.filter((b: any) => b.bed_type === 'ICU' && b.status === 'AVAILABLE')?.length || 0), 0);
            const totalGen = hospitals.reduce((s: number, h: any) => s + (h.general_beds_available || 0), 0);
            liveContext = `Hospitals: ${names}. ICU beds available: ${totalICU}. General beds: ${totalGen}.`;
          }
        }
      } catch { /* silently fall back */ }

      const spec = detectedSpecialty || 'General Medicine';
      const info = liveContext || 'Searching nearest matching hospitals.';

      const responses: Record<AssistantLanguageCode, string> = {
        en: `For ${spec}: ${info}`,
        hi: detectedSpecialty
          ? `${spec} के लिए: ${liveContext || 'नजदीकी अस्पतालों में बेड उपलब्ध हैं।'}`
          : 'सामान्य चिकित्सा फ़िल्टर लागू किया गया। मिलान अस्पतालों की खोज की जा रही है।',
        ta: detectedSpecialty
          ? `${spec} சிகிச்சைக்கு: ${liveContext || 'அருகிலுள்ள மருத்துவமனைகளில் படுக்கைகள் உள்ளன.'}`
          : 'பொது மருத்துவம் வடிகட்டி பயன்படுத்தப்பட்டது.',
        te: detectedSpecialty
          ? `${spec} కోసం: ${liveContext || 'సమీపంలో ఆసుపత్రులలో పడకలు అందుబాటులో ఉన్నాయి.'}`
          : 'జనరల్ మెడిసిన్ ఫిల్టర్ వర్తింపజేయబడింది. శోధిస్తోంది.',
        kn: detectedSpecialty
          ? `${spec} ಗೆ: ${liveContext || 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳಲ್ಲಿ ಹಾಸಿಗೆಗಳು ಲಭ್ಯ.'}`
          : 'ಸಾಮಾನ್ಯ ಔಷಧ ಫಿಲ್ಟರ್ ಅನ್ವಯ.',
        ml: detectedSpecialty
          ? `${spec} ന്: ${liveContext || 'അടുത്ത ആശുപത്രിയിൽ കിടക്ക ലഭ്യം.'}`
          : 'ജനറൽ ഫിൽട്ടർ പ്രയോഗിച്ചു.',
        mr: detectedSpecialty
          ? `${spec} साठी: ${liveContext || 'जवळच्या रुग्णालयांमध्ये बेड उपलब्ध.'}`
          : 'सामान्य फिल्टर लागू केला.',
        bn: detectedSpecialty
          ? `${spec} এর জন্য: ${liveContext || 'কাছের হাসপাতালে শয্যা পাওয়া যাচ্ছে।'}`
          : 'সাধারণ ফিল্টার প্রয়োগ হয়েছে।',
        gu: detectedSpecialty
          ? `${spec} માટે: ${liveContext || 'નજીકની હોસ્પિટલોમાં બેડ ઉપલબ્ધ.'}`
          : 'સામાન્ય ફિલ્ટર લાગુ.'
      };

      const responseText = responses[assistantLang] || responses.en;
      setBotResponse(responseText);
      setStatus('voice_assistant_speaking');
      speakNow(responseText);
    } catch (err) {
      console.error('[VoiceAssistant] Processing error:', err);
      setStatus('Sorry, I encountered an error. Please try again.');
      setLoading(false);
    }
  };

  // Use browser-native SpeechSynthesis — INSTANT, no network call required
  const speakNow = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setStatus('voice_assistant_welcome');
      setLoading(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<AssistantLanguageCode, string> = {
      en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
      kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN'
    };
    utterance.lang = langMap[assistantLang] || 'en-IN';
    utterance.rate = 0.92;
    setIsPlaying(true);
    utterance.onend = () => { setIsPlaying(false); setStatus('voice_assistant_welcome'); setLoading(false); };
    utterance.onerror = () => { setIsPlaying(false); setStatus('voice_assistant_welcome'); setLoading(false); };
    window.speechSynthesis.speak(utterance);
  };

  const handleClose = () => {
    stopRecording();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsOpen(false);
    setLoading(false);
  };

  const presetChips = [
    { label: "మందుల నిల్వ (Telugu)", text: "మందుల స్టాక్ ఏమిటి", lang: "te" as AssistantLanguageCode },
    { label: "ముझे सीने में दर्द है (Hindi)", text: "मुझे सीने में दर्द है", lang: "hi" as AssistantLanguageCode },
    { label: "குழந்தை மருத்துவர் (Tamil)", text: "குழந்தை மருத்துவர் தேவை", lang: "ta" as AssistantLanguageCode },
    { label: "Need ICU Bed (English)", text: "Need ICU Bed emergency", lang: "en" as AssistantLanguageCode },
    { label: "నాకు కిడ్నీ సమస్య (Telugu)", text: "నాకు కిడ్నీ సమస్య ఉంది", lang: "te" as AssistantLanguageCode },
    { label: "ಕಿಡ್ನಿ ಸಮಸ್ಯೆ (Kannada)", text: "ಕಿಡ್ನಿ ಸಮಸ್ಯೆ ಇದೆ", lang: "kn" as AssistantLanguageCode },
    { label: "Medicine stock status", text: "What is the medicine stock", lang: "en" as AssistantLanguageCode },
    { label: "শিশু বিশেষজ্ঞ (Bengali)", text: "শিশু বিশেষজ্ঞ প্রয়োজন", lang: "bn" as AssistantLanguageCode }
  ];

  const handlePresetClick = async (chip: typeof presetChips[0]) => {
    setAssistantLang(chip.lang);
    setUserTranscript(chip.text);
    await processSpeechText(chip.text);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d9488, #4f46e5)',
          color: '#fff', border: 'none',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 9999, transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title="MedFlow Voice Assistant"
      >
        <Mic size={24} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '90px', right: '24px',
          width: '390px', maxHeight: '580px',
          background: '#ffffff', borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
          border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column',
          zIndex: 9999, overflow: 'hidden', fontFamily: 'sans-serif'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0d9488, #4f46e5)',
            color: '#ffffff', padding: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>MedFlow Voice Assistant</span>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            {/* Language selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Input Language:</span>
              <select
                value={assistantLang}
                onChange={(e) => setAssistantLang(e.target.value as AssistantLanguageCode)}
                style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="en">English (India)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ml">മലയാളം (Malayalam)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
              </select>
            </div>

            {/* Quick Chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Quick Chips:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {presetChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetClick(chip)}
                    style={{
                      background: '#f1f5f9', border: '1px solid #cbd5e1',
                      borderRadius: '12px', padding: '4px 10px',
                      fontSize: '0.72rem', fontWeight: 600, color: '#334155',
                      cursor: 'pointer', transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '120px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '4px' }}>
                {mapLangToText(status, assistantLang)}
              </div>

              {userTranscript && (
                <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-end', maxWidth: '85%' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'right', marginRight: '4px' }}>You ({getLanguageLabel(assistantLang)})</div>
                  <div style={{ background: '#eff6ff', color: '#1e3a8a', padding: '10px 12px', borderRadius: '12px 12px 0 12px', fontSize: '0.85rem', fontWeight: 500 }}>
                    {userTranscript}
                  </div>
                </div>
              )}

              {loading && !botResponse && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', color: '#64748b', fontSize: '0.8rem' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Analyzing clinical keywords...</span>
                </div>
              )}

              {botResponse && (
                <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '85%', marginTop: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '4px' }}>MedFlow AI</div>
                  <div style={{ background: '#f1f5f9', color: '#1e293b', padding: '10px 12px', borderRadius: '12px 12px 12px 0', fontSize: '0.85rem', lineHeight: 1.4 }}>
                    {botResponse}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mic button */}
          <div style={{
            borderTop: '1px solid #e2e8f0', padding: '16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', background: '#fafafa', gap: '10px'
          }}>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: '60px', height: '60px', borderRadius: '50%', border: 'none',
                background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #0d9488, #4f46e5)',
                color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'background-color 0.2s'
              }}
            >
              {isRecording ? <MicOff size={26} /> : <Mic size={26} />}
            </button>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              {isRecording ? 'Tap to Stop Recording' : 'Tap Mic to Speak'}
            </span>
          </div>
        </div>
      )}

      <audio ref={audioRef} style={{ display: 'none' }} />
    </>
  );
};
