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

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1tKNiTPW1_w54FWtRQZ7hg3Yww35LZaEpRBeyH1ZCjrw/export?format=csv&gid=1397067521";
const API = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

const MED_CONFIG: Record<string, { id: string; name: string; category: string; minThreshold: number; burnRate: number }> = {
  med_antivenom: { id: "1", name: "Snake Antivenom", category: "Lifesaving Venom Immunoglobulin", minThreshold: 30, burnRate: 1.8 },
  med_rabies: { id: "2", name: "Anti-Rabies Vaccine", category: "Viral Prophylaxis", minThreshold: 25, burnRate: 2.2 },
  med_oxytocin: { id: "3", name: "Oxytocin Injection", category: "Maternal Care / Hemorrhage prevention", minThreshold: 20, burnRate: 3.5 },
  med_insulin: { id: "4", name: "Insulin (Human Mix)", category: "Chronic Care / Endocrinology", minThreshold: 25, burnRate: 1.5 },
  med_iv: { id: "5", name: "IV Fluids (Normal Saline)", category: "Critical Care / Rehydration", minThreshold: 35, burnRate: 6.0 },
  med_metformin: { id: "6", name: "Metformin 500mg", category: "Essential Oral Anti-diabetic", minThreshold: 20, burnRate: 4.2 },
  med_paracetamol: { id: "7", name: "Paracetamol 650mg", category: "Basic Analgesic & Antipyretic", minThreshold: 30, burnRate: 12.0 }
};

export async function fetchLiveMedicines(): Promise<MedicineStock[]> {
  // 1. Try Backend SQLite API first
  try {
    const res = await fetch(`${API}/api/hospitals/medicines/all`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // Backend not reachable (e.g. running on Netlify standalone)
  }

  // 2. Fetch directly from Google Sheets CSV (Real-Time Source of Truth)
  try {
    const res = await fetch(GOOGLE_SHEET_CSV_URL);
    if (res.ok) {
      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (rows.length > 1) {
        const headers = rows[0].map(h => h.trim().toLowerCase());
        const idIdx = headers.indexOf("id");
        const nameIdx = headers.indexOf("name");

        const result: MedicineStock[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length <= 1) continue;
          const hospId = Number(row[idIdx]) || i;
          const facilityName = row[nameIdx]?.trim() || `Hospital ${hospId}`;

          for (const [colKey, conf] of Object.entries(MED_CONFIG)) {
            const colIdx = headers.indexOf(colKey);
            if (colIdx !== -1 && row[colIdx] !== undefined) {
              const stockVal = Math.round(Number(row[colIdx]) || 0);
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
        if (result.length > 0) return result;
      }
    }
  } catch (err) {
    console.error("Direct Google Sheet CSV fetch failed:", err);
  }

  return [];
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
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
