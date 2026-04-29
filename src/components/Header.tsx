"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Search, Bell, User, LogOut, Flag } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import CurrentDateTime from "./CurrentDateTime";
import { useNotifications } from "@/context/NotificationContext";
import { useProfile } from "@/context/ProfileContext";
import { supabase } from "@/lib/supabaseClient";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileNav from "./mobile/MobileNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userAndSettingsNavItems, supportAndResourcesNavItems, NavItem } from "@/lib/navigation";

interface HeaderProps {
  setIsNotificationSheetOpen: (isOpen: boolean) => void;
  setIsGlobalSearchDialogOpen: (isOpen: boolean) => void;
  setIsFeedbackDialogOpen: (isOpen: boolean) => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ setIsNotificationSheetOpen, setIsGlobalSearchDialogOpen, setIsFeedbackDialogOpen, className }) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    const { data: { session } = { session: null } } = await supabase.auth.getSession();
    if (!session) {
      showSuccess("Already logged out.");
      navigate("/auth");
      return;
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      showError("Failed to log out: " + error.message);
    } else {
      showSuccess("Logged out!");
      navigate("/auth");
    }
  };

  const renderDropdownItems = (items: NavItem[]) => (
    <>
      {items.map((item: NavItem) => { // Explicitly type item
        if (item.adminOnly && profile?.role !== 'admin') {
          return null;
        }
        return (
          <DropdownMenuItem key={item.title} onClick={() => navigate(item.href)}>
            {item.icon && <item.icon className="h-4 w-4 mr-2" />}
            {item.title}
            {item.title === "Notifications" && unreadCount > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </DropdownMenuItem>
        );
      })}
    </>
  );

  if (isMobile) {
    return (
      <header className={cn("bg-sidebar-background border-b border-border px-4 py-3 flex items-center justify-between h-[60px] flex-shrink-0", className)}>
        <div className="flex items-center space-x-4">
          <MobileNav />
          <div className="flex items-center space-x-2">
            {profile?.companyProfile?.companyLogoUrl ? (
              <img src={profile.companyProfile.companyLogoUrl} alt="Company Logo" className="h-6 w-auto object-contain" />
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-sidebar-foreground"
              >
                <path
                  d="M12 2L2 12L12 22L22 12L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 2L2 12L12 22L22 12L12 2Z"
                  fill="currentColor"
                  fillOpacity="0.2"
                />
              </svg>
            )}
            <span className="text-xl font-semibold text-sidebar-foreground">
              {profile?.companyProfile?.companyName || "Fortress"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0 min-w-0">
          <CurrentDateTime className="text-sidebar-foreground text-xs" />
          <Button variant="ghost" size="icon" onClick={() => setIsGlobalSearchDialogOpen(true)} className="text-sidebar-foreground hover:bg-white/20">
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-sidebar-foreground hover:bg-white/20"
            onClick={() => setIsNotificationSheetOpen(true)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Button>
        </div>
      </header>
    );
  }

  // Desktop Header
  return (
    <header className={cn("bg-sidebar-background rounded-lg shadow-sm p-4 flex items-center justify-between h-[80px] flex-shrink-0", className)}>
      <div className="flex items-center space-x-4 flex-grow">
        {profile?.companyProfile?.companyLogoUrl ? (
          <img src={profile.companyProfile.companyLogoUrl} alt="Company Logo" className="h-8 w-auto object-contain" />
        ) : (
          <h2 className="text-2xl font-bold text-sidebar-foreground truncate max-w-xs">
            {profile?.companyProfile?.companyName || "Fortress"}
          </h2>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <CurrentDateTime className="text-sidebar-foreground" />
        <Button variant="ghost" size="icon" onClick={() => setIsGlobalSearchDialogOpen(true)} className="text-sidebar-foreground hover:bg-white/20">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setIsFeedbackDialogOpen(true)} className="text-sidebar-foreground hover:bg-white/20">
          <Flag className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-sidebar-foreground hover:bg-white/20"
          onClick={() => setIsNotificationSheetOpen(true)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 w-auto justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-white/20"
            >
              <User className="h-5 w-5 mr-3" />
              <span className="truncate">{profile?.fullName || "My Profile"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>User & Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {renderDropdownItems(userAndSettingsNavItems)}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Support & Resources</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {renderDropdownItems(supportAndResourcesNavItems)}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;