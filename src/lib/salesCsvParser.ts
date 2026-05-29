import * as XLSX from "xlsx";

// Parses a POS sales export CSV into normalized rows: { menu_item_name, qty_sold, date }.
// Deterministic, client-side (mirrors the existing inventory CSV import pattern).
// Column headers are matched case-insensitively and tolerate common aliases.

export interface ParsedSalesRow {
  menuItemName: string;
  qtySold: number;
  saleDate: string; // YYYY-MM-DD
}

export interface SalesParseResult {
  rows: ParsedSalesRow[];
  errors: string[];
}

const NAME_KEYS = ["menu_item_name", "menu item name", "menuitemname", "item", "item name", "name", "product", "menu_item"];
const QTY_KEYS = ["qty_sold", "qty sold", "qtysold", "quantity", "qty", "units sold", "units", "count", "sold"];
const DATE_KEYS = ["date", "sale_date", "sale date", "business date", "day"];

const normalizeKey = (k: string) => k.toLowerCase().trim().replace(/\s+/g, " ");

const pickValue = (row: Record<string, any>, candidates: string[]): any => {
  const map = new Map<string, any>();
  for (const [k, v] of Object.entries(row)) map.set(normalizeKey(k), v);
  for (const c of candidates) {
    if (map.has(c)) return map.get(c);
  }
  return undefined;
};

/** Coerce common spreadsheet date encodings to YYYY-MM-DD. Returns "" if unparseable. */
export const normalizeSaleDate = (raw: any): string => {
  if (raw == null || raw === "") return "";
  // XLSX serial date number (days since 1899-12-30)
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      const mm = String(parsed.m).padStart(2, "0");
      const dd = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const s = String(raw).trim();
  // Already ISO-ish
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  // M/D/YYYY or D/M/YYYY style — assume month-first (US POS exports)
  const slash = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (slash) {
    let [, mo, da, yr] = slash;
    if (yr.length === 2) yr = `20${yr}`;
    return `${yr}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  return "";
};

export const parseSalesWorkbookData = (jsonData: any[]): SalesParseResult => {
  const rows: ParsedSalesRow[] = [];
  const errors: string[] = [];

  jsonData.forEach((raw, i) => {
    const rowNum = i + 2; // header is row 1
    const name = String(pickValue(raw, NAME_KEYS) ?? "").trim();
    const qtyRaw = pickValue(raw, QTY_KEYS);
    const dateRaw = pickValue(raw, DATE_KEYS);

    if (!name) {
      errors.push(`Row ${rowNum}: missing menu item name.`);
      return;
    }
    const qty = parseFloat(String(qtyRaw ?? "").replace(/,/g, ""));
    if (!Number.isFinite(qty) || qty < 0) {
      errors.push(`Row ${rowNum} (${name}): invalid quantity "${qtyRaw}".`);
      return;
    }
    const saleDate = normalizeSaleDate(dateRaw);
    if (!saleDate) {
      errors.push(`Row ${rowNum} (${name}): missing or unparseable date "${dateRaw}".`);
      return;
    }
    rows.push({ menuItemName: name, qtySold: qty, saleDate });
  });

  return { rows, errors };
};

/** Parse a raw CSV/XLSX file string (binary) read from a File. */
export const parseSalesCsvBinary = (binaryString: string): SalesParseResult => {
  const workbook = XLSX.read(binaryString, { type: "binary" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);
  if (jsonData.length === 0) return { rows: [], errors: ["The file is empty or has no data rows."] };
  return parseSalesWorkbookData(jsonData);
};
