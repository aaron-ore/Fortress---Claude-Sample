import * as XLSX from 'xlsx';
import { showSuccess, showError } from "@/utils/toast";
import type { InventoryItem } from "@/context/InventoryContext";
import type { InventoryFolder } from "@/context/OnboardingContext";

interface ExportData {
  [key: string]: any;
}

// --- CSV export helpers -----------------------------------------------------

/** Quote a CSV value when it contains a comma, quote, or newline (RFC 4180). */
const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/** Turn an array of plain objects into a CSV string, using `headers` for column order. */
const rowsToCsv = (headers: string[], rows: Record<string, unknown>[]): string => {
  const lines = [headers.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCsvValue(row[h])).join(","));
  }
  return lines.join("\n");
};

/** Trigger a browser download of `csvContent`. Returns false if unsupported. */
const downloadCsv = (csvContent: string, filename: string): boolean => {
  const link = document.createElement("a");
  if (link.download === undefined) {
    showError("Browser doesn't support file downloads.");
    return false;
  }
  // Prepend a BOM so Excel opens UTF-8 (accented names, etc.) correctly.
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

/** Build a human-readable folder path like "Walk-in / Dairy" for a given folderId. */
const buildFolderPath = (
  folderId: string | undefined,
  folderMap: Map<string, InventoryFolder>,
): string => {
  if (!folderId) return "";
  const parts: string[] = [];
  let current = folderMap.get(folderId);
  // Guard against cycles in malformed data.
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? folderMap.get(current.parentId) : undefined;
  }
  return parts.join(" / ");
};

// Columns kept aligned with `generateInventoryCsvTemplate` so an export can be
// edited and re-imported. `folderName` is the item's *leaf* folder (matches the
// importer); `folderPath`, `quantity`, and `status` are read-only extras.
const INVENTORY_EXPORT_HEADERS = [
  "name",
  "sku",
  "description",
  "category",
  "folderName",
  "folderPath",
  "quantity",
  "status",
  "pickingBinQuantity",
  "overstockQuantity",
  "reorderLevel",
  "pickingReorderLevel",
  "committedStock",
  "incomingStock",
  "unitCost",
  "retailPrice",
  "vendorId",
  "barcode",
  "barcodeUrl",
  "imageUrl",
  "autoReorderEnabled",
  "autoReorderQuantity",
  "tags",
  "notes",
];

/**
 * Export inventory items to a CSV file (downloads in the browser).
 * Each row carries the item's leaf `folderName` plus a readable `folderPath`,
 * so a flattened export from nested folders stays attributable.
 */
export const exportInventoryToCsv = (
  items: InventoryItem[],
  folders: InventoryFolder[],
  filename: string,
): void => {
  if (!items || items.length === 0) {
    showError("No items to export.");
    return;
  }

  const folderMap = new Map(folders.map(f => [f.id, f]));

  const rows: Record<string, unknown>[] = items.map(item => ({
    name: item.name,
    sku: item.sku,
    description: item.description,
    category: item.category,
    folderName: folderMap.get(item.folderId)?.name ?? "",
    folderPath: buildFolderPath(item.folderId, folderMap),
    quantity: item.quantity,
    status: item.status,
    pickingBinQuantity: item.pickingBinQuantity,
    overstockQuantity: item.overstockQuantity,
    reorderLevel: item.reorderLevel,
    pickingReorderLevel: item.pickingReorderLevel,
    committedStock: item.committedStock,
    incomingStock: item.incomingStock,
    unitCost: item.unitCost,
    retailPrice: item.retailPrice,
    vendorId: item.vendorId ?? "",
    barcode: item.barcode ?? "",
    barcodeUrl: item.barcodeUrl ?? "",
    imageUrl: item.imageUrl ?? "",
    autoReorderEnabled: item.autoReorderEnabled ? "TRUE" : "FALSE",
    autoReorderQuantity: item.autoReorderQuantity,
    tags: item.tags?.join(", ") ?? "",
    notes: item.notes ?? "",
  }));

  const csv = rowsToCsv(INVENTORY_EXPORT_HEADERS, rows);
  if (downloadCsv(csv, filename)) {
    showSuccess(`Exported ${items.length} item${items.length === 1 ? "" : "s"}.`);
  }
};

export const exportToExcel = (data: ExportData[], filename: string, sheetName: string = "Sheet1") => {
  if (!data || data.length === 0) {
    showError("No data to export.");
    return;
  }

  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
    showSuccess(`Exported "${filename}.xlsx"!`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    showError(`Failed to export "${filename}.xlsx".`);
  }
};

export const generateInventoryCsvTemplate = (): string => {
  const headers = [
    "name",
    "description",
    "sku",
    "category",
    "pickingBinQuantity",
    "overstockQuantity",
    "reorderLevel",
    "pickingReorderLevel",
    "committedStock",
    "incomingStock",
    "unitCost",
    "retailPrice",
    "folderName", // Changed from location to folderName
    "imageUrl",
    "vendorId",
    "barcodeUrl",
    "autoReorderEnabled",
    "autoReorderQuantity",
    "tags", // Added tags
    "notes", // Added notes
  ];

  const exampleRow = [
    "Example Product A",
    "Description for Product A",
    "SKU-001",
    "Electronics",
    "50", // pickingBinQuantity
    "50", // overstockQuantity
    "20", // reorderLevel
    "10", // pickingReorderLevel
    "5", // committedStock
    "10", // incomingStock
    "15.00", // unitCost
    "25.00", // retailPrice
    "Main Warehouse", // example folder name
    "http://example.com/imageA.jpg", // imageUrl
    "vendor-uuid-123", // vendorId
    "SKU-001", // barcodeUrl
    "TRUE", // autoReorderEnabled
    "100", // autoReorderQuantity
    "fragile, high-value", // example tags
    "Special handling required.", // example notes
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.join(","),
  ].join("\n");

  return csvContent;
};

export const generateCustomerCsvTemplate = (): string => {
  const headers = [
    "name",
    "contactPerson",
    "email",
    "phone",
    "address",
    "notes",
  ];

  const exampleRow = [
    "Acme Corp",
    "Jane Doe",
    "jane.doe@acmecorp.com",
    "555-123-4567",
    "123 Main St, Anytown, USA",
    "Key account, always offers discounts.",
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.join(","),
  ].join("\n");

  return csvContent;
};