import {
  LayoutDashboard,
  Package,
  Receipt,
  Truck,
  BarChart,
  Warehouse,
  MapPin,
  User,
  Settings as SettingsIcon,
  Bell,
  DollarSign,
  Users as UsersIcon,
  HelpCircle,
  Sparkles,
  BookOpen,
  Plug,
  Zap,
  Activity,
  Utensils, // NEW: Import Utensils icon
  Wrench, // Changed from Tool to Wrench icon for Advanced Tools
  TrendingDown, // Variance Finder
  Ruler, // Units of measure
  ScanBarcode, // Quick Scan station
  PackagePlus, // Bulk Intake
  Cpu, // Devices (serialized units)
  PackageCheck, // Allocate
  Store, // Merchants & Partners
} from "lucide-react";
import { BusinessMode } from "@/lib/businessModes";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isParent?: boolean;
  children?: NavItem[];
  adminOnly?: boolean;
  /** Modes this item appears in. Omit to show in every mode. */
  modes?: BusinessMode[];
  mobileOnly?: boolean;
  action?: () => void;
  tag?: string;
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/home", icon: LayoutDashboard },
  {
    title: "Food Cost",
    href: "/food-cost",
    icon: TrendingDown,
    tag: "NEW",
    modes: ["restaurant"],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    isParent: true,
    children: [
      { title: "All Items", href: "/inventory", icon: Package },
      { title: "Recipes (BOM)", href: "/recipes", icon: Utensils, modes: ["restaurant"] },
      { title: "Units of Measure", href: "/units", icon: Ruler, modes: ["restaurant"] },
      { title: "Locations", href: "/folders", icon: MapPin },
    ],
  },
  { title: "Quick Scan", href: "/quick-scan", icon: ScanBarcode, modes: ["retail", "warehouse"] },
  { title: "Bulk Intake", href: "/bulk-intake", icon: PackagePlus, tag: "NEW", modes: ["warehouse"] },
  { title: "Devices", href: "/devices", icon: Cpu, tag: "NEW", modes: ["warehouse"] },
  { title: "Allocate", href: "/allocate", icon: PackageCheck, tag: "NEW", modes: ["warehouse"] },
  { title: "Ship", href: "/ship", icon: Truck, tag: "NEW", modes: ["warehouse"] },
  { title: "Merchants", href: "/partners-merchants", icon: Store, modes: ["warehouse"] },
  { title: "Orders", href: "/orders", icon: Receipt },
  { title: "Vendors", href: "/vendors", icon: Truck },
  { title: "Reports", href: "/reports", icon: BarChart },
  {
    title: "Advanced Tools",
    href: "/advanced-tools",
    icon: Wrench,
    isParent: true,
    children: [
      { title: "Customers", href: "/customers", icon: User },
      { title: "Integrations", href: "/integrations", icon: Plug },
      { title: "Automation", href: "/automation", icon: Zap, adminOnly: true },
      { title: "Warehouse Operations", href: "/warehouse-operations", icon: Warehouse, modes: ["warehouse"] },
    ],
  },
];

export const userAndSettingsNavItems: NavItem[] = [
  { title: "My Profile", href: "/profile", icon: User },
  { title: "Notifications", href: "/notifications-page", icon: Bell },
  { title: "Billing & Subscriptions", href: "/billing", icon: DollarSign },
  {
    title: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    isParent: true,
    children: [
      { title: "Company Settings", href: "/settings", icon: SettingsIcon },
      { title: "Account Settings", href: "/account-settings", icon: SettingsIcon }, // Moved here
      { title: "User Management", href: "/users", icon: UsersIcon, adminOnly: true },
      { title: "Activity Logs", href: "/activity-logs", icon: Activity, adminOnly: true },
    ],
  },
];

export const supportAndResourcesNavItems: NavItem[] = [
  { title: "Help Center", href: "/help", icon: HelpCircle },
  { title: "What's New?", href: "/whats-new", icon: Sparkles },
  { title: "Setup Instructions", href: "/setup-instructions", icon: BookOpen },
];