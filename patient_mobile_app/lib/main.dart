import 'package:flutter/material.dart';
import 'data/services/api_service.dart';
import 'ui/screens/hospital_finder_screen.dart';
import 'ui/screens/report_scanner_screen.dart';
import 'ui/screens/voice_multilingual_screen.dart';

void main() {
  runApp(const MedFlowPatientApp());
}

class MedFlowPatientApp extends StatelessWidget {
  const MedFlowPatientApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MedFlow India',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      debugShowCheckedModeBanner: false,
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;
  final ApiService _apiService = ApiService();
  final GlobalKey<HospitalFinderScreenState> _hospitalFinderKey = GlobalKey<HospitalFinderScreenState>();
  late List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      HospitalFinderScreen(key: _hospitalFinderKey, apiService: _apiService),
      ReportScannerScreen(apiService: _apiService),
      VoiceMultilingualScreen(
        apiService: _apiService,
        onSpecialtyMatched: (specialty) {
          setState(() {
            _currentIndex = 0;
          });
          _hospitalFinderKey.currentState?.applyFilter(specialty);
        },
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: Colors.teal,
        unselectedItemColor: Colors.grey,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.local_hospital),
            label: 'Hospital Finder',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.document_scanner),
            label: 'Report Scanner',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.mic),
            label: 'Voice Assistant',
          ),
        ],
      ),
    );
  }
}
