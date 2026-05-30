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
  Upload, // NEW: Import Upload icon
  Utensils, // NEW: Import Utensils icon
  Wrench, // Changed from Tool to Wrench icon for Advanced Tools
  TrendingDown, // Variance Finder
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isParent?: boolean;
  children?: NavItem[];
  adminOnly?: boolean;
  mobileOnly?: boolean;
  action?: () => void;
  tag?: string;
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/home", icon: LayoutDashboard },
  {
    title: "Food Cost Variance",
    href: "/variance",
    icon: TrendingDown,
    isParent: true,
    tag: "NEW",
    children: [
      { title: "Variance Report", href: "/variance", icon: TrendingDown },
      { title: "Sales Import", href: "/variance/sales-import", icon: Upload },
      { title: "POS Mapping", href: "/variance/mapping", icon: Plug },
      { title: "Physical Counts", href: "/variance/counts", icon: Package },
    ],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    isParent: true,
    children: [
      { title: "All Items", href: "/inventory", icon: Package },
      { title: "Recipes (BOM)", href: "/recipes", icon: Utensils },
      { title: "Locations", href: "/folders", icon: MapPin },
    ],
  },
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
      { title: "Warehouse Operations", href: "/warehouse-operations", icon: Warehouse },
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