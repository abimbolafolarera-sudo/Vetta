import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider, applyTheme, getTheme } from "./lib/auth";
import { applyPalette, cachedPalette } from "./lib/palette";
import "./fonts.css";
import "./styles.css";

applyPalette(cachedPalette());
applyTheme(getTheme());
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => applyTheme(getTheme()));

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider><App /></AuthProvider>
  </React.StrictMode>
);
