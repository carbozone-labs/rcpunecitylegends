"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { adminAuthClient, authClient, type AuthSession, type MemberProfile, type MemberRole } from "@/lib/supabase/browser";
type AuthState = { session: AuthSession | null; profile: MemberProfile | null; roles: MemberRole[]; isAdmin: boolean; loading: boolean; refreshProfile: () => Promise<void> };
const Context = createContext<AuthState>({ session: null, profile: null, roles: [], isAdmin: false, loading: true, refreshProfile: async () => {} });
export function AuthProvider({ children, scope = "member" }: { children: React.ReactNode; scope?: "member" | "admin" }) { const client = scope === "admin" ? adminAuthClient : authClient; const [session, setSession] = useState<AuthSession | null>(null); const [profile, setProfile] = useState<MemberProfile | null>(null); const [roles, setRoles] = useState<MemberRole[]>([]); const [isAdmin, setIsAdmin] = useState(false); const [loading, setLoading] = useState(true);
  const refreshProfile = async () => {
    try {
      const [profileResult, roleResult] = await Promise.all([client.selectMember(), client.selectRoles()]);
      setProfile(profileResult);
      setRoles(roleResult.map((item) => item.role));
      // Administrative eligibility is an independent protected RPC. A transient RPC
      // failure must not discard a successfully loaded member profile or roles.
      const adminResult = await client.isOfficeBearerAdmin().catch(() => false);
      setIsAdmin(adminResult);
    } catch {
      setProfile(null);
      setRoles([]);
      setIsAdmin(false);
    }
  };
  useEffect(() => { let alive = true; const unsub = client.subscribe((s) => { if (alive) { setSession(s); if (!s) { setProfile(null); setRoles([]); setIsAdmin(false); } else { void refreshProfile(); } } }); void client.restore().then(async (s) => { if (!alive) return; setSession(s); if (s) await refreshProfile(); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; unsub(); }; }, [client]);
  const value = useMemo(() => ({ session, profile, roles, isAdmin, loading, refreshProfile }), [session, profile, roles, isAdmin, loading]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export const useMemberAuth = () => useContext(Context);
