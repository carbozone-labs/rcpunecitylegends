"use client";

import { withBasePath } from "@/lib/utils";

/** Minimal Supabase Auth/PostgREST browser adapter. Uses only the public anon key; all authorization is RLS-backed. */
export type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
export type AuthSession = { access_token: string; refresh_token: string; expires_at?: number; user: AuthUser };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const configured = () => Boolean(url && key && !url.includes("YOUR-PROJECT-REF") && !key.includes("your-anon"));
function createAuthClient(storageKey: string) {
  let session: AuthSession | null = null;
  let refreshPromise: Promise<AuthSession | null> | null = null;
  const listeners = new Set<(value: AuthSession | null) => void>();
  const emit = () => listeners.forEach((fn) => fn(session));
  const persist = () => {
    if (typeof window === "undefined") return;
    try {
      if (session) localStorage.setItem(storageKey, JSON.stringify(session));
      else localStorage.removeItem(storageKey);
    } catch { /* storage can be unavailable */ }
  };
  const load = () => {
    if (typeof window === "undefined" || session) return session;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) session = JSON.parse(raw) as AuthSession;
    } catch { session = null; }
    return session;
  };
  const request = async (path: string, init: RequestInit = {}, token?: string) => {
    if (!configured()) throw new Error("Members Hub is not configured yet. Contact the club administrator.");
    let response = await fetch(`${url}${path}`, { ...init, headers: { apikey: key, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
    if (response.status === 401 && token && session?.access_token === token && !path.includes("grant_type=refresh_token")) {
      const refreshed = await client.refresh();
      if (refreshed?.access_token) response = await fetch(`${url}${path}`, { ...init, headers: { apikey: key, "Content-Type": "application/json", Authorization: `Bearer ${refreshed.access_token}`, ...init.headers } });
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.msg === "string" ? body.msg : typeof body.message === "string" ? body.message : typeof body.error_description === "string" ? body.error_description : "The request could not be completed.");
    return body;
  };
  const client = {
    isConfigured: configured,
    async data<T = unknown>(path: string, init: RequestInit = {}) { const current = load(); if (!current) throw new Error("Please sign in again."); return await request(path, init, current.access_token) as T; },
    async upload(bucket: string, path: string, file: File) { const current = load(); if (!current) throw new Error("Please sign in again."); return await request(`/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/").replaceAll("%2F","/")}`, { method: "POST", headers: { "Content-Type": file.type, "x-upsert": "false" }, body: file }, current.access_token); },
    getSession: () => load(),
    subscribe(fn: (value: AuthSession | null) => void) { listeners.add(fn); return () => listeners.delete(fn); },
    async restore() {
      if (typeof window !== "undefined" && window.location.hash.includes("access_token=")) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const access = params.get("access_token"); const refresh = params.get("refresh_token");
        if (access && refresh) {
          try { const user = await request("/auth/v1/user", {}, access); session = { access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now()/1000) + Number(params.get("expires_in") ?? 3600), user }; persist(); window.history.replaceState({}, document.title, window.location.pathname + window.location.search); }
          catch { session = null; persist(); }
        }
      }
      const current = load(); if (current?.expires_at && current.expires_at < Math.floor(Date.now() / 1000) + 30) return this.refresh(); emit(); return current;
    },
    async signIn(email: string, password: string) { const data = await request("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }); session = { ...data, expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600) }; persist(); emit(); return session; },
    async refresh() { const current = load(); if (!current?.refresh_token) { session = null; persist(); emit(); return null; } if (refreshPromise) return refreshPromise; refreshPromise = (async () => { try { const data = await request("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: current.refresh_token }) }); session = { ...data, expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600) }; persist(); emit(); return session; } catch { session = null; persist(); emit(); return null; } finally { refreshPromise = null; } })(); return refreshPromise; },
    async signOut() { const current = load(); if (current?.access_token && configured()) await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${current.access_token}` } }).catch(() => undefined); session = null; persist(); emit(); },
    async resetPassword(email: string, redirectPath = "/members/dashboard/settings/") { await request(`/auth/v1/recover?redirect_to=${encodeURIComponent(`${window.location.origin}${withBasePath(redirectPath)}`)}`, { method: "POST", body: JSON.stringify({ email }) }); },
    async updatePassword(password: string) { const current = load(); if (!current) throw new Error("Your session has expired. Please sign in again."); await request("/auth/v1/user", { method: "PUT", body: JSON.stringify({ password }) }, current.access_token); },
    async getUser() { const current = load(); if (!current) return null; try { return await request("/auth/v1/user", {}, current.access_token) as AuthUser; } catch { await this.signOut(); return null; } },
    async selectMember() { const current = load(); if (!current) throw new Error("Please sign in again."); const rows = await request("/rest/v1/members?select=id,membership_id,first_name,last_name,full_name,email,phone,profile_photo_url,designation,committee,joining_date,membership_status,bio,skills,interests,created_at,updated_at&limit=1", {}, current.access_token); return (rows as MemberProfile[])[0] ?? null; },
    async selectRoles() { const current = load(); if (!current) return []; return await request("/rest/v1/member_roles?select=role", {}, current.access_token) as { role: MemberRole }[]; },
    async isOfficeBearerAdmin() { const current = load(); if (!current) return false; return await request("/rest/v1/rpc/is_office_bearer_admin", { method: "POST", body: "{}" }, current.access_token) as boolean; },
    async acceptInvitation() { const current = load(); if (!current) throw new Error("Please sign in again."); await request("/functions/v1/invite-member", { method: "POST", body: JSON.stringify({ action: "accept" }) }, current.access_token); },
    async updateMember(values: Pick<MemberProfile, "phone" | "bio" | "skills" | "interests">) { const current = load(); if (!current) throw new Error("Please sign in again."); await request("/rest/v1/members?id=eq." + encodeURIComponent(current.user.id), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(values) }, current.access_token); },
  };
  return client;
}

export type BrowserAuthClient = ReturnType<typeof createAuthClient>;
export const authClient = createAuthClient("legends-members-auth");
export const adminAuthClient = createAuthClient("legends-admin-auth");
export type MemberRole = "member" | "board_member" | "admin";
export type MemberProfile = { id: string; membership_id: string; first_name: string | null; last_name: string | null; full_name: string; email: string; phone: string | null; profile_photo_url: string | null; designation: string | null; committee: string | null; joining_date: string | null; membership_status: "active" | "suspended" | "inactive"; bio: string | null; skills: string[]; interests: string[]; created_at: string; updated_at: string };
