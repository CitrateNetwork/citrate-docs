"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthSession, DEFAULT_VIEWER, mockApi, VIEWERS } from "@/prototype/fixtures";
import { resolveAuthMode } from "@/lib/auth/auth-mode";

/**
 * Prototype providers. Two auth modes (S2):
 *  - "dev"  (ONLY when NEXT_PUBLIC_AUTH_MODE="mock" in a non-production build): the dev tier-switcher
 *    cycles fixture viewers so every access state is demoable without a live IdP.
 *  - "oidc" (the fail-closed default — unset/"dev"/"oidc"/unknown all resolve here): the real session
 *    comes from citrate-identity via GET /api/auth/session (server-verified JWT → AuthSession +
 *    entitlement). login/logout redirect through /api/auth/{login,logout}. The chokepoint (canRead) is
 *    unchanged — only the SESSION SOURCE.
 *
 * DOC-B-002: the mode is resolved by the SHARED lib/auth/auth-mode.ts resolver, identical to the server,
 * and it fails CLOSED. The fixture tier-switcher activates only for the explicit, non-production "mock"
 * flag — never for the production default — so an unset/"dev"/garbage env can never grant the switcher.
 */

// resolveAuthMode() → "mock" only for NEXT_PUBLIC_AUTH_MODE="mock" in a non-production build; everything
// else (unset/"dev"/"oidc"/"OIDC"/garbage, or "mock" in production) resolves onto the verifying oidc path.
const AUTH_MODE: "dev" | "oidc" = resolveAuthMode() === "mock" ? "dev" : "oidc";
const ANON: AuthSession = { required: AUTH_MODE === "oidc", authenticated: false, kycStatus: "none" };

type ViewerCtx = {
  authMode: "dev" | "oidc";
  session: AuthSession;
  // dev-mode tier switcher
  viewerId: string;
  setViewerId: (id: string) => void;
  viewers: typeof VIEWERS;
  // oidc-mode auth actions
  login: () => void;
  logout: () => void;
  loading: boolean;
};

const ViewerContext = createContext<ViewerCtx | null>(null);

type ThemeCtx = { theme: "dark" | "light"; toggle: () => void };
const ThemeContext = createContext<ThemeCtx | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [viewerId, setViewerIdState] = useState(DEFAULT_VIEWER.id);
  const [oidcSession, setOidcSession] = useState<AuthSession>(ANON);
  const [loading, setLoading] = useState(AUTH_MODE === "oidc");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // The persisted fixture viewer is honored ONLY in the dev switcher mode. In oidc mode the session
    // comes solely from the server (/api/auth/session), so a stashed codex.viewer must never take effect
    // (DOC-B-002: no localStorage-driven tier/role elevation on the real auth path).
    if (AUTH_MODE === "dev") {
      const v = localStorage.getItem("codex.viewer");
      if (v) setViewerIdState(v);
    }
    const t = localStorage.getItem("codex.theme");
    if (t === "light" || t === "dark") setTheme(t);
  }, []);

  // oidc mode: fetch the server-resolved session.
  useEffect(() => {
    if (AUTH_MODE !== "oidc") return;
    let live = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s: AuthSession) => { if (live) setOidcSession(s); })
      .catch(() => { if (live) setOidcSession(ANON); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("codex.theme", theme);
  }, [theme]);

  const setViewerId = (id: string) => {
    setViewerIdState(id);
    localStorage.setItem("codex.viewer", id);
  };

  const session = useMemo<AuthSession>(
    () => (AUTH_MODE === "oidc" ? oidcSession : mockApi.getSession(viewerId)),
    [oidcSession, viewerId]
  );

  const value: ViewerCtx = {
    authMode: AUTH_MODE,
    session,
    viewerId,
    setViewerId,
    viewers: VIEWERS,
    login: () => { window.location.href = "/api/auth/login"; },
    logout: () => { window.location.href = "/api/auth/logout"; },
    loading,
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>
      <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useViewer(): ViewerCtx {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used within <Providers>");
  return ctx;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <Providers>");
  return ctx;
}
