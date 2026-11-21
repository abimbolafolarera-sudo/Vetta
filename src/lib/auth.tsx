import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { currentUser, onChange } from "./api";
import type { Profile } from "./types";
import { applyPalette, currentPalette } from "./palette";

type Ctx = { user: Profile | null; loading: boolean; refresh: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ user: null, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { setUser(await currentUser()); } catch { setUser(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); const off = onChange(() => { refresh(); }); return () => { off(); }; }, [refresh]);
  return <AuthCtx.Provider value={{ user, loading, refresh }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/* Theme: light, dark or follow the device. Saved on this device. */
export type Theme = "system" | "dark" | "light";
export function getTheme(): Theme { try { return (localStorage.getItem("vetta-theme") as Theme) || "light"; } catch { return "light"; } }
export function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  applyPalette(currentPalette());
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", dark ? "#000000" : "#FFFFFF");
}
export function setTheme(t: Theme) { try { localStorage.setItem("vetta-theme", t); } catch {} applyTheme(t); }
