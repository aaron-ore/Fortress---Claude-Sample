// src/types.d.ts
declare module 'qrcode' {
  function toString(text: string, options: any, cb: (err: Error | null, result: string) => void): void;
  function toDataURL(text: string, options: any, cb: (err: Error | null, url: string) => void): void;
  // Add other methods if needed
}

// NEW: Declare Tawk_API on the Window interface
interface Window {
  Tawk_API: {
    maximize: () => void;
    minimize: () => void;
    toggle: () => void;
    popup: () => void;
    hideWidget: () => void;
    showWidget: () => void;
    toggleVisibility: () => void;
    onLoaded: () => void;
    onStatusChange: (status: any) => void;
    onBeforeLoad: () => void;
    onChatStarted: () => void;
    onChatEnded: () => void;
    onPrechatSubmit: () => void;
    onOfflineSubmit: () => void;
    onChatMessage: () => void;
    onVisitorNameChanged: () => void;
    onFileUpload: () => void;
    onUnreadMessages: () => void;
    onWindowMinimized: () => void;
    onWindowMaximized: () => void;
    onWidgetLoad: () => void;
    onPageLoaded: () => void;
    isChatMaximized: () => boolean; // Example method
    // Add other Tawk_API methods as needed
  };
  Tawk_LoadStart: Date;
}