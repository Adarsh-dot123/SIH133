import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../data/services/api_service.dart';

class HospitalFinderScreen extends StatefulWidget {
  final ApiService apiService;
  const HospitalFinderScreen({super.key, required this.apiService});

  @override
  State<HospitalFinderScreen> createState() => HospitalFinderScreenState();
}

class HospitalFinderScreenState extends State<HospitalFinderScreen> {
  final _searchController = TextEditingController();
  String _selectedSpecialty = '';
  List<dynamic> _hospitals = [];
  bool _isLoading = false;
  String _errorMessage = '';
  
  // Default coordinates (Chennai/rural coordinates)
  double userLat = 13.0827;
  double userLng = 80.2707;

  final List<String> _specialties = [
    'All',
    'Cardiology',
    'Pulmonology',
    'Hematology',
    'Gastroenterology',
    'Nephrology',
    'Pediatrics'
  ];

  @override
  void initState() {
    super.initState();
    _initLocationAndLoad();
  }

  Future<void> _initLocationAndLoad() async {
    await _getUserLocation();
    await _loadHospitals();
  }

  Future<void> _getUserLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        print('[Geolocator] Location services disabled. Using default Chennai coordinates.');
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          print('[Geolocator] Location permission denied. Using default.');
          return;
        }
      }
      
      if (permission == LocationPermission.deniedForever) {
        print('[Geolocator] Location permission permanently denied. Using default.');
        return;
      }

      // Retrieve location with 3-second timeout limit
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
      ).timeout(const Duration(seconds: 3));

      setState(() {
        userLat = position.latitude;
        userLng = position.longitude;
      });
      print('[Geolocator] Retrieved coordinates: $userLat, $userLng');
    } catch (e) {
      print('[Geolocator] Location retrieval timed out or failed ($e). Using default coordinates.');
    }
  }

  void applyFilter(String specialty) {
    setState(() {
      _selectedSpecialty = specialty;
    });
    _loadHospitals();
  }

  Future<void> _loadHospitals() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final specFilter = _selectedSpecialty == 'All' ? '' : _selectedSpecialty;
      final results = await widget.apiService.fetchHospitals(
        lat: userLat,
        lng: userLng,
        specialty: specFilter,
      );
      
      setState(() {
        _hospitals = results;
        if (_searchController.text.isNotEmpty) {
          final query = _searchController.text.toLowerCase();
          _hospitals = _hospitals.where((h) {
            final name = (h['name'] ?? '').toString().toLowerCase();
            final address = (h['address'] ?? '').toString().toLowerCase();
            return name.contains(query) || address.contains(query);
          }).toList();
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to load hospitals: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MedFlow Hospital Finder', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Search & Filter Section
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by name, district, or address...',
                    prefixIcon: const Icon(Icons.search, color: Colors.teal),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _loadHospitals();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Colors.teal),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Colors.teal, width: 2),
                    ),
                  ),
                  onChanged: (value) => _loadHospitals(),
                ),
                const SizedBox(height: 10),
                // Specialty filters list
                SizedBox(
                  height: 40,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _specialties.length,
                    itemBuilder: (context, index) {
                      final specialty = _specialties[index];
                      final isSelected = (_selectedSpecialty == specialty) || 
                                         (_selectedSpecialty == '' && specialty == 'All');
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text(specialty),
                          selected: isSelected,
                          selectedColor: Colors.teal,
                          labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black87),
                          backgroundColor: Colors.grey.shade200,
                          onSelected: (selected) {
                            setState(() {
                              _selectedSpecialty = specialty;
                            });
                            _loadHospitals();
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // Main Hospital Listing
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.teal))
                : _errorMessage.isNotEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Text(_errorMessage, style: const TextStyle(color: Colors.red, fontSize: 16)),
                        ),
                      )
                    : _hospitals.isEmpty
                        ? const Center(child: Text('No hospitals found matching criteria.'))
                        : RefreshIndicator(
                            onRefresh: _loadHospitals,
                            child: ListView.builder(
                              itemCount: _hospitals.length,
                              itemBuilder: (context, index) {
                                final hosp = _hospitals[index];
                                final isCritical = hosp['status'] == 'CRITICAL';
                                final isWarning = hosp['status'] == 'WARNING';
                                
                                return Card(
                                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  elevation: 2,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: BorderSide(
                                      color: isCritical 
                                          ? Colors.red.shade300 
                                          : isWarning 
                                              ? Colors.orange.shade300 
                                              : Colors.grey.shade200,
                                      width: isCritical || isWarning ? 1.5 : 1,
                                    ),
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(12.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Header row: Hospital Name & Status Badge
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                hosp['name'] ?? 'Hospital Name',
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: isCritical
                                                    ? Colors.red.shade100
                                                    : isWarning
                                                        ? Colors.orange.shade100
                                                        : Colors.green.shade100,
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                hosp['status'] ?? 'NORMAL',
                                                style: TextStyle(
                                                  color: isCritical
                                                      ? Colors.red.shade800
                                                      : isWarning
                                                          ? Colors.orange.shade800
                                                          : Colors.green.shade800,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            )
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          hosp['address'] ?? 'No address listed',
                                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                        ),
                                        const SizedBox(height: 8),
                                        // Empaneled schemes
                                        Row(
                                          children: [
                                            if (hosp['is_empanelled_pmjay'] == true)
                                              Container(
                                                margin: const EdgeInsets.only(right: 6),
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.blue.shade50,
                                                  border: Border.all(color: Colors.blue.shade200),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text('PM-JAY', style: TextStyle(color: Colors.blue, fontSize: 10, fontWeight: FontWeight.bold)),
                                              ),
                                            if (hosp['is_empanelled_cghs'] == true)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.purple.shade50,
                                                  border: Border.all(color: Colors.purple.shade200),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text('CGHS', style: TextStyle(color: Colors.purple, fontSize: 10, fontWeight: FontWeight.bold)),
                                              ),
                                          ],
                                        ),
                                        const Divider(height: 16),
                                        
                                        // Bed Availability Grid
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            _buildBedIndicator('General', hosp['general_beds_available'], hosp['general_beds_total']),
                                            _buildBedIndicator('ICU', hosp['icu_beds_available'], hosp['icu_beds_total']),
                                            _buildBedIndicator('Ventilator', hosp['ventilators_available'], hosp['ventilators_total']),
                                          ],
                                        ),
                                        
                                        const Divider(height: 16),
                                        // ML Prediction Forecast
                                        Row(
                                          children: [
                                            const Icon(Icons.online_prediction, size: 16, color: Colors.teal),
                                            const SizedBox(width: 6),
                                            Text(
                                              'Predicted general/ICU beds freed in 12h: ',
                                              style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                                            ),
                                            Text(
                                              '${hosp['predicted_available_12h'] ?? 0} beds',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.teal),
                                            ),
                                          ],
                                        )
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildBedIndicator(String label, dynamic available, dynamic total) {
    final availCount = available ?? 0;
    final totalCount = total ?? 0;
    final isZero = availCount == 0;
    
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black54)),
        const SizedBox(height: 4),
        Text(
          '$availCount / $totalCount',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: isZero ? Colors.red : Colors.green.shade700,
          ),
        ),
      ],
    );
  }
}
