import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'hi' | 'ta' | 'te';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  translateText: (text: string) => Promise<string>;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Static translations dictionary for standard UI elements
const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    "medflow_india": "MedFlow India",
    "hospital_finder": "Hospital Finder",
    "smart_emergency_referral": "Smart Emergency Referral",
    "ward_bed_grid": "Ward & Bed Grid",
    "ml_turnover_engine": "ML Turnover Engine",
    "abdm_fhir_standard": "ABDM / FHIR Standard",
    "state_command_center": "State Command Center",
    "digital_twin_simulator": "Digital Twin Simulator",
    "iot_telemetry": "IoT Telemetry",
    "blockchain_audit_chain": "Blockchain Audit Chain",
    "user_registry": "User Registry",
    "rural_ussd_sms": "Rural USSD/SMS",
    "sign_in_switch_role": "Sign In / Switch Role",
    "patient_portal": "Patient Portal",
    "hospital_staff_portal": "Hospital Staff Portal",
    "govt_command_portal": "Govt Command Portal",
    "exit": "Exit",
    "live_real_time_sync": "Live Real-Time Sync",
    "reconnecting": "Reconnecting...",
    "search_hospitals": "Search Hospitals",
    "district": "District",
    "specialty": "Specialty",
    "pmjay_only": "PM-JAY Only",
    "search_placeholder": "Search by name, district, or specialty...",
    "available_beds": "Available Beds",
    "icu_beds": "ICU Beds",
    "oxygen_status": "Oxygen Status",
    "blood_inventory": "Blood Inventory",
    "smart_referral_score": "Smart Referral Score",
    "route_patient": "Route Patient",
    "active_referrals": "Active Referrals",
    "predictions": "ML Turnover Predictions",
    "discharge_probability": "Discharge Probability within 12h",
    "vitals": "Patient Vitals",
    "simulation": "Simulation Run",
    "iot_telemetry_feed": "IoT Telemetry Feed",
    "audit_trail": "Audit Trail Logs",
    "export_fhir": "Export FHIR Bundle",
    "verify_abha": "Verify ABHA ID",
    "find_reserve_beds_title": "Find & Reserve Hospital Beds Across India in Real Time",
    "medflow_forecast_desc": "MedFlow forecasts beds likely to become available within 12 to 24 hours using ML length-of-stay algorithms, preventing emergency patient bouncing.",
    "predictive_engine_active": "Predictive Bed Turnover Engine Active",
    "hospitals_found_prefix": "Hospitals Found in",
    "live_map": "Live Geographic Resource Map",
    "general": "GENERAL",
    "icu_beds_cap": "ICU BEDS",
    "ventilators": "VENTILATORS",
    "oxygen_beds": "OXYGEN BEDS",
    "routing_title": "Multi-Criteria Emergency Patient Routing",
    "routing_desc": "Calculates real-time scores based on specialty match, doctor experience, distance, and live bed capacity.",
    "patient_name": "Patient Full Name",
    "patient_age": "Patient Age",
    "required_specialty": "Required Clinical Specialty",
    "origin_location": "Patient Origin Location (GPS)",
    "find_ranked_hospitals": "Find Ranked Referral Hospitals",
    "top_ranked_hospitals": "Top Ranked Candidate Hospitals (Specialty & Predicted Capacity Aware)",
    "score": "Score",
    "all_specialties": "All Specialties",
    "ayushman_eligible": "Ayushman Bharat / PM-JAY Eligible Only"
  },
  hi: {
    "medflow_india": "मेडफ्लो इंडिया",
    "hospital_finder": "अस्पताल खोजक",
    "smart_emergency_referral": "स्मार्ट आपातकालीन रेफरल",
    "ward_bed_grid": "वार्ड और बेड ग्रिड",
    "ml_turnover_engine": "एमएल टर्नओवर इंजन",
    "abdm_fhir_standard": "एबीडीएम / एफएचआईआर मानक",
    "state_command_center": "राज्य कमान केंद्र",
    "digital_twin_simulator": "डिजिटल ट्विन सिम्युलेटर",
    "iot_telemetry": "आईओटी टेलीमेट्री",
    "blockchain_audit_chain": "ब्लॉकचेन ऑडिट चेन",
    "user_registry": "उपयोगकर्ता रजिस्ट्री",
    "rural_ussd_sms": "ग्रामीण यूएसएसडी/एसएमएस",
    "sign_in_switch_role": "साइन इन / भूमिका बदलें",
    "patient_portal": "मरीज पोर्टल",
    "hospital_staff_portal": "अस्पताल स्टाफ पोर्टल",
    "govt_command_portal": "सरकारी कमान पोर्टल",
    "exit": "बाहर निकलें",
    "live_real_time_sync": "लाइव रीयल-टाइम सिंक",
    "reconnecting": "पुनः कनेक्ट हो रहा है...",
    "search_hospitals": "अस्पताल खोजें",
    "district": "जिला",
    "specialty": "विशेषज्ञता",
    "pmjay_only": "केवल पीएम-जय",
    "search_placeholder": "नाम, जिला या विशेषता से खोजें...",
    "available_beds": "उपलब्ध बेड",
    "icu_beds": "आईसीयू बेड",
    "oxygen_status": "ऑक्सीजन की स्थिति",
    "blood_inventory": "रक्त सूची",
    "smart_referral_score": "स्मार्ट रेफरल स्कोर",
    "route_patient": "मरीज को मार्ग निर्देशित करें",
    "active_referrals": "सक्रिय रेफरल",
    "predictions": "एमएल टर्नओवर भविष्यवाणियां",
    "discharge_probability": "12 घंटे के भीतर छुट्टी की संभावना",
    "vitals": "मरीज के महत्वपूर्ण लक्षण",
    "simulation": "सिमुलेशन रन",
    "iot_telemetry_feed": "आईओटी टेलीमेट्री फीड",
    "audit_trail": "ऑडिट ट्रेल लॉग",
    "export_fhir": "एफएचआईआर बंडल निर्यात करें",
    "verify_abha": "आभा आईडी सत्यापित करें",
    "find_reserve_beds_title": "वास्तविक समय में पूरे भारत में अस्पताल के बेड खोजें और आरक्षित करें",
    "medflow_forecast_desc": "मेडफ्लो एमएल लंबाई-ऑफ-स्टे एल्गोरिदम का उपयोग करके 12 से 24 घंटों के भीतर उपलब्ध होने वाले बेड का पूर्वानुमान लगाता है, जिससे आपातकालीन मरीजों को भटकना न पड़े।",
    "predictive_engine_active": "पूर्वानुमानित बेड टर्नओवर इंजन सक्रिय",
    "hospitals_found_prefix": "अस्पताल मिले",
    "live_map": "लाइव भौगोलिक संसाधन मानचित्र",
    "general": "सामान्य",
    "icu_beds_cap": "आईसीयू बेड",
    "ventilators": "वेंटिलेटर",
    "oxygen_beds": "ऑक्सीजन बेड",
    "routing_title": "बहु-मापदंड आपातकालीन रोगी रूटिंग",
    "routing_desc": "विशेषता मिलान, डॉक्टर अनुभव, दूरी और लाइव बेड क्षमता के आधार पर वास्तविक समय स्कोर की गणना करता है।",
    "patient_name": "मरीज का पूरा नाम",
    "patient_age": "मरीज की उम्र",
    "required_specialty": "आवश्यक नैदानिक विशेषता",
    "origin_location": "मरीज का मूल स्थान (जीपीएस)",
    "find_ranked_hospitals": "रैंक वाले रेफरल अस्पताल खोजें",
    "top_ranked_hospitals": "शीर्ष रैंक वाले उम्मीदवार अस्पताल (विशेषज्ञता और अनुमानित क्षमता जागरूक)",
    "score": "स्कोर",
    "all_specialties": "सभी विशेषताएं",
    "ayushman_eligible": "केवल आयुष्मान भारत / पीएम-जय पात्र"
  },
  ta: {
    "medflow_india": "மெட்ஃப்ளோ இந்தியா",
    "hospital_finder": "மருத்துவமனை கண்டறிவி",
    "smart_emergency_referral": "ஸ்மார்ட் அவசர பரிந்துரை",
    "ward_bed_grid": "வார்டு மற்றும் படுக்கை கட்டம்",
    "ml_turnover_engine": "எம்.எல் படுக்கை சுழற்சி இயந்திரம்",
    "abdm_fhir_standard": "ஏபிடிஎம் / எஃப்ஹெச்ஐஆர் தரநிலை",
    "state_command_center": "மாநில கட்டளை மையம்",
    "digital_twin_simulator": "டிஜிட்டல் இரட்டை உருவகப்படுத்துதல்",
    "iot_telemetry": "ஐஓடி டெலிமெட்ரி",
    "blockchain_audit_chain": "பிளாக்செயின் தணிக்கை சங்கிலி",
    "user_registry": "பயனர் பதிவேடு",
    "rural_ussd_sms": "கிராமப்புற யுஎஸ்எஸ்டி/எஸ்எம்எஸ்",
    "sign_in_switch_role": "உள்நுழைக / பாத்திரத்தை மாற்றுக",
    "patient_portal": "நோயாளி போர்டல்",
    "hospital_staff_portal": "மருத்துவமனை ஊழியர் போர்டல்",
    "govt_command_portal": "அரசு கட்டளை போர்டல்",
    "exit": "வெளியேறு",
    "live_real_time_sync": "நேரடி நிகழ்நேர ஒத்திசைவு",
    "reconnecting": "மீண்டும் இணைக்கிறது...",
    "search_hospitals": "மருத்துவமனைகளைத் தேடு",
    "district": "மாவட்டம்",
    "specialty": "சிறப்புத் துறை",
    "pmjay_only": "பிஎம்-ஜேஏஒய் மட்டும்",
    "search_placeholder": "பெயர், மாவட்டம் அல்லது சிறப்புத் துறை மூலம் தேடுக...",
    "available_beds": "கிடைக்கக்கூடிய படுக்கைகள்",
    "icu_beds": "ஐசியூ படுக்கைகள்",
    "oxygen_status": "ஆக்ஸிஜன் நிலை",
    "blood_inventory": "இரத்த இருப்பு",
    "smart_referral_score": "ஸ்மார்ட் பரிந்துரை மதிப்பெண்",
    "route_patient": "நோயாளிக்கு வழிகாட்டு",
    "active_referrals": "செயலில் உள்ள பரிந்துரைகள்",
    "predictions": "எம்.எல் படுக்கை சுழற்சி கணிப்புகள்",
    "discharge_probability": "12 மணி நேரத்திற்குள் வெளியேற்றப்படும் வாய்ப்பு",
    "vitals": "நோயாளியின் முக்கிய அளவீடுகள்",
    "simulation": "உருவகப்படுத்துதல் ஓட்டம்",
    "iot_telemetry_feed": "ஐஓடி டெலிமெட்ரி ஊட்டம்",
    "audit_trail": "தணிக்கை பதிவு பதிவுகள்",
    "export_fhir": "எஃப்ஹெச்ஐஆர் பண்டிலை ஏற்றுமதி செய்",
    "verify_abha": "ஏபிஹெச்ஏ ஐடியை சரிபார்",
    "find_reserve_beds_title": "இந்தியாவில் உள்ள படுக்கைகளை நிகழ்நேரத்தில் கண்டறிந்து முன்பதிவு செய்யுங்கள்",
    "medflow_forecast_desc": "மெட்ஃப்ளோ அல்காரிதம் மூலம் 12 முதல் 24 மணி நேரத்திற்குள் கிடைக்கக்கூடிய படுக்கைகளை கணித்து நோயாளிகள் அலைக்கழிக்கப்படுவதை தடுக்கிறது.",
    "predictive_engine_active": "படுக்கை சுழற்சி கணிப்பு இயந்திரம் செயல்பாட்டில் உள்ளது",
    "hospitals_found_prefix": "மருத்துவமனைகள் கண்டறியப்பட்டன",
    "live_map": "நேரடி புவியியல் வள வரைபடம்",
    "general": "பொது",
    "icu_beds_cap": "ஐசியூ படுக்கைகள்",
    "ventilators": "செயற்கை சுவாசக் கருவிகள்",
    "oxygen_beds": "ஆக்ஸிஜன் படுக்கைகள்",
    "routing_title": "பல்வேறு அளவுகோல் அவசர நோயாளி வழிகாட்டுதல்",
    "routing_desc": "சிறப்புத் துறை பொருத்தம், மருத்துவர் அனுபவம், தூரம் மற்றும் நேரடி படுக்கை திறன் ஆகியவற்றின் அடிப்படையில் நிகழ்நேர மதிப்பெண்களைக் கணக்கிடுகிறது.",
    "patient_name": "நோயாளியின் முழு பெயர்",
    "patient_age": "நோயாளியின் வயது",
    "required_specialty": "தேவைப்படும் சிறப்புத் துறை",
    "origin_location": "நோயாளியின் தற்போதைய இருப்பிடம் (ஜிபிஎஸ்)",
    "find_ranked_hospitals": "பரிந்துரைக்கப்படும் மருத்துவமனைகளைக் கண்டறி",
    "top_ranked_hospitals": "முன்னணி பரிந்துரை மருத்துவமனைகள் (சிறப்புத் துறை மற்றும் படுக்கை கணிப்புகள் அறிந்தது)",
    "score": "மதிப்பெண்",
    "all_specialties": "அனைத்து சிறப்புத் துறைகளும்",
    "ayushman_eligible": "ஆயுஷ்மான் பாரத் / பிஎம்-ஜேஏஒய் தகுதி மட்டும்"
  },
  te: {
    "medflow_india": "మెడ్‌ఫ్లో ఇండియా",
    "hospital_finder": "హాస్పిటల్ ఫైండర్",
    "smart_emergency_referral": "స్మార్ట్ అత్యవసర సిఫార్సు",
    "ward_bed_grid": "వార్డు & బెడ్ గ్రిడ్",
    "ml_turnover_engine": "ఎమ్ఎల్ టర్నోవర్ ఇంజన్",
    "abdm_fhir_standard": "ఏబిడిఎమ్ / ఎఫ్‌హెచ్ఐఆర్ ప్రమాణం",
    "state_command_center": "రాష్ట్ర కమాండ్ సెంటర్",
    "digital_twin_simulator": "డిజిటల్ ట్విన్ సిమ్యులేటర్",
    "iot_telemetry": "ఐఓటి టెలిమెట్రీ",
    "blockchain_audit_chain": "బ్లాక్‌చైన్ ఆడిట్ చైన్",
    "user_registry": "యూజర్ రిజిస్ట్రీ",
    "rural_ussd_sms": "రూరల్ యూఎస్ఎస్డి/ఎస్ఎమ్ఎస్",
    "sign_in_switch_role": "లాగిన్ / రోల్ మార్చండి",
    "patient_portal": "పేషెంట్ పోర్టల్",
    "hospital_staff_portal": "హాస్పిటల్ స్టాఫ్ పోర్టల్",
    "govt_command_portal": "ప్రభుత్వ కమాండ్ పోర్టల్",
    "exit": "నిష్క్రమించు",
    "live_real_time_sync": "లైవ్ రియల్-టైమ్ సమకాలీకరణ",
    "reconnecting": "మళ్లీ కనెక్ట్ అవుతోంది...",
    "search_hospitals": "ఆసుపత్రుల శోధన",
    "district": "జిల్లా",
    "specialty": "ప్రత్యేకత",
    "pmjay_only": "PM-JAY మాత్రమే",
    "search_placeholder": "పేరు, జిల్లా లేదా ప్రత్యేకత ద్వారా శోధించండి...",
    "available_beds": "అందుబాటులో ఉన్న పడకలు",
    "icu_beds": "ఐసీయూ పడకలు",
    "oxygen_status": "ఆక్సిజన్ పరిస్థితి",
    "blood_inventory": "రక్తం నిల్వలు",
    "smart_referral_score": "స్మార్ట్ రెఫరల్ స్కోరు",
    "route_patient": "రోగిని మళ్ళించు",
    "active_referrals": "యాక్టివ్ రెఫరల్స్",
    "predictions": "ఎమ్ఎల్ టర్నోవర్ అంచనాలు",
    "discharge_probability": "12 గంటల్లో డిశ్చార్జ్ అయ్యే అవకాశం",
    "vitals": "రోగి కీలక పరామితులు",
    "simulation": "సిమ్యులేషన్ రన్",
    "iot_telemetry_feed": "ఐఓటి టెలిమెట్రీ ఫీడ్",
    "audit_trail": "ఆడిట్ ట్రైల్ లాగ్స్",
    "export_fhir": "ఎఫ్హెచ్ఐఆర్ బండిల్ ఎగుమతి",
    "verify_abha": "ఆభా ఐడీ ధృవీకరించు",
    "find_reserve_beds_title": "భారతదేశం అంతటా ఆసుపత్రి పడకలను నిజ సమయములో కనుగొనండి మరియు రిజర్వ్ చేసుకోండి",
    "medflow_forecast_desc": "మెడ్‌ఫ్లో ఎమ్మెల్ లెంగ్త్-ఆఫ్-స్టే అల్గారిథమ్‌లను ఉపయోగించి 12 నుండి 24 గంటలలోపు అందుబాటులోకి వచ్చే పడకలను అంచనా వేస్తుంది.",
    "predictive_engine_active": "పడకల టర్నోవర్ అంచనా ఇంజిన్ యాక్టివ్‌గా ఉంది",
    "hospitals_found_prefix": "ఆసుపత్రులు కనుగొనబడ్డాయి",
    "live_map": "లైవ్ జియోగ్రాఫిక్ రిసోర్స్ మ్యాప్",
    "general": "సాధారణ",
    "icu_beds_cap": "ఐసీయూ పడకలు",
    "ventilators": "వెంటిలేటర్లు",
    "oxygen_beds": "ఆక్సిజన్ పడకలు",
    "routing_title": "మల్టీ-క్రైటీరియా అత్యవసర రోగి రౌటింగ్",
    "routing_desc": "ప్రత్యేకత మ్యాచ్, డాక్టర్ అనుభవం, దూరం మరియు లైవ్ బెడ్ కెపాసిటీ ఆధారంగా నిజ-సమయ స్కోర్‌లను లెక్కిస్తుంది.",
    "patient_name": "రోగి పూర్తి పేరు",
    "patient_age": "రోగి వయస్సు",
    "required_specialty": "అవసరమైన క్లినికల్ స్పెషాలిటీ",
    "origin_location": "రోగి మూల స్థానం (జీపీఎస్)",
    "find_ranked_hospitals": "ర్యాంక్ పొందిన రిఫరల్ ఆసుపత్రులను కనుగొనండి",
    "top_ranked_hospitals": "టాప్ ర్యాంక్ అభ్యర్థి ఆసుపత్రులు (స్పెషాలిటీ & అంచనా వేసిన సామర్థ్యం తెలిసినవి)",
    "score": "స్కోరు",
    "all_specialties": "అన్ని ప్రత్యేకతలు",
    "ayushman_eligible": "ఆయుష్మాన్ భారత్ / పీఎమ్-జేఏవై అర్హులు మాత్రమే"
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    return (localStorage.getItem('medflow_language') as LanguageCode) || 'en';
  });
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('medflow_language', lang);
  };

  // Static translate helper
  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[language]?.[key] || fallback || TRANSLATIONS['en']?.[key] || key;
  };

  // Dynamic translate helper
  const translateText = async (text: string): Promise<string> => {
    if (language === 'en') return text;
    
    // Quick cache check in static translations
    for (const [key, val] of Object.entries(TRANSLATIONS['en'] || {})) {
      if (val.toLowerCase() === text.toLowerCase()) {
        return t(key);
      }
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateText, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
