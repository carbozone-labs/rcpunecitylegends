"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function RouteRedirect({ to, label }: { to: string; label: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [router, to]);
  return <div className="grid min-h-[70vh] place-items-center px-6 text-center text-slate-300"><p>{label} <a className="ml-1 text-sky-300 underline" href={to}>Continue</a></p></div>;
}
