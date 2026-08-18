import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HospitalSummary } from '../types';

// Fix leaflet default icon asset paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Leaflet DivIcons
const createHospitalIcon = (status: string) => {
  const color = status === 'CRITICAL' ? '#e11d48' : status === 'WARNING' ? '#d97706' : '#0d9488';
  return L.divIcon({
    className: 'custom-hosp-marker',
    html: `
      <div style="
        background: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 800;
        font-size: 14px;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
      ">H</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const patientIcon = L.divIcon({
  className: 'custom-patient-marker',
  html: `
    <div style="
      background: #4f46e5;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 16px;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4);
      animation: pulse-ring 2s infinite;
    ">📍</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const ambulanceIcon = L.divIcon({
  className: 'custom-amb-marker',
  html: `
    <div style="
      background: #e11d48;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 16px;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 8px rgba(225, 29, 72, 0.4);
    ">🚑</div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

interface MapViewProps {
  hospitals: HospitalSummary[];
  origin?: { lat: number; lng: number; label?: string } | null;
  destinationHospital?: HospitalSummary | null;
  ambulances?: any[];
  center?: [number, number];
  zoom?: number;
  onSelectHospital?: (hospital: HospitalSummary) => void;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  hospitals,
  origin,
  destinationHospital,
  ambulances = [],
  center = [13.0500, 80.2500],
  zoom = 12,
  onSelectHospital
}) => {
  const polylineCoords: [number, number][] = (origin && destinationHospital)
    ? [
        [origin.lat, origin.lng],
        // Midpoint waypoint for realistic route curve
        [(origin.lat + destinationHospital.latitude) / 2 + 0.003, (origin.lng + destinationHospital.longitude) / 2 - 0.002],
        [destinationHospital.latitude, destinationHospital.longitude]
      ]
    : [];

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Hospital Markers */}
        {hospitals.map((hosp) => (
          <Marker
            key={hosp.id}
            position={[hosp.latitude, hosp.longitude]}
            icon={createHospitalIcon(hosp.status)}
            eventHandlers={{
              click: () => onSelectHospital && onSelectHospital(hosp),
            }}
          >
            <Popup>
              <div style={{ minWidth: '180px', padding: '4px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{hosp.name}</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{hosp.address}</div>
                <hr style={{ margin: '6px 0', borderColor: '#e2e8f0' }} />
                <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>ICU Available:</span>
                  <strong style={{ color: hosp.icu_beds_available > 0 ? '#059669' : '#e11d48' }}>
                    {hosp.icu_beds_available} / {hosp.icu_beds_total}
                  </strong>
                </div>
                <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', color: '#4f46e5' }}>
                  <span>Predicted in 12h:</span>
                  <strong>+{hosp.predicted_icu_available_12h} ICU</strong>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Patient / Origin Marker */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={patientIcon}>
            <Popup>
              <div style={{ padding: '4px' }}>
                <strong>{origin.label || 'Patient Origin Location'}</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Emergency Request Initiated</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Ambulances */}
        {ambulances.map((amb) => (
          <Marker key={amb.id} position={[amb.current_lat, amb.current_lng]} icon={ambulanceIcon}>
            <Popup>
              <div style={{ padding: '4px' }}>
                <strong>Ambulance: {amb.registration_number}</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Status: {amb.status}</div>
                <div style={{ fontSize: '0.75rem', color: '#0f172a' }}>Driver: {amb.driver_name}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Dynamic Route Polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords}
            color="#4f46e5"
            weight={4}
            dashArray="6, 6"
            opacity={0.85}
          />
        )}
      </MapContainer>
    </div>
  );
};
