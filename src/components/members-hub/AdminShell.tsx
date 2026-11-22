"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, Users, ShieldCheck, Award, ScrollText, LogOut, ArrowLeft, CalendarDays, ClipboardCheck, ListTodo, FileText, Bell } from "lucide-react";
import { useMemberAuth } from "./AuthProvider";
import { adminAuthClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
const items = [
 { href: "/board-admin/dashboard/", label: "Overview", icon: LayoutDashboard },
 { href: "/board-admin/members/", label: "Members & Board", icon: Users },
 { href: "/board-admin/contributions/", label: "Contributions & XP", icon: Award },
 { href: "/board-admin/gamification/", label: "Gamification rules", icon: ShieldCheck },
 { href: "/board-admin/operations/events/", label: "Event management", icon: CalendarDays },
 { href: "/board-admin/operations/attendance/", label: "Attendance", icon: ClipboardCheck },
 { href: "/board-admin/operations/tasks/", label: "Task management", icon: ListTodo },
 { href: "/board-admin/operations/documents/", label: "Documents", icon: FileText },
 { href: "/board-admin/operations/announcements/", label: "Announcements", icon: Bell },
 { href: "/board-admin/audit/", label: "Audit history", icon: ScrollText },
];
export function AdminShell({ children }: { children: React.ReactNode }) {
 const { session, profile, isAdmin, loading } = useMemberAuth(); const path = usePathname(); const router = useRouter();
 useEffect(() => { if (!loading && !session) router.replace("/board-admin/login/"); }, [loading, session, router]);
 if (loading || !session) return <div className="grid min-h-screen place-items-center text-sky-200">Verifying administrative access...</div>;
 if (!isAdmin || !profile || profile.membership_status !== "active") return <div className="mx-auto grid min-h-screen max-w-xl place-items-center p-6 text-center"><div className="rounded-3xl border border-rose-300/20 bg-slate-950/80 p-8"><ShieldCheck className="mx-auto text-amber-300" size={40}/><h1 className="mt-4 font-display text-2xl text-white">Access denied</h1><p className="mt-3 text-sm leading-6 text-slate-300">You are not authorized to access the Administration Portal.</p><Link href="/members/dashboard/" className="mt-5 inline-flex rounded-full bg-sky-300 px-5 py-3 font-semibold text-slate-950">Go to Members Portal</Link><button onClick={()=>void adminAuthClient.signOut().then(()=>router.replace("/board-admin/login/"))} className="mt-3 block w-full rounded-full border border-white/15 px-5 py-3 text-sm text-slate-200">Sign out</button></div></div>;
 return <div className="portal-admin mx-auto grid min-h-screen max-w-[1600px] gap-5 px-4 py-8 md:grid-cols-[250px_1fr] md:px-8"><aside className="h-fit rounded-3xl border border-amber-200/20 bg-slate-950/85 p-4 shadow-2xl"><p className="portal-kicker px-3 text-xs font-bold uppercase tracking-[.25em] text-amber-300">Office bearers only</p><h1 className="portal-heading px-3 pt-3 font-display text-2xl text-white">Administration</h1><p className="truncate px-3 pt-2 text-xs text-slate-400">{profile?.full_name || session.user.email}</p><div className="px-3 pt-4"><ThemeToggle /></div><nav className="mt-5 grid gap-1">{items.map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${path===item.href?"bg-sky-300/15 text-sky-100":"text-slate-300 hover:bg-white/5"}`}><Icon size={17}/>{item.label}</Link>;})}</nav><Link href="/members/dashboard/" className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-sm text-slate-300"><ArrowLeft size={16}/> Members Portal</Link><button onClick={()=>void adminAuthClient.signOut().then(()=>router.replace("/board-admin/login/"))} className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-sm text-slate-300"><LogOut size={16}/> Sign out</button></aside><main className="min-w-0">{children}</main></div>;
}

