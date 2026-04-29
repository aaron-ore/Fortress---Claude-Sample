import React, { useEffect } from "react";

import { PrintContentData } from "@/context/PrintContext";

interface PrintWrapperProps {
  contentData: PrintContentData;
  onPrintComplete: () => void;
  children: React.ReactNode;
}

const PrintWrapper: React.FC<PrintWrapperProps> = ({ contentData, onPrintComplete, children }) => {
  useEffect(() => {
    if (!contentData) {
      onPrintComplete();
      return;
    }

    const printTimeout = setTimeout(() => {
      window.print();
      onPrintComplete();
    }, 0);

    return () => {
      clearTimeout(printTimeout);
    };
  }, [contentData, onPrintComplete]);

  if (!contentData) {
    return null;
  }

  return (
    <div className="print-only-content">
      {children}
    </div>
  );
};

export default PrintWrapper;