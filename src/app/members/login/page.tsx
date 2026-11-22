import type { Metadata } from "next";
import { LoginForm } from "@/components/members-hub/LoginForm";
export const metadata: Metadata = { title: "Member Login", robots: { index: false, follow: false } };
export default function MemberLoginPage(){return <div className="relative grid min-h-[78vh] place-items-center overflow-hidden px-4 py-12"><div className="pointer-events-none absolute left-1/4 top-10 size-80 rounded-full bg-sky-400/10 blur-3xl"/><div className="pointer-events-none absolute bottom-0 right-1/4 size-80 rounded-full bg-amber-300/10 blur-3xl"/><LoginForm/></div>}
