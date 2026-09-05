import { createContext, useState, useContext, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const themes = {
  light: {
    name: "light",
    primary: "#5E35B1", // Royal Amethyst - Primary Brand / Buttons
    secondary: "#2D1657", // Deep Indigo - Primary Text / Headings
    background: "#FDFCFE", // Pearl White - Background / Canvas
    text: "#2D1657", // Deep Indigo - Primary Text / Headings
    card: "#FDFCFE", // Pearl White - Background / Canvas
    border: "#9E97B2", // Cool Grey-Purple - Input Borders / Secondary Text
    accent: "#E8E2F7", // Lavender Mist - Accent / Soft Shapes
    error: "#F8E7EF", // Soft Rose - Error / Alert (Implied)
  },
  dark: {
    name: "dark",
    primary: "#7E57C2", // Lighter Royal Amethyst for dark mode
    secondary: "#E8E2F7", // Lavender Mist for text in dark mode
    background: "#1A1035", // Dark purple background
    text: "#E8E2F7", // Lavender Mist for text
    card: "#2D1657", // Deep Indigo for cards
    border: "#5E35B1", // Royal Amethyst for borders
    accent: "#5E35B1", // Royal Amethyst as accent
    error: "#F8E7EF", // Soft Rose - Error / Alert
  },
  blue: {
    name: "blue",
    primary: "#1d4ed8", // blue-700
    secondary: "#0ea5e9", // sky-500
    background: "#eff6ff",
    text: "#1e3a8a",
    card: "#dbeafe",
    border: "#93c5fd",
    accent: "#dbeafe",
    error: "#F8E7EF",
  },
  green: {
    name: "green",
    primary: "#059669", // emerald-600
    secondary: "#10b981", // emerald-500
    background: "#ecfdf5",
    text: "#065f46",
    card: "#d1fae5",
    border: "#a7f3d0",
    accent: "#d1fae5",
    error: "#F8E7EF",
  },
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Check localStorage for saved theme
    const saved = localStorage.getItem("milaud-theme");
    return saved && themes[saved] ? themes[saved] : themes.light;
  });

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themes[themeName]);
      localStorage.setItem("milaud-theme", themeName);
      
      // Sync with mobile app (simulated)
      syncThemeWithMobile(themes[themeName]);
    }
  };

  // Function to sync theme with mobile app
  const syncThemeWithMobile = (theme) => {
    // In a real app, this would be an API call to your backend
    // which would then push to mobile apps via Firebase Cloud Messaging or similar
    console.log("Syncing theme with mobile app:", theme);
    
    // Simulate API call
    fetch("https://api.milaor.gov.ph/sync-theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: theme.name,
        colors: theme,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => console.log("Theme sync (simulated):", theme.name));
    
    // Also store in localStorage for mobile app to read (if using same domain)
    localStorage.setItem("milaud-mobile-theme", JSON.stringify(theme));
  };

  // Apply theme to document root for CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-color", currentTheme.primary);
    root.style.setProperty("--secondary-color", currentTheme.secondary);
    root.style.setProperty("--background-color", currentTheme.background);
    root.style.setProperty("--text-color", currentTheme.text);
    root.style.setProperty("--card-color", currentTheme.card);
    root.style.setProperty("--border-color", currentTheme.border);
    root.style.setProperty("--accent-color", currentTheme.accent || "#E8E2F7");
    root.style.setProperty("--error-color", currentTheme.error || "#F8E7EF");
    
    // Add theme class to body for Tailwind dark mode
    if (currentTheme.name === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [currentTheme]);

  // Initialize theme sync on load
  useEffect(() => {
    // Check if there's a mobile theme preference
    const mobileTheme = localStorage.getItem("milaud-mobile-theme");
    if (mobileTheme) {
      try {
        const parsed = JSON.parse(mobileTheme);
        if (parsed.name && parsed.name !== currentTheme.name) {
          console.log("Mobile theme preference detected:", parsed.name);
          // Optional: Ask user if they want to sync from mobile
        }
      } catch (e) {
        console.error("Error parsing mobile theme:", e);
      }
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, themes, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for theme-aware styling
export const useThemeColors = () => {
  const { currentTheme } = useTheme();
  return currentTheme;
};