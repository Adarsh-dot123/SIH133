import React, { useState, useEffect } from 'react';
import {
  Search, Filter, MapPin, Sparkles, Phone, Navigation,
  Shield, AlertTriangle, CheckCircle, ChevronRight, Activity, Ambulance
} from 'lucide-react';
import { HospitalSummary, HospitalReferralScore } from '../types';
import { api } from '../api/client';
import { PredictionBadge } from '../components/PredictionBadge';
import { MapView } from '../components/MapView';
import { useLanguage } from '../context/LanguageContext';
import { subscribeCollection } from '../firebase';

interface PatientPortalProps {
  initialTab?: string;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ initialTab = 'search' }) => {
  const { t, language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'referral'>(initialTab === 'referral' ? 'referral' : 'search');
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [pmjayOnly, setPmjayOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedHospital, setSelectedHospital] = useState<HospitalSummary | null>(null);
  const [ambulances, setAmbulances] = useState<any[]>([]);

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

  const loadHospitals = async () => {
    setIsLoading(true);
    try {
      const data = await api.getHospitals({
        specialty: selectedSpecialty || undefined,
        pmjay_only: pmjayOnly,
        search: searchQuery || undefined
      });
      setHospitals(data);
      if (data.length > 0 && !selectedHospital) {
        setSelectedHospital(data[0]);
      }
    } catch (err) {
      console.error('Failed to load hospitals', err);
    } finally {
      setIsLoading(false);
    }
  };

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
        const topHosp = hospitals.find(h => h.id === res[0].hospital_id);
        if (topHosp) setSelectedHospital(topHosp);
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

        <div style={{ display: 'flex', gap: '10px' }}>
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
                  const isSelected = selectedHospital?.id === hosp.id;
                  return (
                    <div
                      key={hosp.id}
                      className="card"
                      onClick={() => setSelectedHospital(hosp)}
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
                  center={selectedHospital ? [selectedHospital.latitude, selectedHospital.longitude] : [13.0500, 80.2500]}
                  zoom={12}
                  onSelectHospital={(h) => setSelectedHospital(h)}
                />
              </div>

              {selectedHospital && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedHospital.name}
                    </h3>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px',
                      background: selectedHospital.status === 'NORMAL' ? '#ecfdf5' : '#fff1f2',
                      color: selectedHospital.status === 'NORMAL' ? '#059669' : '#e11d48'
                    }}>
                      Status: {selectedHospital.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '12px' }}>
                    <strong>Specialties Offered:</strong> {selectedHospital.specialties.join(' • ')}
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
                      Our clinical Length-of-Stay engine projects <strong>+{selectedHospital.predicted_available_12h} total beds</strong> (+{selectedHospital.predicted_icu_available_12h} ICU) will be freed in 12 hours based on active inpatient vitals recovery trends.
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
      ) : (
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
              <label className="form-label">{t('origin_location', 'Patient Origin Location (GPS)')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={originLabel}
                  onChange={(e) => setOriginLabel(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setOriginLat(13.0450);
                    setOriginLng(80.2400);
                    setOriginLabel('T. Nagar, Chennai');
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Reset GPS
                </button>
              </div>
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
                hospitals={hospitals}
                origin={{ lat: originLat, lng: originLng, label: originLabel }}
                destinationHospital={selectedHospital}
                zoom={12}
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
                  style={{
                    padding: '16px',
                    borderColor: score.recommendation_rank === 1 ? '#4f46e5' : '#e2e8f0',
                    background: score.recommendation_rank === 1 ? '#f5f3ff' : '#ffffff'
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
      )}
    </div>
  );
};
