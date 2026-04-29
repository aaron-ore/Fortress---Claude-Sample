import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// Conditionally disable console.log in production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {}; // You might want to keep console.error for critical issues
}

console.log("Dyad Test Log: main.tsx is running!"); // This log will only appear in development

createRoot(document.getElementById("root")!).render(<App />);