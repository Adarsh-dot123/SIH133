export interface MedicineStock {
  id: string;
  med_id: string;
  hospital_id: number;
  name: string;
  category: string;
  stockLevel: number;
  burnRate: number;
  minThreshold: number;
  facility: string;
  isRestocking?: boolean;
  restockEta?: number;
  vehicle?: string;
}

const GOOGLE_SHEET_GVIZ_URL = "https://docs.google.com/spreadsheets/d/1tKNiTPW1_w54FWtRQZ7hg3Yww35LZaEpRBeyH1ZCjrw/gviz/tq?tqx=out:csv&gid=1397067521";
const API = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';
const DISPATCHED_STORAGE_KEY = 'medflow_dispatched_overrides';

const MED_CONFIG: Record<string, { id: string; name: string; category: string; minThreshold: number; burnRate: number }> = {
  med_antivenom: { id: "1", name: "Snake Antivenom", category: "Lifesaving Venom Immunoglobulin", minThreshold: 30, burnRate: 1.8 },
  med_rabies: { id: "2", name: "Anti-Rabies Vaccine", category: "Viral Prophylaxis", minThreshold: 25, burnRate: 2.2 },
  med_oxytocin: { id: "3", name: "Oxytocin Injection", category: "Maternal Care / Hemorrhage prevention", minThreshold: 20, burnRate: 3.5 },
  med_insulin: { id: "4", name: "Insulin (Human Mix)", category: "Chronic Care / Endocrinology", minThreshold: 25, burnRate: 1.5 },
  med_iv: { id: "5", name: "IV Fluids (Normal Saline)", category: "Critical Care / Rehydration", minThreshold: 35, burnRate: 6.0 },
  med_metformin: { id: "6", name: "Metformin 500mg", category: "Essential Oral Anti-diabetic", minThreshold: 20, burnRate: 4.2 },
  med_paracetamol: { id: "7", name: "Paracetamol 650mg", category: "Basic Analgesic & Antipyretic", minThreshold: 30, burnRate: 12.0 }
};

const DEFAULT_HOSPITALS = [
  { id: 1, name: "Apol Hospitals" },
  { id: 2, name: "Sunfeast Hospitals" },
  { id: 3, name: "Kamaraj Hospitals" },
  { id: 4, name: "Nehru Hospitals" },
  { id: 5, name: "Gandhi Hospitals" },
  { id: 6, name: "Ambedkar Hospitals" },
  { id: 7, name: "MGR Hospitals" },
  { id: 8, name: "OMR Hospitals" },
  { id: 9, name: "Sunrise Hospitals" },
  { id: 10, name: "APJ Hospitals" }
];

export function getDispatchedOverrides(): Record<string, { stockLevel: number; isRestocking?: boolean; restockEta?: number; vehicle?: string; timestamp: number }> {
  try {
    const raw = localStorage.getItem(DISPATCHED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDispatchedOverride(id: string, override: { stockLevel: number; isRestocking?: boolean; restockEta?: number; vehicle?: string }) {
  try {
    const map = getDispatchedOverrides();
    map[id] = { ...override, timestamp: Date.now() };
    localStorage.setItem(DISPATCHED_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export async function syncStockUpdateToCloud(hospital_id: number, med_id: string, stockLevel: number) {
  try {
    await fetch(`${API}/api/hospitals/${hospital_id}/medicines/${med_id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_level: stockLevel })
    });
  } catch {}
}

export const DEFAULT_MEDICINES: MedicineStock[] = DEFAULT_HOSPITALS.flatMap(h => {
  return Object.values(MED_CONFIG).map(c => ({
    id: `${h.id}_${c.id}`,
    med_id: c.id,
    hospital_id: h.id,
    name: c.name,
    category: c.category,
    stockLevel: (h.id === 7 && c.id === "2") ? 59 : ((h.id === 10 && c.id === "3") ? 57 : 0),
    burnRate: c.burnRate,
    minThreshold: c.minThreshold,
    facility: h.name,
    isRestocking: false,
    restockEta: 0
  }));
});

export async function fetchLiveMedicines(): Promise<MedicineStock[]> {
  let list: MedicineStock[] = [];

  // 1. Try Google Sheets gviz CSV (CORS-enabled public stream matching active Sheet tab)
  try {
    const res = await fetch(GOOGLE_SHEET_GVIZ_URL);
    if (res.ok) {
      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (rows.length > 1) {
        const headers = rows[0].map(h => cleanCell(h).toLowerCase());
        const idIdx = headers.indexOf("id");
        const nameIdx = headers.indexOf("name");

        const result: MedicineStock[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length <= 1) continue;
          
          const rawId = idIdx !== -1 ? cleanCell(row[idIdx]) : "";
          const rawName = nameIdx !== -1 ? cleanCell(row[nameIdx]) : "";
          const hospId = Number(rawId) || i;
          const facilityName = rawName || DEFAULT_HOSPITALS.find(dh => dh.id === hospId)?.name || `Hospital ${hospId}`;

          for (const [colKey, conf] of Object.entries(MED_CONFIG)) {
            const colIdx = headers.indexOf(colKey);
            if (colIdx !== -1 && row[colIdx] !== undefined) {
              const cellVal = cleanCell(row[colIdx]);
              const stockVal = cellVal === "" ? 0 : Math.round(Number(cellVal) || 0);
              result.push({
                id: `${hospId}_${conf.id}`,
                med_id: conf.id,
                hospital_id: hospId,
                name: conf.name,
                category: conf.category,
                stockLevel: isNaN(stockVal) ? 0 : Math.max(0, Math.min(100, stockVal)),
                burnRate: conf.burnRate,
                minThreshold: conf.minThreshold,
                facility: facilityName,
                isRestocking: false,
                restockEta: 0
              });
            }
          }
        }
        if (result.length > 0) list = result;
      }
    }
  } catch (err) {
    console.warn("Direct Google Sheet gviz fetch failed, using fallback:", err);
  }

  // 2. Try Backend API if Google Sheet fetch failed
  if (list.length === 0) {
    try {
      const res = await fetch(`${API}/api/hospitals/medicines/all`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          list = data;
        }
      }
    } catch {}
  }

  if (list.length === 0) {
    list = DEFAULT_MEDICINES;
  }

  // 3. Apply active overrides (restocking countdown or recent dispatch)
  const overrides = getDispatchedOverrides();
  return list.map(m => {
    const ov = overrides[m.id];
    if (ov) {
      // If delivery is en-route
      if (ov.isRestocking && ov.restockEta && ov.restockEta > 0) {
        return { ...m, isRestocking: true, restockEta: ov.restockEta, vehicle: ov.vehicle };
      }
      // If recently restocked and currently depleting dynamically
      if (ov.stockLevel !== undefined) {
        return { ...m, stockLevel: ov.stockLevel, isRestocking: false, restockEta: 0 };
      }
    }
    return m;
  });
}

function cleanCell(str: string): string {
  if (!str) return "";
  return str.replace(/^["']|["']$/g, '').trim();
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  return lines.map(line => {
    const row: string[] = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    return row;
  });
}
