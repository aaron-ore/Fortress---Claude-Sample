import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="text-center text-xs text-muted-foreground py-4">
      &copy; {new Date().getFullYear()} Fortress Inventory. All rights reserved.
    </footer>
  );
};

export default Footer;
