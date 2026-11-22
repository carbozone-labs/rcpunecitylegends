import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/members-hub/AdminLoginForm";
export const metadata: Metadata = { title: "Administration Login", robots: { index: false, follow: false } };
export default function AdminLoginPage(){return <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12"><div className="pointer-events-none absolute left-1/4 top-10 size-80 rounded-full bg-amber-400/10 blur-3xl"/><div className="pointer-events-none absolute bottom-0 right-1/4 size-80 rounded-full bg-sky-400/10 blur-3xl"/><AdminLoginForm/></div>}
