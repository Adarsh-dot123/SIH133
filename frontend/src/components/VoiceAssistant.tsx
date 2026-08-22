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
      const lowercaseQuery = text.toLowerCase();
      let responseText = '';
      let detectedSpecialty = '';

      // Triage keyword matching logic for specialties
      if (lowercaseQuery.includes('heart') || lowercaseQuery.includes('cardiac') || lowercaseQuery.includes('pain') || lowercaseQuery.includes('chest') ||
          lowercaseQuery.includes('दर्द') || lowercaseQuery.includes('सीने') ||
          lowercaseQuery.includes('வலி') || lowercaseQuery.includes('நெஞ்சு') ||
          lowercaseQuery.includes('నొప్పి') || lowercaseQuery.includes('గుండె') ||
          lowercaseQuery.includes('ನొప్పి') || lowercaseQuery.includes('ಎದೆ') ||
          lowercaseQuery.includes('छातीत') || lowercaseQuery.includes('दुखत') ||
          lowercaseQuery.includes('বुक') || lowercaseQuery.includes('ব্যথা') ||
          lowercaseQuery.includes('છાતી') || lowercaseQuery.includes('દુખાવો')) {
        detectedSpecialty = 'Cardiology';
      } else if (lowercaseQuery.includes('kidney') || lowercaseQuery.includes('renal') || lowercaseQuery.includes('dialysis') || lowercaseQuery.includes('creatinine') ||
                 lowercaseQuery.includes('गुर्दे') ||
                 lowercaseQuery.includes('சிறுநீரகம்') ||
                 lowercaseQuery.includes('కిడ్నీ') || lowercaseQuery.includes('మూత్రపిండాలు') ||
                 lowercaseQuery.includes('ಕಿಡ್ನಿ') ||
                 lowercaseQuery.includes('വൃക്ക') ||
                 lowercaseQuery.includes('मूत्रपिंड') ||
                 lowercaseQuery.includes('বৃক্ক') ||
                 lowercaseQuery.includes('કિડની')) {
        detectedSpecialty = 'Nephrology';
      } else if (lowercaseQuery.includes('child') || lowercaseQuery.includes('pediatric') || lowercaseQuery.includes('baby') || lowercaseQuery.includes('infant') ||
                 lowercaseQuery.includes('बच्चे') || lowercaseQuery.includes('शिशु') ||
                 lowercaseQuery.includes('குழந்தை') ||
                 lowercaseQuery.includes('పిల్లల') ||
                 lowercaseQuery.includes('ಮಕ್ಕಳ') ||
                 lowercaseQuery.includes('കുട്ടി') ||
                 lowercaseQuery.includes('बाळ') ||
                 lowercaseQuery.includes('శిశువు') ||
                 lowercaseQuery.includes('শিশু') ||
                 lowercaseQuery.includes('બાળક')) {
        detectedSpecialty = 'Pediatrics';
      } else if (lowercaseQuery.includes('lung') || lowercaseQuery.includes('breath') || lowercaseQuery.includes('oxygen') || lowercaseQuery.includes('cough') || lowercaseQuery.includes('pneumonia') ||
                 lowercaseQuery.includes('सांस') || lowercaseQuery.includes('फेफड़े') ||
                 lowercaseQuery.includes('சுவாசம்') ||
                 lowercaseQuery.includes('శ్వాస') ||
                 lowercaseQuery.includes('ಉಸಿರಾಟ') ||
                 lowercaseQuery.includes('ശ്വാസം') ||
                 lowercaseQuery.includes('श्वास') ||
                 lowercaseQuery.includes('শ্বাস') ||
                 lowercaseQuery.includes('શ્વાસ')) {
        detectedSpecialty = 'Pulmonology';
      } else if (lowercaseQuery.includes('icu') || lowercaseQuery.includes('bed') || lowercaseQuery.includes('ventilator') || lowercaseQuery.includes('emergency') || lowercaseQuery.includes('accident') || lowercaseQuery.includes('trauma') || lowercaseQuery.includes('injury')) {
        detectedSpecialty = 'Trauma';
      }

      // 1. Dispatch filter event to live-update the React UI list
      window.dispatchEvent(new CustomEvent('medflow-voice-filter', { 
        detail: { specialty: detectedSpecialty } 
      }));

      // 2. Localized responses matching selected language and specialty
      const responses: Record<AssistantLanguageCode, string> = {
        en: detectedSpecialty 
          ? `For ${detectedSpecialty === 'Trauma' ? 'Trauma and Emergency' : detectedSpecialty}, beds are available at Apollo and Fortis Hospital.`
          : "General Medicine filter applied. Searching matching resource hospitals.",
        hi: detectedSpecialty
          ? `${detectedSpecialty === 'Cardiology' ? 'कार्डियोलॉजी के लिए अपोलो और फोर्टिस में आईसीयू बेड उपलब्ध हैं' : detectedSpecialty === 'Trauma' ? 'ट्रॉमा और इमरजेंसी के लिए अपोलो और फोर्टिस में आईसीयू बेड उपलब्ध हैं' : detectedSpecialty === 'Nephrology' ? 'नेफ्रोलॉजी के लिए अपोलो और फोर्टिस में बेड उपलब्ध हैं' : detectedSpecialty === 'Pediatrics' ? 'पीडियाट्रिक्स के लिए फोर्टिस मल्लार में बेड उपलब्ध हैं' : 'पल्मोनोलॉजी के लिए फोर्टिस मल्लार और सेलम मेडिकल सेंटर में बेड उपलब्ध हैं'}`
          : "सामान्य चिकित्सा फ़िल्टर लागू किया गया। मिलान संसाधन अस्पतालों की खोज की जा रही है।",
        ta: detectedSpecialty
          ? `${detectedSpecialty === 'Cardiology' ? 'இதயவியல் சிகிச்சைக்காக அப்பல்லோ மருத்துவமனையில் படுக்கைகள் காலியாக உள்ளன' : detectedSpecialty === 'Trauma' ? 'விபத்து மற்றும் அவசர சிகிச்சைக்காக அப்பல்லோ மருத்துவமனையில் படுக்கைகள் காலியாக உள்ளன' : detectedSpecialty === 'Nephrology' ? 'சிறுநீரகவியல் சிகிச்சைக்காக அப்பல்லோ மருத்துவமனையில் படுக்கைகள் காலியாக உள்ளன' : detectedSpecialty === 'Pediatrics' ? 'குழந்தை நல சிகிச்சைக்காக ஃபோர்டிஸ் மலர் மருத்துவமனையில் படுக்கைகள் காலியாக உள்ளன' : 'நுரையீரல் சிகிச்சைக்காக ஃபோர்டிஸ் மலர் மருத்துவமனையில் படுக்கைகள் காலியாக உள்ளன'}`
          : "பொது மருத்துவம் வடிகட்டி பயன்படுத்தப்பட்டது. மருத்துவமனைகளைத் தேடுகிறது.",
        te: detectedSpecialty
          ? `${detectedSpecialty === 'Cardiology' ? 'కార్డియాలజీ కోసం అపోలో ఆసుపత్రిలో పడకలు అందుబాటులో ఉన్నాయి' : detectedSpecialty === 'Trauma' ? 'ట్రామా మరియు అత్యవసర చికిత్స కోసం అపోలో ఆసుపత్రిలో పడకలు అందుబాటులో ఉన్నాయి' : detectedSpecialty === 'Nephrology' ? 'నెఫ్రాలజీ కోసం అపోలో ఆసుపత్రిలో పడకలు అందుబాటులో ఉన్నాయి' : detectedSpecialty === 'Pediatrics' ? 'పిడియాట్రిక్స్ కోసం ఫోర్టిస్ మలార్ ఆసుపత్రిలో పడకలు అందుబాటులో ఉన్నాయి' : 'పల్మనాలజీ కోసం ఫోర్టిస్ మలార్ ఆసుపత్రిలో పడకలు అందుబాటులో ఉన్నాయి'}`
          : "జనరల్ మెడిసిన్ ఫిల్టర్ వర్తింపజేయబడింది. సరిపోలే ఆసుపత్రుల కోసం శోధిస్తోంది.",
        kn: detectedSpecialty
          ? `${detectedSpecialty === 'Cardiology' ? 'ಕಾರ್ಡಿಯಾಲಜಿಗಾಗಿ ಅಪೊಲೊ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಹಾಸಿಗೆಗಳು ಲಭ್ಯವಿವೆ' : detectedSpecialty === 'Trauma' ? 'ಟ್ರಾಮಾ ಮತ್ತು ತುರ್ತು ಚಿಕಿತ್ಸೆಗಾಗಿ ಅಪೊಲೊ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಹಾಸಿಗೆಗಳು ಲಭ್ಯವಿವೆ' : detectedSpecialty === 'Nephrology' ? 'ನೆಫ್ರಾಲಜಿಗಾಗಿ ಅಪೊಲೊ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಹಾಸಿಗೆಗಳು ಲಭ್ಯವಿವೆ' : detectedSpecialty === 'Pediatrics' ? 'ಪಿಡಿಯಾಟ್ರಿಕ್ಸ್ಗಾಗಿ ಫೋರ್ಟಿಸ್ ಮಲಾರ್ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಹಾಸಿಗೆಗಳು ಲಭ್ಯವಿವೆ' : 'ಪಲ್ಮನಾಲಜಿಗಾಗಿ ಫೋರ್ಟಿಸ್ ಮಲಾರ್ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಹಾಸಿಗೆಗಳು ಲಭ್ಯವಿವೆ'}`
          : "ಸಾಮಾನ್ಯ ಔಷಧ ಫಿಲ್ಟರ್ ಅನ್ವಯಿಸಲಾಗಿದೆ. ಹೊಂದಾಣಿಕೆಯ ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ.",
        ml: detectedSpecialty
          ? `${detectedSpecialty === 'Cardiology' ? 'കാർഡിയോളജിക്ക് അപ്പോളോ ആശുപത്രിയിൽ കിടക്കകൾ ലഭ്യമാണ്' : detectedSpecialty === 'Trauma' ? 'ട്രോമ, എമർജൻസി വിഭാഗങ്ങളിലേക്ക് അപ്പോളോ ആശുപത്രിയിൽ കിടക്കകൾ ലഭ്യമാണ്' : detectedSpecialty === 'Nephrology' ? 'നെഫ്രോളജിക്ക് അപ്പോളോ ആശുപത്രിയിൽ കിടക്കകൾ ലഭ്യമാണ്' : detectedSpecialty === 'Pediatrics' ? 'പീഡിയാട്രിക്സിന് ഫോർട്ടിസ് മലർ ആശുപത്രിയിൽ കിടക്കകൾ ലഭ്യമാണ്' : 'പൾമണോളജിക്ക് ഫോർട്ടിസ് മലർ ആശുപത്രിയിൽ കിടക്കകൾ ലഭ്യമാണ്'}`
          : "ജനറൽ മെഡിസിൻ ഫിൽട്ടർ പ്രയോഗിച്ചു. അനുയോജ്യമായ ആശുപത്രികൾ തിരയുന്നു.",
        mr: detectedSpecialty
          ? `${detectedSpecialty === 'Cardiology' ? 'कार्डिओलॉजीसाठी अपोलो हॉस्पिटलमध्ये बेड उपलब्ध आहेत' : detectedSpecialty === 'Trauma' ? 'ट्रॉमा आणि इमर्जन्सीसाठी अपोलो हॉस्पिटलमध्ये बेड उपलब्ध आहेत' : detectedSpecialty === 'Nephrology' ? 'नेफ्रोलॉजीसाठी अपोलो हॉस्पिटलमध्ये बेड उपलब्ध आहेत' : detectedSpecialty === 'Pediatrics' ? 'पीडियाट्रिक्ससाठी फोर्टिस मळार हॉस्पिटलमध्ये बेड उपलब्ध आहेत' : 'पल्मोनॉलॉजीसाठी फोर्टिस मळार हॉस्पिटलमध्ये बेड उपलब्ध आहेत'}`
          : "सामान्य औषध फिल्टर लागू केला. जुळणारे रुग्णालय शोधत आहे.",
        bn: detectedSpecialty
          ? `${detectedSpecialty === 'Cardiology' ? 'কার্ডিওলজির জন্য অ্যাপোলো হাসপাতালে শয্যা উপলব্ধ রয়েছে' : detectedSpecialty === 'Trauma' ? 'ট্রমা এবং জরুরি অবস্থার জন্য অ্যাপোলো হাসপাতালে শয্যা উপলব্ধ রয়েছে' : detectedSpecialty === 'Nephrology' ? 'নেফ্রোলজির জন্য অ্যাপোলো হাসপাতালে শয্যা উপলব্ধ রয়েছে' : detectedSpecialty === 'Pediatrics' ? 'পিডিয়াট্রিক্সের জন্য ফোর্টিস মালার হাসপাতালে শয্যা উপলব্ধ রয়েছে' : 'পালমোনোলজির জন্য ফোর্টিস মালার হাসপাতালে শয্যা উপলব্ধ রয়েছে'}`
          : "সাধারণ মেডিসিন ফিল্টার প্রয়োগ করা হয়েছে। অনুসন্ধান করা হচ্ছে।",
        gu: detectedSpecialty
          ? `${detectedSpecialty === 'Cardiology' ? 'કાર્ડિયોલોજી માટે એપોલો હોસ્પિટલમાં બેડ ઉપલબ્ધ છે' : detectedSpecialty === 'Trauma' ? 'ટ્રોમા અને ઇમરજન્સી માટે એપોલો હોસ્પિટલમાં બેડ ઉપલબ્ધ છે' : detectedSpecialty === 'Nephrology' ? 'નેફ્રોલોજી માટે એપોલો હોસ્પિટલમાં બેડ ઉપલબ્ધ છે' : detectedSpecialty === 'Pediatrics' ? 'પીડિયાટ્રિક્સ માટે ફોર્ટિસ મલાર હોસ્પિટલમાં બેડ ઉપલબ્ધ છે' : 'પલ્મોનોલોજી માટે ફોર્ટિસ મલાર હોસ્પિટલમાં બેડ ઉપલબ્ધ છે'}`
          : "જનરલ મેડિસિન ફિલ્ટર લાગુ કરવામાં આવ્યું છે. યોગ્ય હોસ્પિટલ શોધી રહ્યા છીએ."
      };

      responseText = responses[assistantLang] || responses.en;
      setBotResponse(responseText);
      setStatus('voice_assistant_speaking');
      await speakText(responseText);
    } catch (err) {
      console.error('[VoiceAssistant] Processing error:', err);
      setStatus('Sorry, I encountered an error. Please try again.');
      setLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? '/api' : 'http://localhost:8000/api');
      const rootUrl = apiBase.replace('/api', '');

      const ttsResponse = await fetch(`${rootUrl}/api/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          lang: assistantLang
        })
      });

      if (ttsResponse.ok) {
        const audioBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          setIsPlaying(true);
          audioRef.current.play();
          audioRef.current.onended = () => {
            setIsPlaying(false);
            setStatus('voice_assistant_welcome');
            setLoading(false);
          };
          return;
        }
      }
    } catch (err) {
      console.warn('[VoiceAssistant] Google TTS synthesis failed, using local speech fallback:', err);
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
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
      utterance.lang = langMap[assistantLang] || 'en-US';
      setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        setStatus('voice_assistant_welcome');
        setLoading(false);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        setStatus('voice_assistant_welcome');
        setLoading(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setStatus('voice_assistant_welcome');
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsOpen(false);
    setLoading(false);
  };

  const presetChips = [
    { label: "मुझे सीने में दर्द है (Hindi)", text: "मुझे सीने में दर्द है", lang: "hi" as AssistantLanguageCode },
    { label: "குழந்தை மருத்துவர் தேவை (Tamil)", text: "குழந்தை மருத்துவர் தேவை", lang: "ta" as AssistantLanguageCode },
    { label: "నాకు కిడ్నీ సమస్య ఉంది (Telugu)", text: "నాకు కిడ్నీ సమస్య ఉంది", lang: "te" as AssistantLanguageCode },
    { label: "Need ICU Bed (English)", text: "Need ICU Bed", lang: "en" as AssistantLanguageCode },
    { label: "ಕಿಡ್ನಿ ಸಮಸ್ಯೆ ಇದೆ (Kannada)", text: "ಕಿಡ್ನಿ ಸಮಸ್ಯೆ ಇದೆ", lang: "kn" as AssistantLanguageCode },
    { label: "എനിക്ക് ശ്വാസംമുട്ടൽ ഉണ്ട് (Malayalam)", text: "എനിക്ക് ശ്വാസംമുട്ടൽ ഉണ്ട്", lang: "ml" as AssistantLanguageCode },
    { label: "माझ्या छातीत दुखत आहे (Marathi)", text: "माझ्या छातीत दुखत आहे", lang: "mr" as AssistantLanguageCode },
    { label: "শিশু বিশেষজ্ঞ প্রয়োজন (Bengali)", text: "শিশু বিশেষজ্ঞ প্রয়োজন", lang: "bn" as AssistantLanguageCode },
    { label: "મને કિડનીની તકલીફ છે (Gujarati)", text: "મને કિડનીની તકલીફ છે", lang: "gu" as AssistantLanguageCode }
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
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d9488, #4f46e5)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title="Google Voice Assistant"
      >
        <Mic size={24} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '24px',
          width: '380px',
          maxHeight: '560px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0d9488, #4f46e5)',
            color: '#ffffff',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Google Voice Assistant</span>
            </div>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Input Language:</span>
              <select
                value={assistantLang}
                onChange={(e) => setAssistantLang(e.target.value as AssistantLanguageCode)}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Quick Preset Chips:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {presetChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetClick(chip)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

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

          <div style={{
            borderTop: '1px solid #e2e8f0',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            gap: '10px'
          }}>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: 'none',
                background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #0d9488, #4f46e5)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                transition: 'background-color 0.2s'
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
