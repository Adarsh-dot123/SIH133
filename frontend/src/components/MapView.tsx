import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
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

// ─── Tile Layers ────────────────────────────────────────────────────────────
const TILE_LAYERS = {
  standard: {
    label: '🗺️ Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    label: '🛰️ Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
  },
  highContrast: {
    label: '⬛ High Contrast',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

// ─── Custom icons ────────────────────────────────────────────────────────────
const createHospitalIcon = (status: string, isDestination = false) => {
  const color =
    status === 'CRITICAL' ? '#e11d48' :
    status === 'WARNING'  ? '#d97706' : '#0d9488';
  const size = isDestination ? 40 : 32;
  const pulse = isDestination ? `
    box-shadow: 0 0 0 0 ${color}80;
    animation: pulse-ring 1.8s infinite;
  ` : `box-shadow: 0 4px 8px rgba(0,0,0,0.3);`;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        background: ${color};
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-weight: 900; font-size: ${isDestination ? 18 : 14}px;
        border: ${isDestination ? 3 : 2}px solid #ffffff;
        ${pulse}
        transition: transform 0.15s;
        cursor: pointer;
      ">H</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });
};

const patientIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      background: #4f46e5;
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 18px;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.5);
      animation: pulse-ring 2s infinite;
    ">📍</div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -22],
});

const ambulanceIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      background: #e11d48;
      width: 34px; height: 34px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 18px;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 10px rgba(225, 29, 72, 0.45);
    ">🚑</div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -20],
});

// ─── Haversine distance helper ────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Map subcomponents ────────────────────────────────────────────────────────
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const lastCenterRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const hasChanged = !lastCenterRef.current ||
      lastCenterRef.current[0] !== center[0] ||
      lastCenterRef.current[1] !== center[1];

    if (hasChanged) {
      map.setView(center, zoom);
      lastCenterRef.current = center;
    }
  }, [map, center, zoom]);
  return null;
}

function FullscreenController({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [isFullscreen, map]);
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MapViewProps {
  hospitals: HospitalSummary[];
  origin?: { lat: number; lng: number; label?: string } | null;
  destinationHospital?: HospitalSummary | null;
  ambulances?: any[];
  center?: [number, number];
  zoom?: number;
  onSelectHospital?: (hospital: HospitalSummary) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const MapView: React.FC<MapViewProps> = ({
  hospitals,
  origin,
  destinationHospital,
  ambulances = [],
  center = [13.0500, 80.2500],
  zoom = 12,
  onSelectHospital,
}) => {
  const [tileKey, setTileKey] = useState<keyof typeof TILE_LAYERS>('standard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const tile = TILE_LAYERS[tileKey];

  const polylineCoords: [number, number][] =
    origin && destinationHospital
      ? [
          [origin.lat, origin.lng],
          [
            (origin.lat + destinationHospital.latitude) / 2 + 0.003,
            (origin.lng + destinationHospital.longitude) / 2 - 0.002,
          ],
          [destinationHospital.latitude, destinationHospital.longitude],
        ]
      : [];

  const distanceKm =
    origin && destinationHospital
      ? haversineKm(origin.lat, origin.lng, destinationHospital.latitude, destinationHospital.longitude)
      : null;
  const etaMin = distanceKm ? Math.round((distanceKm / 40) * 60) : null; // ~40 km/h city speed

  // Derive effective center: if origin & destination both exist, center between them
  // Memoize the default center so it does not change on every render
  const defaultCenter = React.useMemo(() => center as [number, number], []);

  // Derive effective center: if origin & destination both exist, center between them; otherwise use memoized default
  const effectiveCenter = React.useMemo(() => {
    if (origin && destinationHospital) {
      return [
        (origin.lat + destinationHospital.latitude) / 2,
        (origin.lng + destinationHospital.longitude) / 2,
      ] as [number, number];
    }
    return defaultCenter;
  }, [origin?.lat, origin?.lng, destinationHospital?.latitude, destinationHospital?.longitude, defaultCenter]);

  return (
    <div
      ref={wrapperRef}
      role="region"
      aria-label="Interactive hospital map"
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : undefined,
        width: '100%',
        height: isFullscreen ? '100vh' : '420px',
        borderRadius: isFullscreen ? 0 : 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--slate-200)',
        marginTop: '14px',
        background: '#e2e8f0',
      }}
    >
      {/* ── Route info bar ──────────────────────────────────────── */}
      {distanceKm !== null && (
        <div
          aria-live="polite"
          aria-label={`Route: ${distanceKm.toFixed(1)} km, estimated ${etaMin} minutes by ambulance`}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
            background: 'rgba(79, 70, 229, 0.92)', backdropFilter: 'blur(6px)',
            color: '#fff', display: 'flex', alignItems: 'center',
            gap: '18px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700,
          }}
        >
          <span>🚑 Ambulance Route</span>
          <span>📏 {distanceKm.toFixed(1)} km</span>
          <span>⏱️ ~{etaMin} min ETA</span>
          {destinationHospital && (
            <span style={{ marginLeft: 'auto', opacity: 0.85, fontWeight: 400 }}>
              → {destinationHospital.name}
            </span>
          )}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: distanceKm !== null ? '38px' : '8px',
          right: '8px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {/* Layer switcher */}
        {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((key) => (
          <button
            key={key}
            aria-pressed={tileKey === key}
            aria-label={`Switch to ${TILE_LAYERS[key].label} map layer`}
            onClick={() => setTileKey(key)}
            title={TILE_LAYERS[key].label}
            style={{
              background: tileKey === key ? '#0d9488' : 'rgba(255,255,255,0.95)',
              color: tileKey === key ? '#fff' : '#0f172a',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              minWidth: '92px',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            {TILE_LAYERS[key].label}
          </button>
        ))}

        {/* Fullscreen toggle */}
        <button
          aria-label={isFullscreen ? 'Exit fullscreen map' : 'Expand map to fullscreen'}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen'}
          onClick={() => setIsFullscreen(f => !f)}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none', borderRadius: '6px',
            padding: '5px 8px', fontSize: '1rem',
            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            marginTop: '4px', minWidth: '92px', textAlign: 'left',
          }}
        >
          {isFullscreen ? '⛶ Exit Full' : '⛶ Fullscreen'}
        </button>

        {/* Legend toggle */}
        <button
          aria-label="Toggle map legend"
          title="Legend"
          onClick={() => setShowLegend(l => !l)}
          style={{
            background: showLegend ? '#4f46e5' : 'rgba(255,255,255,0.95)',
            color: showLegend ? '#fff' : '#0f172a',
            border: 'none', borderRadius: '6px',
            padding: '5px 8px', fontSize: '0.7rem', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            minWidth: '92px', textAlign: 'left',
          }}
        >
          🗂️ Legend {showLegend ? '▲' : '▼'}
        </button>
      </div>

      {/* ── Legend panel ─────────────────────────────────────────── */}
      {showLegend && (
        <div
          role="complementary"
          aria-label="Map legend"
          style={{
            position: 'absolute',
            bottom: '36px', left: '8px',
            zIndex: 1000,
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '0.76rem',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            minWidth: '170px',
            lineHeight: '1.8',
          }}
        >
          <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', fontSize: '0.8rem' }}>
            Map Legend
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#0d9488', borderRadius: '50%', width: 14, height: 14, display: 'inline-block' }} />
            Hospital — Normal
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#d97706', borderRadius: '50%', width: 14, height: 14, display: 'inline-block' }} />
            Hospital — Warning
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#e11d48', borderRadius: '50%', width: 14, height: 14, display: 'inline-block' }} />
            Hospital — Critical
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '14px' }}>📍</span>
            Your Location
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🚑</span>
            Ambulance
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '24px', height: '4px', borderTop: '3px dashed #4f46e5', display: 'inline-block'
            }} />
            Ambulance Route
          </div>
        </div>
      )}

      {/* ── Keyboard shortcut hint ───────────────────────────────── */}
      {isFullscreen && (
        <div style={{
          position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'rgba(15,23,42,0.7)', color: '#fff',
          borderRadius: '8px', padding: '6px 14px', fontSize: '0.72rem',
          pointerEvents: 'none',
        }}>
          Press <kbd style={{ background: '#334155', borderRadius: '4px', padding: '1px 5px' }}>Esc</kbd> or click ⛶ Exit Full to return
        </div>
      )}

      {/* ── Leaflet Map ──────────────────────────────────────────── */}
      <MapContainer
        center={effectiveCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        keyboard={true}
        zoomControl={true}
      >
        <MapController center={effectiveCenter} zoom={zoom} />
        <FullscreenController isFullscreen={isFullscreen} />

        <TileLayer
          key={tileKey}
          attribution={tile.attribution}
          url={tile.url}
        />

        {/* Hospital Markers */}
        {hospitals.map((hosp) => {
          const isDestination = destinationHospital?.id === hosp.id;
          const icuColor = hosp.icu_beds_available > 0 ? '#059669' : '#e11d48';
          return (
            <Marker
              key={hosp.id}
              position={[hosp.latitude, hosp.longitude]}
              icon={createHospitalIcon(hosp.status, isDestination)}
              eventHandlers={{ click: () => onSelectHospital && onSelectHospital(hosp) }}
            >
              {/* Always-visible tooltip on hover (keyboard + mouse) */}
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <span style={{ fontWeight: 700 }}>{hosp.name}</span>
                {' — '}
                <span style={{ color: icuColor }}>
                  {hosp.icu_beds_available} ICU free
                </span>
              </Tooltip>

              {/* Detailed popup on click */}
              <Popup minWidth={220}>
                <div style={{ padding: '4px 2px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '4px' }}>
                    {hosp.name}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#64748b', marginBottom: '6px' }}>
                    {hosp.address}
                  </div>

                  {/* Status chip */}
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
                      borderRadius: '9999px',
                      background: hosp.status === 'CRITICAL' ? '#ffe4e6' : hosp.status === 'WARNING' ? '#fef3c7' : '#ecfdf5',
                      color: hosp.status === 'CRITICAL' ? '#be123c' : hosp.status === 'WARNING' ? '#92400e' : '#065f46',
                    }}>
                      {hosp.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>ICU Available:</span>
                    <strong style={{ color: icuColor }}>
                      {hosp.icu_beds_available} / {hosp.icu_beds_total}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>General Beds:</span>
                    <strong style={{ color: hosp.general_beds_available > 0 ? '#059669' : '#e11d48' }}>
                      {hosp.general_beds_available} free
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', color: '#4f46e5', marginBottom: '3px' }}>
                    <span>12h Forecast:</span>
                    <strong>+{hosp.predicted_icu_available_12h} ICU</strong>
                  </div>

                  {/* Distance from patient */}
                  {origin && (
                    <div style={{
                      marginTop: '8px', padding: '5px 8px',
                      background: '#f0f9ff', borderRadius: '6px',
                      fontSize: '0.74rem', color: '#0369a1',
                    }}>
                      📏 {haversineKm(origin.lat, origin.lng, hosp.latitude, hosp.longitude).toFixed(1)} km from you
                      &nbsp;·&nbsp;
                      ⏱️ ~{Math.round((haversineKm(origin.lat, origin.lng, hosp.latitude, hosp.longitude) / 40) * 60)} min
                    </div>
                  )}

                  {onSelectHospital && (
                    <button
                      onClick={() => onSelectHospital(hosp)}
                      style={{
                        marginTop: '10px', width: '100%',
                        background: '#0d9488', color: '#fff',
                        border: 'none', borderRadius: '6px',
                        padding: '6px', fontSize: '0.75rem', fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Select This Hospital
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
          })}

          {/* Ensure destination hospital is rendered even if not in hospitals list */}
          {destinationHospital && !hospitals.some((h) => h.id === destinationHospital.id) && (
            <Marker
              position={[destinationHospital.latitude, destinationHospital.longitude]}
              icon={createHospitalIcon(destinationHospital.status, true)}
              eventHandlers={{ click: () => onSelectHospital && onSelectHospital(destinationHospital) }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <span style={{ fontWeight: 700 }}>{destinationHospital.name}</span>
                {' — '}
                <span style={{ color: destinationHospital.icu_beds_available > 0 ? '#059669' : '#e11d48' }}>
                  {destinationHospital.icu_beds_available} ICU free
                </span>
              </Tooltip>
              <Popup minWidth={220}>
                <div style={{ padding: '4px 2px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '4px' }}>
                    {destinationHospital.name}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#64748b', marginBottom: '6px' }}>
                    {destinationHospital.address}
                  </div>
                  {/* Reuse same popup content as other markers */}
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
                      borderRadius: '9999px',
                      background: destinationHospital.status === 'CRITICAL' ? '#ffe4e6' : destinationHospital.status === 'WARNING' ? '#fef3c7' : '#ecfdf5',
                      color: destinationHospital.status === 'CRITICAL' ? '#be123c' : destinationHospital.status === 'WARNING' ? '#92400e' : '#065f46',
                    }}>
                      {destinationHospital.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>ICU Available:</span>
                    <strong style={{ color: destinationHospital.icu_beds_available > 0 ? '#059669' : '#e11d48' }}>
                      {destinationHospital.icu_beds_available} / {destinationHospital.icu_beds_total}
                    </strong>
                  </div>
                  <button
                    onClick={() => onSelectHospital && onSelectHospital(destinationHospital)}
                    style={{
                      marginTop: '10px', width: '100%',
                      background: '#0d9488', color: '#fff',
                      border: 'none', borderRadius: '6px',
                      padding: '6px', fontSize: '0.75rem', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Select This Hospital
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

        {/* Patient / Origin Marker */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={patientIcon}>
            <Tooltip direction="top" offset={[0, -12]} opacity={0.95} permanent={false}>
              📍 {origin.label || 'Your Location'}
            </Tooltip>
            <Popup minWidth={180}>
              <div style={{ padding: '4px 2px' }}>
                <div style={{ fontWeight: 800, color: '#4f46e5', marginBottom: '3px' }}>
                  📍 {origin.label || 'Patient Location'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Emergency Request Origin
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', fontFamily: 'monospace' }}>
                  {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Ambulances */}
        {ambulances.map((amb) => (
          <Marker key={amb.id} position={[amb.current_lat, amb.current_lng]} icon={ambulanceIcon}>
            <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
              🚑 {amb.registration_number}
            </Tooltip>
            <Popup minWidth={180}>
              <div style={{ padding: '4px 2px' }}>
                <div style={{ fontWeight: 800, marginBottom: '3px' }}>
                  🚑 {amb.registration_number}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Status: <strong>{amb.status}</strong></div>
                <div style={{ fontSize: '0.75rem', color: '#0f172a' }}>Driver: {amb.driver_name}</div>
                {amb.driver_phone && (
                  <div style={{ fontSize: '0.75rem', marginTop: '5px' }}>
                    <a href={`tel:${amb.driver_phone}`} style={{ color: '#0d9488', fontWeight: 700 }}>
                      📞 {amb.driver_phone}
                    </a>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords}
            color="#4f46e5"
            weight={5}
            dashArray="10, 8"
            opacity={0.9}
          />
        )}
      </MapContainer>

      {/* Esc key to exit fullscreen */}
      {isFullscreen && (
        <div
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9998 }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsFullscreen(false); }}
          tabIndex={-1}
        />
      )}
    </div>
  );
};
