import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../../data/services/api_service.dart';

class VoiceMultilingualScreen extends StatefulWidget {
  final ApiService apiService;
  final Function(String specialty)? onSpecialtyMatched;
  
  const VoiceMultilingualScreen({
    super.key, 
    required this.apiService, 
    this.onSpecialtyMatched
  });

  @override
  State<VoiceMultilingualScreen> createState() => _VoiceMultilingualScreenState();
}

class _VoiceMultilingualScreenState extends State<VoiceMultilingualScreen> {
  String _selectedLang = 'en';
  bool _isListening = false;
  bool _isProcessing = false;
  String _userTranscript = '';
  String _aiResponse = '';
  String _englishRef = '';
  
  final _textController = TextEditingController();
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _speechEnabled = false;

  // Local static translation dictionary for the mobile UI elements
  final Map<String, Map<String, String>> _localizations = {
    'en': {
      'welcome_msg': 'Hello! I am your MedFlow Voice Assistant. How can I help you today?',
      'listening_msg': 'Listening... Speak now.',
      'processing_msg': 'Processing your request with Bhashini...',
      'tap_to_speak': 'Tap Mic to Speak (supports native voice)',
      'tap_to_stop': 'Tap to Stop Recording',
      'language_label': 'Voice Input Language:',
      'transcript_header': 'Your Transcript:',
      'response_header': 'MedFlow Response:',
      'speech_fallback': 'Playing local audio output...',
    },
    'hi': {
      'welcome_msg': 'नमस्ते! मैं आपका मेडफ्लो वॉयस असिस्टेंट हूं। आज मैं आपकी क्या मदद कर सकता हूं?',
      'listening_msg': 'सुन रहा हूँ... अब बोलें।',
      'processing_msg': 'भाषिणी के साथ आपके अनुरोध पर कार्रवाई की जा रही है...',
      'tap_to_speak': 'बोलने के लिए माइक दबाएं',
      'tap_to_stop': 'रिकॉर्डिंग रोकने के लिए दबाएं',
      'language_label': 'आवाज इनपुट भाषा:',
      'transcript_header': 'आपका ट्रांसक्रिप्ट:',
      'response_header': 'मेडफ्लो उत्तर:',
      'speech_fallback': 'स्थानीय ऑडियो आउटपुट बज रहा है...',
    },
    'ta': {
      'welcome_msg': 'வணக்கம்! நான் உங்கள் மெட்ஃப்ளோ குரல் உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
      'listening_msg': 'கேட்கிறது... இப்போது பேசுங்கள்.',
      'processing_msg': 'பாஷிணி மூலம் உங்கள் கோரிக்கையைச் செயலாக்குகிறது...',
      'tap_to_speak': 'பேச மைக் தட்டவும்',
      'tap_to_stop': 'பதிவை நிறுத்த தட்டவும்',
      'language_label': 'குரல் உள்ளீட்டு மொழி:',
      'transcript_header': 'உங்கள் டிரான்ஸ்கிரிப்ட்:',
      'response_header': 'மெட்ஃப்ளோ பதில்:',
      'speech_fallback': 'உள்ளூர் ஆடியோ வெளியீடு ஒலிக்கிறது...',
    },
    'te': {
      'welcome_msg': 'నమస్తే! నేను మీ మెడ్‌ఫ్లో వాయిస్ అసిస్టెంట్‌ని. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?',
      'listening_msg': 'వింటున్నాను... ఇప్పుడు మాట్లాడండి.',
      'processing_msg': 'భాషిణితో మీ అభ్యర్థన ప్రాసెస్ చేయబడుతోంది...',
      'tap_to_speak': 'మాట్లాడటానికి మైక్ నొక్కండి',
      'tap_to_stop': 'రికార్డింగ్ ఆపడానికి నొక్కండి',
      'language_label': 'వాయిస్ ఇన్‌పుట్ భాష:',
      'transcript_header': 'మీ ట్రాన్స్క్రిప్ట్:',
      'response_header': 'మెడ్‌ఫ్లో ప్రతిస్పందన:',
      'speech_fallback': 'స్థానిక ఆడియో అవుట్‌పుట్ ప్లే అవుతోంది...',
    }
  };

  final List<Map<String, String>> _quickPrompts = [
    {
      'label': 'मुझे सीने में दर्द है (Cardio)',
      'text': 'मुझे सीने में दर्द है',
      'lang': 'hi'
    },
    {
      'label': 'குழந்தை மருத்துவர் தேவை (Pediatric)',
      'text': 'குழந்தை மருத்துவர் தேவை',
      'lang': 'ta'
    },
    {
      'label': 'Need ICU Bed (ICU)',
      'text': 'Need ICU Bed',
      'lang': 'en'
    }
  ];

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    try {
      _speechEnabled = await _speech.initialize(
        onError: (val) => print('[stt] Initialization error: $val'),
        onStatus: (val) => print('[stt] Status: $val'),
      );
      setState(() {});
    } catch (e) {
      print('[stt] Initialization failed: $e');
    }
  }

  String _getTxt(String key) {
    return _localizations[_selectedLang]?[key] ?? _localizations['en']?[key] ?? key;
  }

  Future<void> _toggleListening() async {
    if (_isListening) {
      await _stopListening();
    } else {
      await _startListening();
    }
  }

  Future<void> _startListening() async {
    setState(() {
      _isListening = true;
      _userTranscript = '';
      _aiResponse = '';
      _englishRef = '';
    });

    if (_speechEnabled) {
      final langMap = {
        'en': 'en_IN',
        'hi': 'hi_IN',
        'ta': 'ta_IN',
        'te': 'te_IN',
      };
      final localeId = langMap[_selectedLang] ?? 'en_US';
      
      await _speech.listen(
        onResult: (val) {
          setState(() {
            _userTranscript = val.recognizedWords;
          });
        },
        localeId: localeId,
        listenFor: const Duration(seconds: 8),
      );
    } else {
      // Fallback: short simulated speech capture for demo presentation
      print('[stt] Native STT is not enabled/available. Running simulated voice capture.');
    }
  }

  Future<void> _stopListening() async {
    if (_speechEnabled) {
      await _speech.stop();
    }
    
    setState(() {
      _isListening = false;
      _isProcessing = true;
    });

    if (_userTranscript.isNotEmpty) {
      await _processSpeechText(_userTranscript);
    } else {
      // Simulate input based on selected language if no voice was recorded/recognized
      final mockSamples = {
        'en': 'Need ICU Bed',
        'hi': 'अस्पताल में ऑक्सीजन की उपलब्धता क्या है',
        'ta': 'எனக்கு படுக்கை வசதி வேண்டும்',
        'te': 'బెడ్స్ ఖాళీగా ఉన్నాయా'
      };
      final sample = mockSamples[_selectedLang] ?? 'Show me bed availability';
      setState(() {
        _userTranscript = sample;
      });
      await _processSpeechText(sample);
    }
  }

  Future<void> _triggerQuickPrompt(String text, String lang) async {
    setState(() {
      _selectedLang = lang;
      _isProcessing = true;
      _userTranscript = text;
      _aiResponse = '';
      _englishRef = '';
    });
    await _processSpeechText(text);
  }

  Future<void> _processManualText() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    _textController.clear();
    
    setState(() {
      _isProcessing = true;
      _userTranscript = text;
      _aiResponse = '';
      _englishRef = '';
    });
    await _processSpeechText(text);
  }

  Future<void> _processSpeechText(String transcription) async {
    try {
      // 1. Translate to English for routing
      String englishQuery = transcription;
      if (_selectedLang != 'en') {
        englishQuery = await widget.apiService.translateText(transcription, _selectedLang, 'en');
      }

      setState(() {
        _englishRef = 'English query: "$englishQuery"';
      });

      // 2. Process query through Simulated MedFlow Router
      String englishResponse = "I understand your query. Let me query the real-time resource data.";
      final lowerQuery = englishQuery.toLowerCase();
      String matchedSpecialty = '';

      if (lowerQuery.contains('bed') || lowerQuery.contains('hospital') || lowerQuery.contains('icu') || lowerQuery.contains('patient')) {
        englishResponse = "Currently, general ward has 24 vacant beds, ICU has 5 vacant beds. Recommend routing to General Hospital Coimbatore.";
      } 
      
      if (lowerQuery.contains('heart') || lowerQuery.contains('cardio') || lowerQuery.contains('ecg') || lowerQuery.contains('chest') || lowerQuery.contains('pain')) {
        englishResponse = "Cardiology specialty matched. PSG Institute has 14 ICU beds available.";
        matchedSpecialty = 'Cardiology';
      } else if (lowerQuery.contains('breath') || lowerQuery.contains('lung') || lowerQuery.contains('cough') || lowerQuery.contains('asthma') || lowerQuery.contains('oxygen')) {
        englishResponse = "Pulmonology specialty matched. PSG Institute has 15 oxygen beds available.";
        matchedSpecialty = 'Pulmonology';
      } else if (lowerQuery.contains('child') || lowerQuery.contains('pediatric') || lowerQuery.contains('baby') || lowerQuery.contains('fever') || lowerQuery.contains('குழந்தை')) {
        englishResponse = "Pediatrics specialty matched. Coimbatore General Hospital has 12 general beds available.";
        matchedSpecialty = 'Pediatrics';
      } else if (lowerQuery.contains('blood') || lowerQuery.contains('anemia')) {
        matchedSpecialty = 'Hematology';
      } else if (lowerQuery.contains('kidney') || lowerQuery.contains('renal')) {
        matchedSpecialty = 'Nephrology';
      }

      // 3. Translate response back to user language
      String localResponse = englishResponse;
      if (_selectedLang != 'en') {
        localResponse = await widget.apiService.translateText(englishResponse, 'en', _selectedLang);
      }

      setState(() {
        _aiResponse = localResponse;
        _isProcessing = false;
      });

      // 4. Trigger Text-To-Speech (TTS)
      final ttsAudioBase64 = await widget.apiService.textToSpeech(localResponse, _selectedLang);
      if (ttsAudioBase64.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_getTxt('speech_fallback'))),
        );
      }

      // 5. Automatically route to Hospital Finder with filter if specialty matched
      if (matchedSpecialty.isNotEmpty && widget.onSpecialtyMatched != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Auto-filtering Hospital Finder for: $matchedSpecialty'),
            backgroundColor: Colors.teal,
            duration: const Duration(seconds: 2),
          ),
        );
        Future.delayed(const Duration(milliseconds: 1500), () {
          widget.onSpecialtyMatched!(matchedSpecialty);
        });
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _aiResponse = 'Error processing voice query: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice Assistant (Sarvam AI)', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Header Language Selector
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _getTxt('language_label'),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    DropdownButton<String>(
                      value: _selectedLang,
                      iconEnabledColor: Colors.teal,
                      underline: Container(),
                      items: const [
                        DropdownMenuItem(value: 'en', child: Text('English')),
                        DropdownMenuItem(value: 'hi', child: Text('हिंदी (Hindi)')),
                        DropdownMenuItem(value: 'ta', child: Text('தமிழ் (Tamil)')),
                        DropdownMenuItem(value: 'te', child: Text('తెలుగు (Telugu)')),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedLang = val;
                            _userTranscript = '';
                            _aiResponse = '';
                            _englishRef = '';
                          });
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Pre-built Quick Prompt Chips
            const Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: EdgeInsets.only(left: 4.0, bottom: 6.0),
                child: Text('Quick Test Prompts:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.teal, fontSize: 13)),
              ),
            ),
            Wrap(
              spacing: 8.0,
              runSpacing: 4.0,
              children: _quickPrompts.map((prompt) {
                return ActionChip(
                  label: Text(prompt['label']!, style: const TextStyle(fontSize: 12)),
                  backgroundColor: Colors.teal.shade50.withOpacity(0.5),
                  onPressed: () => _triggerQuickPrompt(prompt['text']!, prompt['lang']!),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),

            // Conversational Window
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.teal.shade50.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.teal.shade100),
                ),
                child: Column(
                  children: [
                    // Status
                    Text(
                      _isListening
                          ? _getTxt('listening_msg')
                          : _isProcessing
                              ? _getTxt('processing_msg')
                              : _getTxt('welcome_msg'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _isListening ? Colors.red : Colors.teal.shade800,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Transcripts
                    if (_userTranscript.isNotEmpty) ...[
                      Align(
                        alignment: Alignment.centerRight,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(_getTxt('transcript_header'), style: const TextStyle(fontSize: 10, color: Colors.black54)),
                              const SizedBox(height: 4),
                              Text(_userTranscript, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                    ],

                    if (_englishRef.isNotEmpty) ...[
                      Text(_englishRef, style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey)),
                      const SizedBox(height: 8),
                    ],

                    if (_aiResponse.isNotEmpty) ...[
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_getTxt('response_header'), style: const TextStyle(fontSize: 10, color: Colors.black54)),
                              const SizedBox(height: 4),
                              Text(_aiResponse, style: const TextStyle(fontSize: 14, height: 1.4)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Keyboard/Text Input Fallback Row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: InputDecoration(
                      hintText: 'Type query (English/Hindi/Tamil)...',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: const BorderSide(color: Colors.grey),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: const BorderSide(color: Colors.teal, width: 1.5),
                      ),
                    ),
                    onSubmitted: (_) => _processManualText(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send, color: Colors.teal),
                  onPressed: _processManualText,
                )
              ],
            ),
            const SizedBox(height: 16),

            // Recording Controls
            Column(
              children: [
                GestureDetector(
                  onTap: _isProcessing ? null : _toggleListening,
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isListening ? Colors.red : Colors.teal,
                      boxShadow: [
                        BoxShadow(
                          color: (_isListening ? Colors.red : Colors.teal).withOpacity(0.3),
                          spreadRadius: 2,
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Icon(
                      _isListening ? Icons.mic_off : Icons.mic,
                      size: 32,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _isListening ? _getTxt('tap_to_stop') : _getTxt('tap_to_speak'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black54),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
