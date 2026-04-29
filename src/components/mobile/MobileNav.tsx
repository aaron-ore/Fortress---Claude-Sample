import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
} from "lucide-react";
import MobileDrawerContent from "@/components/MobileDrawerContent";
import { useNavigate } from "react-router-dom"; // Added: Missing useNavigate import

const MobileNav: React.FC = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    setIsSheetOpen(false);
    navigate("/");
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] flex flex-col">
        <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <SheetTitle className="flex items-center space-x-2 cursor-pointer" onClick={handleLogoClick}>
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
            <span className="text-xl font-semibold text-sidebar-foreground">Fortress</span>
          </SheetTitle>
        </SheetHeader>

        <MobileDrawerContent onLinkClick={() => setIsSheetOpen(false)} />
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;