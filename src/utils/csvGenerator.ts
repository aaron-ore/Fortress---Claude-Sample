import * as XLSX from 'xlsx';
import { showSuccess, showError } from "@/utils/toast";

interface ExportData {
  [key: string]: any;
}

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