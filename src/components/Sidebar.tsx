import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mainNavItems, userAndSettingsNavItems, supportAndResourcesNavItems, NavItem } from "@/lib/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { useProfile } from "@/context/ProfileContext";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/context/SidebarContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge"; // NEW: Import Badge

interface SidebarProps {
  // isCollapsed: boolean; // REMOVED: No longer passed as prop
  // onToggleCollapse: () => void; // REMOVED: No longer passed as prop
}

const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { profile } = useProfile();
  const { isCollapsed, onToggleCollapse } = useSidebar();

  const handleLogout = async () => {
    const { data: { session } = { session: null } } = await supabase.auth.getSession();
    if (!session) {
      showSuccess("You are already logged out.");
      navigate("/auth");
      return;
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      showError("Failed to log out: " + error.message);
    } else {
      showSuccess("Logged out successfully!");
      navigate("/auth");
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogoClick = () => {
    navigate("/");
  };

  const baseButtonClass = "justify-start text-base font-medium transition-colors w-full";
  const activeLinkClass = "text-sidebar-active-foreground bg-sidebar-active-background rounded-md"; 
  const inactiveLinkClass = "text-sidebar-foreground rounded-md"; 

  const renderFortressLogo = (isCollapsedState: boolean) => (
    <div className={cn("flex items-center space-x-2 cursor-pointer", isCollapsedState ? "justify-center" : "justify-start")} onClick={handleLogoClick}>
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
      {!isCollapsed && <span className="text-xl font-semibold text-sidebar-foreground">Fortress</span>}
    </div>
  );

  const renderNavItems = (items: NavItem[], isSubItem = false) => (
    <div className={cn("space-y-1", isSubItem && "ml-4 border-l border-sidebar-border pl-2")}>
      {items.map((item: NavItem) => {
        const currentIsActive = item.href === "/" 
          ? location.pathname === "/" 
          : location.pathname.startsWith(item.href);

        if (item.adminOnly && profile?.role !== 'admin') {
          return null;
        }

        if (item.isParent && item.children && isCollapsed) {
          return (
            <TooltipProvider key={item.title}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      baseButtonClass,
                      currentIsActive ? activeLinkClass : inactiveLinkClass,
                      "justify-center px-0 rounded-md"
                    )}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <item.icon className="h-5 w-5 text-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  {item.title} {item.tag && <Badge variant="secondary" className="ml-1">{item.tag}</Badge>} {/* NEW: Display tag in tooltip */}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        if (item.isParent && item.children) {
          return (
            <Accordion type="single" collapsible key={item.title} className="w-full">
              <AccordionItem value={item.title} className="border-none">
                <AccordionTrigger className={cn(
                  baseButtonClass,
                  "py-2 px-3 flex items-center justify-between rounded-md",
                  currentIsActive ? activeLinkClass : inactiveLinkClass,
                  "hover:no-underline",
                  isCollapsed && "justify-center px-0"
                )}>
                  <div className="flex items-center">
                    <item.icon className={cn("h-5 w-5 text-current", !isCollapsed && "mr-3")} />
                    {!isCollapsed && <span className="truncate text-current">{item.title}</span>}
                    {item.tag && !isCollapsed && <Badge variant="secondary" className="ml-auto">{item.tag}</Badge>} {/* NEW: Display tag */}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-1">
                  {renderNavItems(item.children, true)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        return (
          <TooltipProvider key={item.title}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    baseButtonClass,
                    currentIsActive ? activeLinkClass : inactiveLinkClass,
                    isCollapsed && "justify-center px-0 rounded-md"
                  )}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      handleNavigation(item.href);
                    }
                  }}
                >
                  <item.icon className={cn("h-5 w-5 text-current", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span className="truncate text-current">{item.title}</span>}
                  {item.title === "Notifications" && unreadCount > 0 && !isCollapsed && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                  {item.tag && !isCollapsed && <Badge variant="secondary" className="ml-auto">{item.tag}</Badge>} {/* NEW: Display tag */}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="ml-2">
                  {item.title} {item.tag && <Badge variant="secondary" className="ml-1">{item.tag}</Badge>} {/* NEW: Display tag in tooltip */}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );

  return (
    <div
      className={cn(
        "fixed top-0 left-0 h-screen flex flex-col bg-sidebar-background text-sidebar-foreground transition-all duration-200 z-30 border-r border-sidebar-border",
        isCollapsed ? "w-[80px]" : "w-[280px]",
        "shadow-theme-glow"
      )}
      data-tutorial-target="sidebar-navigation"
    >
      <div className={cn("flex items-center h-[60px] px-4 flex-shrink-0", isCollapsed ? "justify-center" : "justify-between")}>
        {renderFortressLogo(isCollapsed)}
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-9 w-9 rounded-full bg-sidebar-toggle-background text-sidebar-foreground hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {isCollapsed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="absolute top-4 -right-5 h-10 w-10 rounded-full bg-sidebar-toggle-background text-sidebar-foreground hover:bg-white/20 shadow-md border border-sidebar-border"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              Expand Sidebar
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {!isCollapsed && profile && (
        <div className="flex items-center p-4 border-b border-sidebar-border flex-shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
            <AvatarFallback>{profile.fullName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
          </div>
        </div>
      )}
      {isCollapsed && profile && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center p-3 border-b border-sidebar-border flex-shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                  <AvatarFallback>{profile.fullName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              {profile.fullName} ({profile.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())})
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <ScrollArea className="flex-grow py-4 px-3">
        <nav className="flex flex-col space-y-4">
          {renderNavItems(mainNavItems)}

          <div className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground uppercase", isCollapsed && "text-center")}>
            {!isCollapsed && "User & Account"}
          </div>
          {renderNavItems(userAndSettingsNavItems)}

          <div className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground uppercase", isCollapsed && "text-center")}>
            {!isCollapsed && "Support & Resources"}
          </div>
          {renderNavItems(supportAndResourcesNavItems)}
        </nav>
      </ScrollArea>

      <div className="mt-auto p-3 border-t border-sidebar-border flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(baseButtonClass, "text-destructive focus:bg-destructive/10 rounded-md", isCollapsed && "justify-center px-0")}
                onClick={handleLogout}
              >
                <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && "Logout"}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="ml-2">
                Logout
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default Sidebar;