import {
  LayoutDashboard,
  Package,
  Receipt,
  Truck,
  BarChart,
  DollarSign,
  Users,
  AlertTriangle,
  Scale,
  FileText,
  TrendingUp,
} from "lucide-react";
import React from "react";

// Import all report content components
import DashboardSummaryReportContent from "@/components/reports/DashboardSummaryReport";
import InventoryValuationReportContent from "@/components/reports/InventoryValuationReport";
import LowStockReportContent from "@/components/reports/LowStockReport";
import InventoryMovementReportContent from "@/components/reports/InventoryMovementReport";
import SalesByCustomerReportContent from "@/components/reports/SalesByCustomerReport";
import SalesByProductReportContent from "@/components/reports/SalesByProductReport";
import PurchaseOrderStatusReportContent from "@/components/reports/PurchaseOrderStatusReport";
import ProfitabilityReportContent from "@/components/reports/ProfitabilityReport";
import DiscrepancyReportContent from "@/components/reports/DiscrepancyReport";
import AdvancedDemandForecastReportContent from "@/components/reports/AdvancedDemandForecastReport";

// PDF content components
import DashboardSummaryPdfContent from "@/components/reports/pdf/DashboardSummaryPdfContent";
import InventoryValuationPdfContent from "@/components/reports/pdf/InventoryValuationPdfContent";
import LowStockPdfContent from "@/components/reports/pdf/LowStockPdfContent";
import InventoryMovementPdfContent from "@/components/reports/pdf/InventoryMovementPdfContent";
import SalesByCustomerPdfContent from "@/components/reports/pdf/SalesByCustomerPdfContent";
import SalesByProductPdfContent from "@/components/reports/pdf/SalesByProductPdfContent";
import PurchaseOrderStatusPdfContent from "@/components/reports/pdf/PurchaseOrderStatusPdfContent";
import ProfitabilityPdfContent from "@/components/reports/pdf/ProfitabilityPdfContent";
import DiscrepancyPdfContent from "@/components/reports/pdf/DiscrepancyPdfContent";
import AdvancedDemandForecastPdfContent from "@/components/reports/pdf/AdvancedDemandForecastPdfContent";
import PutawayLabelPdfContent from "@/components/reports/pdf/PutawayLabelPdfContent";
import InvoicePdfContent from "@/components/reports/pdf/InvoicePdfContent";
import PurchaseOrderPdfContent from "@/components/reports/pdf/PurchaseOrderPdfContent";
import FolderLabelPdfContent from "@/components/reports/pdf/FolderLabelPdfContent";
import PickingWavePdfContent from "@/components/reports/pdf/PickingWavePdfContent";


export interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

export interface ReportCategory {
  title: string;
  icon: React.ElementType;
  reports: ReportItem[];
}

export const reportCategories: ReportCategory[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    reports: [
      { id: "dashboard-summary", title: "Dashboard Summary", description: "High-level overview of key metrics.", icon: LayoutDashboard },
    ],
  },
  {
    title: "Inventory Reports",
    icon: Package,
    reports: [
      { id: "inventory-valuation", title: "Inventory Valuation", description: "Value of all stock by category/folder.", icon: DollarSign },
      { id: "low-stock-out-of-stock", title: "Low/Out of Stock", description: "Items needing replenishment.", icon: AlertTriangle },
      { id: "inventory-movement", title: "Inventory Movement", description: "Detailed log of stock changes.", icon: Scale },
      { id: "stock-discrepancy", title: "Stock Discrepancy", description: "Reported differences in stock counts.", icon: AlertTriangle },
    ],
  },
  {
    title: "Sales Reports",
    icon: Receipt,
    reports: [
      { id: "sales-by-customer", title: "Sales by Customer", description: "Revenue generated per customer.", icon: Users },
      { id: "sales-by-product", title: "Sales by Product", description: "Top-selling items by quantity/revenue.", icon: BarChart },
      { id: "advanced-demand-forecast", title: "Advanced Demand Forecast", description: "AI-powered predictions for future demand.", icon: TrendingUp },
    ],
  },
  {
    title: "Purchase Reports",
    icon: Truck,
    reports: [
      { id: "purchase-order-status", title: "Purchase Order Status", description: "Overview of all purchase orders.", icon: FileText },
    ],
  },
  {
    title: "Financial Reports",
    icon: DollarSign,
    reports: [
      { id: "profitability", title: "Profitability (Gross Margin)", description: "Gross profit by product or category.", icon: DollarSign },
    ],
  },
];

// Map report IDs to their respective content components
export const reportContentComponents: { [key: string]: React.ElementType } = {
  "dashboard-summary": DashboardSummaryReportContent,
  "inventory-valuation": InventoryValuationReportContent,
  "low-stock-out-of-stock": LowStockReportContent,
  "inventory-movement": InventoryMovementReportContent,
  "sales-by-customer": SalesByCustomerReportContent,
  "sales-by-product": SalesByProductReportContent,
  "purchase-order-status": PurchaseOrderStatusReportContent,
  "profitability": ProfitabilityReportContent,
  "stock-discrepancy": DiscrepancyReportContent,
  "advanced-demand-forecast": AdvancedDemandForecastReportContent,
};

// Map report IDs to their respective PDF content components
export const pdfContentComponents: { [key: string]: React.ElementType } = {
  "dashboard-summary": DashboardSummaryPdfContent,
  "inventory-valuation": InventoryValuationPdfContent,
  "low-stock-out-of-stock": LowStockPdfContent,
  "inventory-movement": InventoryMovementPdfContent,
  "sales-by-customer": SalesByCustomerPdfContent,
  "sales-by-product": SalesByProductPdfContent,
  "purchase-order-status": PurchaseOrderStatusPdfContent,
  "profitability": ProfitabilityPdfContent,
  "stock-discrepancy": DiscrepancyPdfContent,
  "advanced-demand-forecast": AdvancedDemandForecastPdfContent,
  "putaway-label": PutawayLabelPdfContent,
  "purchase-order": PurchaseOrderPdfContent,
  "invoice": InvoicePdfContent,
  "location-label": FolderLabelPdfContent,
  "picking-wave": PickingWavePdfContent,
};