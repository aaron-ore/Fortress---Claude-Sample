import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CalendarDays, GitCommit } from "lucide-react";

interface ReleaseNote {
  version: string;
  date: string;
  features: string[];
  improvements: string[];
  bugFixes: string[];
}

const WhatsNew: React.FC = () => {
  // Mock release notes data
  const releaseNotes: ReleaseNote[] = [
    {
      version: "2.0.0",
      date: "2026-06-14",
      features: [
        "<strong>Choose your business type:</strong> In Settings you can now set your organization to <strong>Warehouse</strong>, <strong>Restaurant</strong>, or <strong>Retail / Hardware</strong>. The app reshapes itself to fit — the menu, dashboard, and item fields only show what's relevant to how you run.",
        "<strong>Retail / Hardware mode:</strong> A dedicated home dashboard with the numbers retail cares about — active SKUs, stock value at cost, retail value, projected margin, and low / out-of-stock counts.",
        "<strong>Quick Scan station:</strong> Scan a product to instantly check stock, receive a delivery (stock in), or sell an item off the shelf (stock out). Works with a USB hand scanner, your phone's camera, or by typing the code.",
        "<strong>Scan barcodes with your phone camera:</strong> The camera now reads both QR codes and standard product barcodes (UPC / EAN / Code-128) — no extra app needed.",
        "<strong>Save a product barcode:</strong> Every item can now store its printed UPC / EAN barcode in addition to its QR code, so scanning a real product finds it.",
        "<strong>Guided Food Cost Variance workflow:</strong> A clear step bar walks you through Import Sales → Map POS Items → Physical Counts → Variance Report, so you always know what's next.",
        "<strong>Quick dark / light toggle</strong> in the mobile header for comfortable viewing in any lighting.",
      ],
      improvements: [
        "<strong>Faster setup:</strong> New accounts start with a set of common categories, and empty screens now point you to the next step (add your first item, import a CSV, etc.).",
        "<strong>Cleaner mobile experience:</strong> The top navigation bar now stays in place as you scroll, the page no longer slides sideways into blank space, and large dashboard numbers stay neatly inside their cards (shown as $1.2M instead of overflowing).",
        "<strong>Tidier header:</strong> Better spacing around the notification bell, and the date/time now shows on desktop while mobile gets the dark-mode toggle in its place.",
        "<strong>Order Management</strong> tabs no longer overlap on phone screens.",
        "<strong>Smoother taps:</strong> Removed the stray highlight that appeared when tapping buttons on mobile.",
      ],
      bugFixes: [
        "<strong>Warehouse Operations</strong> tools (Lookup, Receive, Putaway, Cycle Count, etc.) now open reliably — previously they could flash open and immediately close.",
        "<strong>Recipes:</strong> Ingredients now save correctly when creating a recipe, and the ingredient list scrolls properly so you can add and see as many ingredients as you need.",
        "<strong>Camera scanning</strong> now reliably reads product barcodes on iPhone.",
        "The <strong>Create Order</strong> button on inventory items now opens the purchase order screen instead of showing an error.",
      ],
    },
    {
      version: "1.3.0",
      date: "2024-09-01",
      features: [
        "Full Supabase Integration: Robust backend for authentication, database, storage, and serverless Edge Functions.",
        "Advanced Inventory Management: Split quantities into Picking Bin and Overstock, with separate reorder levels. Item images, QR codes, and detailed history tracking.",
        "Comprehensive Warehouse Operations: Dedicated mobile-optimized tools for Item Lookup, Receive Inventory, Putaway, Fulfill Order, Ship Order, Picking Wave Management, Replenishment, Shipping Verification, Returns Processing, Stock Transfer, Cycle Count, and Issue Reporting.",
        "AI-Powered Report Summaries: Generate concise AI summaries for any report using Gemini Edge Functions.",
        "QuickBooks Integration: Connect your QuickBooks account to sync sales orders and financial data.",
        "Shopify Integration: Connect your Shopify store to sync products and map locations for inventory management.",
        "Automated Reordering & Notifications: System to automatically generate purchase orders for low-stock items and send email notifications via Brevo Edge Function.",
        "Customizable Theming: Choose from multiple vibrant themes (Ocean Breeze, Sunset Glow, Forest Whisper, Emerald, Deep Forest, Natural Light) for your organization.",
        "Customer Management: Dedicated section to manage customer profiles and contact information.",
        "Location Management: Structured location setup (Area-Row-Bay-Level-Pos) with QR code label generation and inventory view by location.",
        "New Reports: Added Inventory Valuation, Low/Out of Stock, Inventory Movement, Sales by Customer, Sales by Product, Purchase Order Status, Profitability, and Stock Discrepancy reports.",
        "Global Search: Quickly find inventory items, orders, vendors, and navigate to app pages.",
      ],
      improvements: [
        "Enhanced User Role Management: Granular control over user permissions with 'Viewer', 'Inventory Manager', and 'Admin' roles.",
        "Improved Order Management: Drag-and-drop reordering of items within orders, and more detailed order statuses.",
        "Real-time Data Sync: Instant updates across the application thanks to Supabase Realtime subscriptions.",
        "Refined UI/UX: Numerous visual and usability enhancements across all pages for a smoother experience.",
        "Robust Error Handling: Improved error messages and an application-wide Error Boundary for stability.",
      ],
      bugFixes: [
        "Resolved various minor display and data consistency issues.",
        "Fixed email confirmation redirect and improved authentication flow.",
      ],
    },
    {
      version: "1.2.0",
      date: "2024-08-15",
      features: [
        "Kanban Board for Order Management: Visually track order statuses with drag-and-drop functionality.",
        "PDF Export for Purchase Orders & Invoices: Generate professional PDF documents directly from order pages.",
      ],
      improvements: [
        "Enhanced Inventory Filtering: Added more filter options for better inventory overview.",
        "Improved Dashboard Performance: Faster loading times for key metrics.",
        "CSV Import/Export for Inventory: Bulk upload and download inventory data.",
      ],
      bugFixes: [
        "Fixed an issue where certain inventory items were not saving correctly.",
        "Resolved display issues on smaller screens for the reports page.",
      ],
    },
    {
      version: "1.1.0",
      date: "2024-07-20",
      features: [
        "Basic User Role Management: Assign 'Admin', 'Inventory Manager', and 'Viewer' roles.",
        "Company Profile & Onboarding Wizard: Guided setup for new organizations.",
      ],
      improvements: [
        "Updated UI for Add/Edit Inventory Dialogs.",
        "Better error handling for data operations.",
      ],
      bugFixes: [
        "Corrected calculation for total stock value on dashboard.",
      ],
    },
    {
      version: "1.0.0",
      date: "2024-06-01",
      features: [
        "Initial Release: Core Inventory Management.",
        "Product Catalog & SKU Management.",
        "Basic Sales & Purchase Order Tracking.",
        "Dashboard Overview with Key Metrics.",
      ],
      improvements: [],
      bugFixes: [],
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">What's New in Fortress</h1>
      <p className="text-muted-foreground">Stay up-to-date with the latest features, improvements, and bug fixes.</p>

      <div className="space-y-8">
        {releaseNotes.map((release) => (
          <Card key={release.version} className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl font-bold text-foreground">Version {release.version}</CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {release.date}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Released on {release.date}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {release.features.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-primary flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> New Features
                  </h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {release.features.map((feature, index) => (
                      <li key={index} dangerouslySetInnerHTML={{ __html: feature }} />
                    ))}
                  </ul>
                </div>
              )}

              {release.improvements.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-accent flex items-center gap-2">
                    <GitCommit className="h-5 w-5" /> Improvements
                  </h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {release.improvements.map((improvement, index) => (
                      <li key={index} dangerouslySetInnerHTML={{ __html: improvement }} />
                    ))}
                  </ul>
                </div>
              )}

              {release.bugFixes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-destructive flex items-center gap-2">
                    <GitCommit className="h-5 w-5" /> Bug Fixes
                  </h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {release.bugFixes.map((fix, index) => (
                      <li key={index} dangerouslySetInnerHTML={{ __html: fix }} />
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WhatsNew;