// Predefined Tamil Nadu & Karnataka location lookup with GPS coordinates
const KNOWN_LOCATIONS = [
  // Chennai Areas
  { label: 'T. Nagar, Chennai', lat: 13.0450, lng: 80.2400 },
  { label: 'Anna Nagar, Chennai', lat: 13.0850, lng: 80.2101 },
  { label: 'Adyar, Chennai', lat: 13.0012, lng: 80.2565 },
  { label: 'Velachery, Chennai', lat: 12.9754, lng: 80.2191 },
  { label: 'Tambaram, Chennai', lat: 12.9249, lng: 80.1000 },
  { label: 'Porur, Chennai', lat: 13.0358, lng: 80.1573 },
  { label: 'Chromepet, Chennai', lat: 12.9516, lng: 80.1462 },
  { label: 'Perambur, Chennai', lat: 13.1169, lng: 80.2341 },
  { label: 'Guindy, Chennai', lat: 13.0067, lng: 80.2206 },
  { label: 'Greams Road, Chennai', lat: 13.0567, lng: 80.2569 },
  { label: 'Royapettah, Chennai', lat: 13.0518, lng: 80.2647 },
  { label: 'Egmore, Chennai', lat: 13.0732, lng: 80.2609 },
  { label: 'Nungambakkam, Chennai', lat: 13.0580, lng: 80.2427 },
  { label: 'Mylapore, Chennai', lat: 13.0338, lng: 80.2685 },
  { label: 'Sholinganallur, Chennai', lat: 12.9010, lng: 80.2279 },
  { label: 'OMR (Old Mahabalipuram Road), Chennai', lat: 12.9279, lng: 80.2337 },
  { label: 'Perungudi, Chennai', lat: 12.9694, lng: 80.2451 },
  { label: 'Madipakkam, Chennai', lat: 12.9602, lng: 80.2054 },
  // Coimbatore Areas
  { label: 'RS Puram, Coimbatore', lat: 11.0035, lng: 76.9568 },
  { label: 'Gandhipuram, Coimbatore', lat: 11.0168, lng: 76.9774 },
  { label: 'Saibaba Colony, Coimbatore', lat: 11.0239, lng: 76.9489 },
  { label: 'Peelamedu, Coimbatore', lat: 11.0232, lng: 77.0310 },
  { label: 'Singanallur, Coimbatore', lat: 10.9841, lng: 77.0301 },
  // Madurai Areas
  { label: 'Anna Nagar, Madurai', lat: 9.9252, lng: 78.1198 },
  { label: 'KK Nagar, Madurai', lat: 9.9020, lng: 78.0910 },
  { label: 'Bypass Road, Madurai', lat: 9.9619, lng: 78.1375 },
  // Vellore Areas
  { label: 'Katpadi, Vellore', lat: 12.9674, lng: 79.1454 },
  { label: 'Sathuvachari, Vellore', lat: 12.9286, lng: 79.1477 },
  // Trichy Areas
  { label: 'Cantonment, Trichy', lat: 10.8050, lng: 78.6857 },
  { label: 'Thillai Nagar, Trichy', lat: 10.7960, lng: 78.6897 },
  // Salem Areas
  { label: 'Four Roads, Salem', lat: 11.6666, lng: 78.1541 },
  { label: 'Suramangalam, Salem', lat: 11.6816, lng: 78.0968 },
  // Kanchipuram
  { label: 'Kanchipuram Town', lat: 12.8342, lng: 79.7036 },
  // Bangalore
  { label: 'Jayanagar, Bangalore', lat: 12.9259, lng: 77.5933 },
  { label: 'Indiranagar, Bangalore', lat: 12.9719, lng: 77.6412 },
  { label: 'Koramangala, Bangalore', lat: 12.9352, lng: 77.6245 },
  { label: 'Rajajinagar, Bangalore', lat: 13.0050, lng: 77.5545 },
  { label: 'Whitefield, Bangalore', lat: 12.9698, lng: 77.7499 },
  // Mysuru
  { label: 'Mysuru City Centre', lat: 12.2958, lng: 76.6394 },
  { label: 'Kuvempunagar, Mysuru', lat: 12.2896, lng: 76.6381 },
];


import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, MapPin, Sparkles, Phone, Navigation,
  Shield, AlertTriangle, CheckCircle, ChevronRight, Activity, Ambulance,
  RefreshCw, Wifi, WifiOff, Clock
} from 'lucide-react';
import { HospitalSummary, HospitalReferralScore } from '../types';
import { api, createWebSocketSubscriber } from '../api/client';
import { PredictionBadge } from '../components/PredictionBadge';
import { MapView } from '../components/MapView';
import { useLanguage } from '../context/LanguageContext';
import { subscribeCollection } from '../firebase';

import { ComplaintForm } from '../components/ComplaintForm';

interface PatientPortalProps {
  initialTab?: string;
  userToken?: string;
  myPeerId?: string | null;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ initialTab = 'search', userToken, myPeerId }) => {
  const { t, language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'referral' | 'consultation'>(
    initialTab === 'referral' ? 'referral' : initialTab === 'consultation' ? 'consultation' : 'search'
  );
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([]);
  const [allHospitals, setAllHospitals] = useState<HospitalSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [pmjayOnly, setPmjayOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedHospital, setSelectedHospital] = useState<HospitalSummary | null>(null);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [selectedSearchHospital, setSelectedSearchHospital] = useState<HospitalSummary | null>(null);
  const [selectedReferralHospital, setSelectedReferralHospital] = useState<HospitalSummary | null>(null);
  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [justRefreshed, setJustRefreshed] = useState<boolean>(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Referral Request State
  const [patientName, setPatientName] = useState<string>('Ramesh Sundaram');
  const [patientAge, setPatientAge] = useState<number>(56);
  const [refSpecialty, setRefSpecialty] = useState<string>('Cardiology');
  const [refBedType, setRefBedType] = useState<string>('ICU');
  const [originLat, setOriginLat] = useState<number>(13.0450);
  const [originLng, setOriginLng] = useState<number>(80.2400);
  const [originLabel, setOriginLabel] = useState<string>('T. Nagar, Chennai');
  const [rankedResults, setRankedResults] = useState<HospitalReferralScore[]>([]);
  const [isScoring, setIsScoring] = useState<boolean>(false);
  const [dispatchedReferral, setDispatchedReferral] = useState<any | null>(null);

  useEffect(() => {
    const handleVoiceFilter = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.specialty !== undefined) {
        setSelectedSpecialty(customEvent.detail.specialty);
        setActiveSubTab('search');
      }
    };
    window.addEventListener('medflow-voice-filter', handleVoiceFilter);
    return () => {
      window.removeEventListener('medflow-voice-filter', handleVoiceFilter);
    };
  }, []);

  // Firestore real-time dynamic sync for hospital resources and ambulance movements
  useEffect(() => {
    const unsubHospitals = subscribeCollection('hospitals', (fireHospitals) => {
      if (fireHospitals && fireHospitals.length > 0) {
        setHospitals((prev) => {
          return prev.map(h => {
            const match = fireHospitals.find(fh => String(fh.id) === String(h.id) || fh.name === h.name);
            if (match) {
              return {
                ...h,
                general_beds_available: match.general_beds_available ?? h.general_beds_available,
                icu_beds_available: match.icu_beds_available ?? h.icu_beds_available,
                ventilators_available: match.ventilators_available ?? h.ventilators_available,
                oxygen_beds_available: match.oxygen_beds_available ?? h.oxygen_beds_available,
                doctors_on_duty: match.doctors_on_duty ?? h.doctors_on_duty,
                status: match.status ?? h.status
              };
            }
            return h;
          });
        });

        setSelectedHospital((prev) => {
          if (!prev) return null;
          const match = fireHospitals.find(fh => String(fh.id) === String(prev.id) || fh.name === prev.name);
          if (match) {
            return {
              ...prev,
              general_beds_available: match.general_beds_available ?? prev.general_beds_available,
              icu_beds_available: match.icu_beds_available ?? prev.icu_beds_available,
              ventilators_available: match.ventilators_available ?? prev.ventilators_available,
              oxygen_beds_available: match.oxygen_beds_available ?? prev.oxygen_beds_available,
              doctors_on_duty: match.doctors_on_duty ?? prev.doctors_on_duty,
              status: match.status ?? prev.status
            };
          }
          return prev;
        });
      }
    });

    const unsubAmbulances = subscribeCollection('ambulances', (fireAmbulances) => {
      const formatted = fireAmbulances.map(amb => ({
        id: amb.id || amb.registration_number || 'AMB',
        registration_number: amb.registration_number || amb.id || 'TN-01-EM-1001',
        current_lat: amb.lat || amb.current_lat || 13.05,
        current_lng: amb.lng || amb.current_lng || 80.25,
        status: amb.status || 'available',
        driver_name: amb.driver_name || 'Kumar',
        driver_phone: amb.driver_phone || '+91 99999 88888'
      }));
      setAmbulances(formatted);
    });

    return () => {
      unsubHospitals();
      unsubAmbulances();
    };
  }, []);

  useEffect(() => {
    loadHospitals();
  }, [selectedSpecialty, pmjayOnly]);

  // Location picker state
  const [locationMode, setLocationMode] = useState<'preset' | 'gps' | 'manual'>('preset');
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleUseGPS = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(4));
        const lng = parseFloat(position.coords.longitude.toFixed(4));
        setOriginLat(lat);
        setOriginLng(lng);
        setOriginLabel(`My Location (${lat}, ${lng})`);
        setLocationMode('gps');
        setIsGpsLoading(false);
      },
      (err) => {
        setGpsError('Unable to get your location. Please select from the list or enter manually. (' + err.message + ')');
        setIsGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const loadAllHospitals = async () => {
    try {
      const data = await api.getHospitals();
      setAllHospitals(data);
    } catch (err) {
      console.error('Failed to load all hospitals', err);
    }
  };

  const loadHospitals = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setIsRefreshing(true);
    }
    try {
      const [filteredData] = await Promise.all([
        api.getHospitals({
          specialty: selectedSpecialty || undefined,
          pmjay_only: pmjayOnly,
          search: searchQuery || undefined
        }),
        loadAllHospitals()
      ]);
      setHospitals(filteredData);
      setLastUpdated(new Date());
      if (!silent) {
        setJustRefreshed(true);
        setTimeout(() => setJustRefreshed(false), 2000);
      }
      if (filteredData.length > 0 && !selectedSearchHospital) {
        setSelectedSearchHospital(filteredData[0]);
      }
    } catch (err) {
      console.error('Failed to load hospitals', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, [selectedSpecialty, pmjayOnly]);

  // Real-time WebSocket sync & periodic polling across ALL portals
  useEffect(() => {
    // 1. WebSocket real-time subscription
    const unsubscribe = createWebSocketSubscriber(() => {
      loadHospitals(true);
    });

    // 2. 5-second dynamic polling
    if (isLiveSync) {
      pollingRef.current = setInterval(() => {
        loadHospitals(true);
      }, 5000);
    }

    return () => {
      unsubscribe();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isLiveSync, selectedSpecialty, pmjayOnly, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHospitals();
  };

  const handleCalculateReferrals = async () => {
    setIsScoring(true);
    try {
      const res = await api.getReferralRecommendations({
        originating_lat: originLat,
        originating_lng: originLng,
        required_specialty: refSpecialty,
        required_bed_type: refBedType,
        insurance_scheme: pmjayOnly ? 'PMJAY' : undefined,
        urgency_level: 'CRITICAL'
      });
      setRankedResults(res);
      if (res.length > 0) {
        let topHosp = allHospitals.find(h => h.id === res[0].hospital_id);
        if (!topHosp) {
          topHosp = hospitals.find(h => h.id === res[0].hospital_id);
        }
        if (topHosp) {
          setSelectedReferralHospital(topHosp);
        } else {
          // If not found in memory, retrieve it via details call to populate selection
          try {
            const details = await api.getHospitalDetail(res[0].hospital_id);
            setSelectedReferralHospital(details);
          } catch (e) {
            console.error('Failed to resolve recommended hospital details', e);
          }
        }
      }
    } catch (err: any) {
      alert('Error calculating smart referral: ' + err.message);
    } finally {
      setIsScoring(false);
    }
  };

  const handleDispatchReferral = async (hospitalId: number) => {
    try {
      const res = await api.createReferral({
        patient_name: patientName,
        patient_age: patientAge,
        required_specialty: refSpecialty,
        required_bed_type: refBedType,
        originating_lat: originLat,
        originating_lng: originLng,
        destination_hospital_id: hospitalId,
        urgency_level: 'CRITICAL'
      });
      setDispatchedReferral(res);
    } catch (err: any) {
      alert('Dispatch failed: ' + err.message);
    }
  };

  return (
    <div>
      {/* Top Banner / Differentiator Spotlight */}
      <div style={{
        background: 'linear-gradient(135deg, #042f2e 0%, #0f766e 50%, #312e81 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '28px 32px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ maxWidth: '680px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)',
            padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem',
            fontWeight: 700, marginBottom: '10px'
          }}>
            <Sparkles size={14} style={{ color: '#5eead4' }} />
            {t('predictive_engine_active', 'Predictive Bed Turnover Engine Active')}
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '8px' }}>
            {t('find_reserve_beds_title', 'Find & Reserve Hospital Beds Across India in Real Time')}
          </h1>
          <p style={{ fontSize: '0.92rem', opacity: 0.9 }}>
            {t('medflow_forecast_desc', 'MedFlow forecasts beds likely to become available within 12 to 24 hours using ML length-of-stay algorithms, preventing emergency patient bouncing.')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              <Clock size={13} />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={() => setIsLiveSync(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)',
              background: isLiveSync ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: '#ffffff',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              backdropFilter: 'blur(6px)'
            }}
          >
            {isLiveSync ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isLiveSync ? 'Live Sync Active (5s)' : 'Live Sync Paused'}
          </button>
          <button
            onClick={() => loadHospitals(false)}
            className="btn btn-secondary"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: justRefreshed ? '#ecfdf5' : 'rgba(255, 255, 255, 0.95)',
              borderColor: justRefreshed ? '#10b981' : '#ffffff',
              color: justRefreshed ? '#059669' : '#0f172a',
              padding: '10px 14px',
              transition: 'all 0.2s ease'
            }}
            title="Fetch latest hospital bed availability"
          >
            {justRefreshed ? (
              <>
                <CheckCircle size={14} style={{ color: '#10b981' }} />
                <span>Hospitals Updated!</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isRefreshing ? 'Fetching...' : 'Refresh'}</span>
              </>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('search')}
            className={`btn ${activeSubTab === 'search' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 18px' }}
          >
            <Search size={16} /> {t('search_hospitals', 'Search Hospitals')}
          </button>
          <button
            onClick={() => {
              setActiveSubTab('referral');
              if (rankedResults.length === 0) handleCalculateReferrals();
            }}
            className={`btn ${activeSubTab === 'referral' ? 'btn-predict' : 'btn-secondary'}`}
            style={{ padding: '10px 18px' }}
          >
            <Sparkles size={16} /> {t('smart_emergency_referral', 'Smart Emergency Referral')}
          </button>
          <button
            onClick={() => setActiveSubTab('consultation')}
            className={`btn ${activeSubTab === 'consultation' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 18px', background: activeSubTab === 'consultation' ? '#0d9488' : undefined, color: activeSubTab === 'consultation' ? '#ffffff' : undefined }}
          >
            <Phone size={16} /> 📹 Talk to Doctor (ICR)
          </button>
        </div>
      </div>

      {activeSubTab === 'search' ? (
        <>
          {/* Search & Filters */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 260px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder', 'Search by name, district, or specialty...')}
                  className="form-input"
                  style={{ paddingLeft: '36px', width: '100%' }}
                />
              </div>

              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="form-select"
                style={{ flex: '0 1 200px' }}
              >
                <option value="">{t('all_specialties', 'All Specialties')}</option>
                <option value="Cardiology">Cardiology / CCU</option>
                <option value="Neurology">Neurology / Stroke</option>
                <option value="Pulmonology">Pulmonology / Resp</option>
                <option value="Trauma">Trauma & Emergency</option>
                <option value="Oncology">Oncology</option>
                <option value="Nephrology">Nephrology / Dialysis</option>
                <option value="Infectious">Infectious / Dengue</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#0f766e' }}>
                <input
                  type="checkbox"
                  checked={pmjayOnly}
                  onChange={(e) => setPmjayOnly(e.target.checked)}
                  style={{ accentColor: '#0d9488', width: '16px', height: '16px' }}
                />
                <span>{t('ayushman_eligible', 'Ayushman Bharat / PM-JAY Eligible Only')}</span>
              </label>

              <button type="submit" className="btn btn-primary" style={{ minWidth: '110px' }}>
                {t('search_hospitals', 'Search')}
              </button>
            </form>
          </div>

          {/* Main Hospital Grid & Interactive Map */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Left: Hospital Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                  {hospitals.length} {t('hospitals_found_prefix', 'Hospitals Found in')} Tamil Nadu & Karnataka
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {t('showing_real_time_capacity', 'Showing Real-Time & 12h/24h Forecasted Capacity')}
                </span>
              </div>

              {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  {t('loading_resource_matrix', 'Loading real-time hospital resource matrix...')}
                </div>
              ) : hospitals.length === 0 ? (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  {t('no_hospitals_match', 'No hospitals match the selected criteria. Try removing specialty or insurance filters.')}
                </div>
              ) : (
                hospitals.map((hosp) => {
                  const isSelected = selectedSearchHospital?.id === hosp.id;
                  return (
                    <div
                      key={hosp.id}
                      className="card"
                      onClick={() => setSelectedSearchHospital(hosp)}
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? '#0d9488' : undefined,
                        boxShadow: isSelected ? '0 0 0 2px rgba(13, 148, 136, 0.2)' : undefined,
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{hosp.name}</h3>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <MapPin size={12} /> {hosp.address}
                          </div>
                        </div>

                        {hosp.is_empanelled_pmjay && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, background: '#ecfdf5',
                            color: '#059669', padding: '3px 8px', borderRadius: '6px',
                            border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: '3px'
                          }}>
                            <Shield size={10} /> PMJAY
                          </span>
                        )}
                      </div>

                      {/* Live Resource Bar */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px', background: '#f8fafc', padding: '10px',
                        borderRadius: '10px', margin: '12px 0', border: '1px solid #e2e8f0'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{t('general', 'GENERAL')}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: hosp.general_beds_available > 0 ? '#059669' : '#e11d48' }}>
                            {hosp.general_beds_available} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ {hosp.general_beds_total}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{t('icu_beds_cap', 'ICU BEDS')}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: hosp.icu_beds_available > 0 ? '#059669' : '#e11d48' }}>
                            {hosp.icu_beds_available} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ {hosp.icu_beds_total}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{t('ventilators', 'VENTILATORS')}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: hosp.ventilators_available > 0 ? '#059669' : '#e11d48' }}>
                            {hosp.ventilators_available} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ {hosp.ventilators_total}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{t('oxygen_beds', 'OXYGEN BEDS')}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: hosp.oxygen_beds_available > 0 ? '#059669' : '#e11d48' }}>
                            {hosp.oxygen_beds_available} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ {hosp.oxygen_beds_total}</span>
                          </div>
                        </div>
                      </div>

                      {/* Predictive Turnover Callout */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <PredictionBadge
                          availableIn12h={hosp.predicted_icu_available_12h}
                          availableIn24h={hosp.predicted_icu_available_24h}
                          type="ICU"
                          showDetails={true}
                        />

                        <a
                          href={`tel:${hosp.phone}`}
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={12} /> {hosp.phone}
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Selected Hospital Deep-Dive & Map */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  {t('live_map', 'Live Geographic Resource Map')}
                </h3>
                <MapView
                  hospitals={hospitals}
                  ambulances={ambulances}
                  center={selectedSearchHospital ? [selectedSearchHospital.latitude, selectedSearchHospital.longitude] : [13.0500, 80.2500]}
                  zoom={12}
                  onSelectHospital={(h) => setSelectedSearchHospital(h)}
                />
              </div>

              {selectedSearchHospital && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedSearchHospital.name}
                    </h3>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px',
                      background: selectedSearchHospital.status === 'NORMAL' ? '#ecfdf5' : '#fff1f2',
                      color: selectedSearchHospital.status === 'NORMAL' ? '#059669' : '#e11d48'
                    }}>
                      Status: {selectedSearchHospital.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '12px' }}>
                    <strong>Specialties Offered:</strong> {selectedSearchHospital.specialties.join(' • ')}
                  </div>

                  <div style={{
                    background: '#eef2ff', border: '1px solid #e0e7ff', borderRadius: '12px',
                    padding: '14px', marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4338ca', fontWeight: 700, fontSize: '0.85rem' }}>
                      <Sparkles size={16} />
                      AI Bed Turnover Forecast (12h - 24h)
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#3730a3', marginTop: '4px' }}>
                      Our clinical Length-of-Stay engine projects <strong>+{selectedSearchHospital.predicted_available_12h} total beds</strong> (+{selectedSearchHospital.predicted_icu_available_12h} ICU) will be freed in 12 hours based on active inpatient vitals recovery trends.
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveSubTab('referral');
                      handleCalculateReferrals();
                    }}
                    className="btn btn-predict"
                    style={{ width: '100%' }}
                  >
                    <Sparkles size={16} /> Request Smart Emergency Referral Here
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeSubTab === 'referral' ? (
        /* Smart Specialty-Aware Referral Engine View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
          {/* Left: Input Form */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', marginBottom: '12px' }}>
              <Sparkles size={20} />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                {t('routing_title', 'Multi-Criteria Emergency Patient Routing')}
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
              Calculates transparent suitability scores weighted by Specialty capability (35%), Current beds (25%), Predicted 12h turnover (15%), Proximity (15%), and PMJAY (10%).
            </p>

            <div className="form-group">
              <label className="form-label">{t('patient_name', 'Patient Full Name')}</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">{t('patient_age', 'Patient Age')}</label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(parseInt(e.target.value) || 45)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Required Bed Type</label>
                <select
                  value={refBedType}
                  onChange={(e) => setRefBedType(e.target.value)}
                  className="form-select"
                >
                  <option value="ICU">ICU (Intensive Care)</option>
                  <option value="CARDIAC_ICU">Cardiac ICU (CCU)</option>
                  <option value="VENTILATOR">Ventilator Bay</option>
                  <option value="OXYGEN_SUPPORTED">Oxygen-Supported</option>
                  <option value="GENERAL">General Ward</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('required_specialty', 'Required Clinical Specialty')}</label>
              <select
                value={refSpecialty}
                onChange={(e) => setRefSpecialty(e.target.value)}
                className="form-select"
              >
                <option value="Cardiology">Cardiology / Acute Coronary Syndrome</option>
                <option value="Pulmonology">Pulmonology / Severe ARDS</option>
                <option value="Neurology">Neurology / Stroke Care</option>
                <option value="Trauma">Trauma & Orthopedic Surgery</option>
                <option value="Pediatrics">Pediatrics / PICU</option>
                <option value="Infectious/Dengue">Infectious / Severe Dengue</option>
                <option value="Nephrology">Nephrology / Acute Renal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {t('origin_location', 'Patient Origin Location')}
              </label>

              {/* Quick-pick predefined locations */}
              <select
                value={originLabel}
                onChange={(e) => {
                  const selected = KNOWN_LOCATIONS.find(l => l.label === e.target.value);
                  if (selected) {
                    setOriginLat(selected.lat);
                    setOriginLng(selected.lng);
                    setOriginLabel(selected.label);
                    setLocationMode('preset');
                  }
                }}
                className="form-select"
                style={{ marginBottom: '8px' }}
              >
                <option value="">— Select a known area / locality —</option>
                {KNOWN_LOCATIONS.map(l => (
                  <option key={l.label} value={l.label}>{l.label}</option>
                ))}
              </select>

              {/* GPS / Manual toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={handleUseGPS}
                  disabled={isGpsLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Navigation size={14} />
                  {isGpsLoading ? 'Detecting...' : 'Use My GPS Location'}
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode(m => m === 'manual' ? 'preset' : 'manual')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Filter size={13} />
                  {locationMode === 'manual' ? 'Hide Manual' : 'Enter Manually'}
                </button>
              </div>

              {/* Manual lat/lng fields */}
              {locationMode === 'manual' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={originLat}
                      onChange={(e) => {
                        setOriginLat(parseFloat(e.target.value) || 0);
                        setOriginLabel(`Custom (${e.target.value}, ${originLng})`);
                        setLocationMode('manual');
                      }}
                      className="form-input"
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={originLng}
                      onChange={(e) => {
                        setOriginLng(parseFloat(e.target.value) || 0);
                        setOriginLabel(`Custom (${originLat}, ${e.target.value})`);
                        setLocationMode('manual');
                      }}
                      className="form-input"
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              )}

              {/* GPS error message */}
              {gpsError && (
                <div style={{ fontSize: '0.76rem', color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', marginBottom: '6px' }}>
                  {gpsError}
                </div>
              )}

              {/* Active location badge */}
              {originLabel && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
                  padding: '8px 12px', fontSize: '0.8rem', color: '#166534'
                }}>
                  <MapPin size={13} />
                  <span><strong>From:</strong> {originLabel}</span>
                  <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                    {originLat.toFixed(4)}, {originLng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleCalculateReferrals}
              className="btn btn-predict"
              disabled={isScoring}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {isScoring ? 'Computing Multi-Factor Scores...' : t('find_ranked_hospitals', 'Find Ranked Referral Hospitals')}
            </button>

            {dispatchedReferral && (
              <div style={{
                background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px',
                padding: '16px', marginTop: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, fontSize: '0.92rem' }}>
                  <CheckCircle size={18} />
                  Emergency Referral Dispatched!
                </div>
                <div style={{ fontSize: '0.8rem', color: '#065f46', marginTop: '6px' }}>
                  Destination: <strong>{dispatchedReferral.destination_hospital_name}</strong>
                  <br />
                  Ambulance Assigned: <strong>{dispatchedReferral.ambulance?.registration_number || 'TN-01-EM-1001'}</strong> ({dispatchedReferral.ambulance?.driver_name})
                  <br />
                  Emergency Driver Hotline: <strong>{dispatchedReferral.ambulance?.driver_phone || '+91 98401 01010'}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Right: Ranked Results & Route Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Emergency Ambulance Route & Target Hospital
              </h3>
              <MapView
                hospitals={allHospitals.length > 0 ? allHospitals : hospitals}
                origin={{ lat: originLat, lng: originLng, label: originLabel }}
                destinationHospital={selectedReferralHospital}
                zoom={12}
                onSelectHospital={(h) => setSelectedReferralHospital(h)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>
                Top Ranked Candidate Hospitals (Specialty & Predicted Capacity Aware)
              </span>

              {rankedResults.map((score) => (
                <div
                  key={score.hospital_id}
                  className="card"
                  onClick={() => {
                    const hosp = allHospitals.find(h => h.id === score.hospital_id) || hospitals.find(h => h.id === score.hospital_id);
                    if (hosp) setSelectedReferralHospital(hosp);
                  }}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    borderColor: selectedReferralHospital?.id === score.hospital_id ? '#4f46e5' : '#e2e8f0',
                    background: selectedReferralHospital?.id === score.hospital_id ? '#f5f3ff' : '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: score.recommendation_rank === 1 ? '#4f46e5' : '#94a3b8',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.9rem'
                      }}>
                        #{score.recommendation_rank}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                          {score.hospital_name}
                        </h4>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {score.distance_km} km away (~{score.estimated_travel_minutes} mins transit)
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4338ca' }}>
                        {score.overall_match_score} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/ 100</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6366f1' }}>
                        Suitability Score
                      </div>
                    </div>
                  </div>

                  {/* Scoring breakdown badges */}
                  <div style={{
                    display: 'flex', gap: '6px', flexWrap: 'wrap',
                    margin: '10px 0', fontSize: '0.72rem'
                  }}>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Specialty Match: {score.scoring_breakdown.specialty_score}/35
                    </span>
                    <span style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Avail Beds: {score.current_beds_available} ({score.scoring_breakdown.bed_availability_score}/25)
                    </span>
                    <span style={{ background: '#fdf4ff', color: '#86198f', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Predicted 12h: +{score.predicted_beds_12h} ({score.scoring_breakdown.predicted_turnover_score}/15)
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Proximity: {score.scoring_breakdown.proximity_score}/15
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Emergency Hotline: <strong>{score.phone}</strong>
                    </div>

                    <button
                      onClick={() => handleDispatchReferral(score.hospital_id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Ambulance size={14} /> Dispatch Referral & Route
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeSubTab === 'consultation' ? (
        <ComplaintForm patientId={1} patientName={patientName} token={userToken} myPeerId={myPeerId} />
      ) : null}
    </div>
  );
};
