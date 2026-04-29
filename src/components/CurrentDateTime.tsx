import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils"; // Import cn utility

interface CurrentDateTimeProps {
  className?: string; // Add className prop
}

const CurrentDateTime: React.FC<CurrentDateTimeProps> = ({ className }) => { // Accept className
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => {
      clearInterval(timer); // Clean up the interval on component unmount
    };
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className={cn("text-sm text-muted-foreground text-right", className)}> {/* Apply className */}
      <div>{formattedDate}</div>
      <div>{formattedTime}</div>
    </div>
  );
};

export default CurrentDateTime;