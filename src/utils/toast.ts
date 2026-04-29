import { toast } from "sonner";
import { escapeHtml } from "./htmlSanitizer"; // Import the new escapeHtml utility

let consecutiveErrorCount = 0;
const ERROR_THRESHOLD = 10; // Number of consecutive errors before showing a summary
let summaryErrorToastId: string | number | null = null; // ID of the persistent summary error toast
const activeToastIds: Set<string | number> = new Set(); // Track all active toast IDs

/**
 * Truncates a message to a specified word limit.
 * @param message The message string to truncate.
 * @param wordLimit The maximum number of words to keep (default: 10).
 * @returns The truncated message.
 */
const truncateMessage = (message: string, wordLimit: number = 10): string => {
  const words = message.split(' ');
  if (words.length > wordLimit) {
    return words.slice(0, wordLimit).join(' ') + '...';
  }
  return message;
};

/**
 * Displays a toast notification of a specified type.
 * This function dismisses all currently active toasts before showing a new one.
 * @param type The type of the toast ('success', 'error', 'info', 'warning').
 * @param message The message to display in the toast.
 * @param options Optional configuration for the toast (e.g., duration, closeButton).
 * @returns The ID of the displayed toast.
 */
const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string, options?: any): string | number => {
  // Dismiss all currently active toasts before showing a new one
  activeToastIds.forEach(id => toast.dismiss(id));
  activeToastIds.clear();

  // HTML-escape the message before displaying it
  const safeMessage = escapeHtml(message);
  const truncatedMessage = truncateMessage(safeMessage);

  const id = toast[type](truncatedMessage, {
    ...options,
    onDismiss: (dismissedId: string | number) => {
      activeToastIds.delete(dismissedId);
      if (dismissedId === summaryErrorToastId) {
        summaryErrorToastId = null;
        consecutiveErrorCount = 0; // Reset error count when summary is dismissed
      }
      options?.onDismiss?.(dismissedId);
    },
    onAutoClose: (closedId: string | number) => {
      activeToastIds.delete(closedId);
      if (closedId === summaryErrorToastId) {
        summaryErrorToastId = null;
        consecutiveErrorCount = 0; // Reset error count when summary auto-closes
      }
      options?.onAutoClose?.(closedId);
    }
  });
  activeToastIds.add(id);
  return id;
};

/**
 * Displays a success toast notification.
 * If a summary error toast is active, it will be dismissed.
 * @param message The success message to display.
 */
export const showSuccess = (message: string): void => {
  // If a summary error toast is active, dismiss it when a success occurs
  if (summaryErrorToastId !== null) {
    toast.dismiss(summaryErrorToastId);
    summaryErrorToastId = null;
    consecutiveErrorCount = 0; // Reset error count on success
  }
  consecutiveErrorCount = 0; // Reset error count on success
  showToast('success', message);
};

/**
 * Displays an error toast notification.
 * If a summary error toast is already active, new individual errors are suppressed.
 * If the number of consecutive errors reaches a threshold, a persistent summary error toast is shown.
 * @param message The error message to display.
 */
export const showError = (message: string): void => {
  // If a summary error toast is already active, don't show new individual errors
  if (summaryErrorToastId !== null) {
    console.warn("Additional error occurred while summary toast is active. Message:", message);
    return; // Suppress individual error toasts
  }

  consecutiveErrorCount++;

  if (consecutiveErrorCount >= ERROR_THRESHOLD) {
    // Dismiss all currently active toasts before showing the summary
    activeToastIds.forEach(id => toast.dismiss(id));
    activeToastIds.clear();

    const summaryMessage = "Multiple errors. Contact support if issue persists.";
    summaryErrorToastId = showToast('error', summaryMessage, {
      duration: Infinity, // Make summary error toast persistent until dismissed manually
      closeButton: true,
    });
    consecutiveErrorCount = 0; // Reset count after showing summary
  } else {
    // Show individual error toast
    showToast('error', message);
  }
};

/**
 * Displays an informational toast notification.
 * If a summary error toast is active, it will be dismissed.
 * @param message The informational message to display.
 */
export const showInfo = (message: string): void => {
  if (summaryErrorToastId !== null) {
    toast.dismiss(summaryErrorToastId);
    summaryErrorToastId = null;
    consecutiveErrorCount = 0;
  }
  consecutiveErrorCount = 0;
  showToast('info', message);
};

/**
 * Displays a warning toast notification.
 * If a summary error toast is active, it will be dismissed.
 * @param message The warning message to display.
 */
export const showWarning = (message: string): void => {
  if (summaryErrorToastId !== null) {
    toast.dismiss(summaryErrorToastId);
    summaryErrorToastId = null;
    consecutiveErrorCount = 0;
  }
  consecutiveErrorCount = 0;
  showToast('warning', message);
};

/**
 * Dismisses a specific toast notification by its ID.
 * @param toastId The ID of the toast to dismiss.
 */
export const dismissToast = (toastId: string | number): void => {
  toast.dismiss(toastId);
};