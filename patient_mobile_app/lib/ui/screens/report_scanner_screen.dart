import 'package:file_picker/file_picker.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:io' as io;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../data/services/api_service.dart';

class ReportScannerScreen extends StatefulWidget {
  final ApiService apiService;
  const ReportScannerScreen({super.key, required this.apiService});

  @override
  State<ReportScannerScreen> createState() => _ReportScannerScreenState();
}

class _ReportScannerScreenState extends State<ReportScannerScreen> {
  bool _isScanning = false;
  double _scanProgress = 0.0;
  Timer? _scanTimer;

  // Analysis result states
  String _ocrText = '';
  String _keyFindings = '';
  String _detectedSpecialty = '';
  String _urgencyLevel = '';
  List<dynamic> _rankedHospitals = [];
  String _selectedReportName = '';

  final ImagePicker _picker = ImagePicker();

  Future<void> _pickFromCamera() async {
    try {
      final XFile? photo = await _picker.pickImage(source: ImageSource.camera);
      if (photo != null) {
        final bytes = await photo.readAsBytes();
        _triggerScan(bytes, photo.name);
      }
    } catch (e) {
      print('Camera pick error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to capture image: $e')),
      );
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        final bytes = await image.readAsBytes();
        _triggerScan(bytes, image.name);
      }
    } catch (e) {
      print('Gallery pick error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to select photo: $e')),
      );
    }
  }

  Future<void> _pickFile() async {
    try {
      final FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg'],
        withData: true, // Needed for Flutter Web to load bytes
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final bytes = file.bytes ?? (file.path != null ? await io.File(file.path!).readAsBytes() : null);
        if (bytes != null) {
          _triggerScan(bytes, file.name);
        } else {
          throw Exception('Could not retrieve file bytes.');
        }
      }
    } catch (e) {
      print('File pick error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to select file: $e')),
      );
    }
  }

  void _triggerScan(List<int> bytes, String fileName) {
    setState(() {
      _selectedReportName = fileName;
      _isScanning = true;
      _scanProgress = 0.0;
      _ocrText = '';
      _keyFindings = '';
      _detectedSpecialty = '';
      _urgencyLevel = '';
      _rankedHospitals = [];
    });

    // Run a 2-second scanning animation timer
    const totalTicks = 20;
    int currentTick = 0;
    _scanTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) async {
      currentTick++;
      setState(() {
        _scanProgress = currentTick / totalTicks;
      });

      if (currentTick >= totalTicks) {
        timer.cancel();
        await _fetchAnalysis(bytes, fileName);
      }
    });
  }

  Future<void> _fetchAnalysis(List<int> bytes, String fileName) async {
    try {
      // Call Second Opinion analysis endpoint with real picked file bytes
      final result = await widget.apiService.analyzeAndRecommend(
        bytes,
        fileName,
      );

      setState(() {
        _ocrText = result['extracted_text'] ?? '';
        _keyFindings = result['key_findings'] ?? '';
        _detectedSpecialty = result['recommended_specialty'] ?? '';
        _urgencyLevel = result['urgency_level'] ?? 'Routine';
        _rankedHospitals = result['ranked_hospitals'] ?? [];
        _isScanning = false;
      });
    } catch (e) {
      setState(() {
        _isScanning = false;
        _ocrText = 'Failed to analyze report: $e';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to analyze report: $e')),
      );
    }
  }

  Color _getUrgencyColor(String urgency) {
    switch (urgency.toLowerCase()) {
      case 'emergency':
        return Colors.red;
      case 'urgent':
        return Colors.orange;
      case 'routine':
      default:
        return Colors.green;
    }
  }

  @override
  void dispose() {
    _scanTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Report Scanner & Second Opinion', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Upload zone widget always visible at top
            _buildUploadZone(),
            const SizedBox(height: 20),

            // Scanning loader animation
            if (_isScanning) _buildScanningAnimation(),

            // Empty state if not scanning and no results
            if (!_isScanning && _keyFindings.isEmpty) _buildEmptyState(),

            // Display results if scanning complete and data exists
            if (!_isScanning && _keyFindings.isNotEmpty) _buildResultsView(),
          ],
        ),
      ),
    );
  }

  Widget _buildUploadZone() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24.0),
      decoration: BoxDecoration(
        color: Colors.teal.shade50.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.teal.shade200, width: 1.5),
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_upload_outlined, size: 48, color: Colors.teal),
          const SizedBox(height: 12),
          const Text(
            'Upload Prescription or Medical Report',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.teal),
          ),
          const SizedBox(height: 8),
          Text(
            'Scan to get second-opinion recommendations from specialists nearby',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildSourceButton(
                icon: Icons.camera_alt,
                label: 'Camera',
                onPressed: _pickFromCamera,
              ),
              _buildSourceButton(
                icon: Icons.photo_library,
                label: 'Gallery',
                onPressed: _pickFromGallery,
              ),
              _buildSourceButton(
                icon: Icons.folder,
                label: 'Browse Files',
                onPressed: _pickFile,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 60.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.assignment_late_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Text(
              'Please upload a prescription or medical report to scan for second-opinion recommendations',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 13, height: 1.4, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScanningAnimation() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Center(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 72,
                    height: 72,
                    child: CircularProgressIndicator(
                      strokeWidth: 5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.teal),
                    ),
                  ),
                  Icon(Icons.document_scanner, size: 32, color: Colors.teal),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'AI OCR Report Analysis In Progress...',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.teal),
            ),
            const SizedBox(height: 6),
            Text(
              'Extracting medical keys & computing second-opinion weights...',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: _scanProgress,
                backgroundColor: Colors.teal.shade50,
                color: Colors.teal,
                minHeight: 6,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary Badge Card
        Card(
          color: Colors.teal.shade50.withOpacity(0.3),
          shape: RoundedRectangleBorder(
            side: BorderSide(color: Colors.teal.shade200),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('AI Triage Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.teal)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getUrgencyColor(_urgencyLevel).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _getUrgencyColor(_urgencyLevel)),
                      ),
                      child: Text(
                        _urgencyLevel.toUpperCase(),
                        style: TextStyle(
                          color: _getUrgencyColor(_urgencyLevel),
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 20),
                Row(
                  children: [
                    const Text('Detected Specialty: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    Chip(
                      label: Text(_detectedSpecialty, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      backgroundColor: Colors.teal,
                      padding: EdgeInsets.zero,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text('Key Findings:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                Text(
                  _keyFindings,
                  style: const TextStyle(fontSize: 13, height: 1.4, fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Hospital List Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Ranked Second Opinion Recommendations',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.teal),
            ),
            Icon(Icons.sort, color: Colors.teal.shade700, size: 18),
          ],
        ),
        const SizedBox(height: 10),

        // Recommendation Hospital Cards
        ..._rankedHospitals.map((hosp) {
          final score = hosp['score'] ?? 0.0;
          final availableBeds = hosp['available_beds'] ?? 0;
          final dist = hosp['distance_km'] ?? 0.0;
          final isSpecialtyMatch = hosp['specialty_match'] == true;

          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            elevation: 3,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Score Header Row
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.teal.shade800,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      topRight: Radius.circular(16),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.psychology, color: Colors.white, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'Recommendation Score: $score',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: isSpecialtyMatch ? Colors.green.shade100 : Colors.red.shade100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          isSpecialtyMatch ? 'Specialist Avail' : 'No Specialist',
                          style: TextStyle(
                            color: isSpecialtyMatch ? Colors.green.shade800 : Colors.red.shade800,
                            fontWeight: FontWeight.bold,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Card Body
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        hosp['hospital_name'] ?? '',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.location_on, color: Colors.teal, size: 15),
                          const SizedBox(width: 4),
                          Text('$dist km away • ${hosp['address']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Specialist box
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          border: Border.all(color: Colors.grey.shade200),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: Colors.teal.shade50,
                              radius: 16,
                              child: const Icon(Icons.person, color: Colors.teal, size: 18),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    hosp['doctor_name'] ?? 'Dr. Specialist',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                  Text(
                                    'Consultant (${hosp['doctor_experience']} Years Experience)',
                                    style: TextStyle(color: Colors.grey.shade700, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.king_bed,
                                color: availableBeds > 0 ? Colors.green : Colors.red,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '$availableBeds Live Beds Available',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: availableBeds > 0 ? Colors.green.shade700 : Colors.red,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              const Icon(Icons.star, color: Colors.amber, size: 18),
                              const SizedBox(width: 4),
                              Text(
                                '${hosp['rating']}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 12),

                      // Action Buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildCardActionButton(
                            icon: Icons.phone,
                            label: 'Call',
                            color: Colors.teal,
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Calling ${hosp['hospital_name']}...')),
                              );
                            },
                          ),
                          _buildCardActionButton(
                            icon: Icons.groups,
                            label: 'Doctors',
                            color: Colors.indigo,
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Displaying doctors at ${hosp['hospital_name']}...')),
                              );
                            },
                          ),
                          _buildCardActionButton(
                            icon: Icons.navigation,
                            label: 'Navigate',
                            color: Colors.teal.shade800,
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Opening Navigation routes to ${hosp['hospital_name']}...')),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildSourceButton({required IconData icon, required String label, required VoidCallback onPressed}) {
    return SizedBox(
      width: 100,
      child: Column(
        children: [
          IconButton(
            icon: Icon(icon, size: 28),
            onPressed: onPressed,
            color: Colors.teal,
            style: IconButton.styleFrom(
              backgroundColor: Colors.teal.shade50,
              padding: const EdgeInsets.all(12),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildCardActionButton({required IconData icon, required String label, required Color color, required VoidCallback onPressed}) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 15),
      label: Text(label, style: const TextStyle(fontSize: 11)),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
}
