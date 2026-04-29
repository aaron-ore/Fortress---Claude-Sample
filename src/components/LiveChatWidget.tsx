import React, { useEffect } from 'react';

const LiveChatWidget: React.FC = () => {
  useEffect(() => {
    // Check if Tawk.to script is already loaded to prevent duplicates
    if (window.Tawk_API && window.Tawk_API.isChatMaximized && typeof window.Tawk_API.isChatMaximized === 'function') {
      console.log('Tawk.to script already loaded.');
      return;
    }

    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/68d6c1508b3ee61953e1bd5a/1j63e68io';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    
    if (s0 && s0.parentNode) {
      s0.parentNode.insertBefore(s1, s0);
    } else {
      document.head.appendChild(s1); // Fallback if s0 is not found
    }

    // Clean up function to remove the script if the component unmounts
    // This might not fully remove the widget if Tawk.to has already initialized,
    // but it prevents script duplication.
    return () => {
      if (s1.parentNode) {
        s1.parentNode.removeChild(s1);
      }
      // Optionally, you might want to hide the widget if Tawk_API is available
      // if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
      //   window.Tawk_API.hideWidget();
      // }
    };
  }, []);

  return null; // This component doesn't render anything itself
};

export default LiveChatWidget;