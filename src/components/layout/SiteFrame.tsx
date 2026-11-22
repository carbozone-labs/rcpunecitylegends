"use client";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MotionProvider } from "@/components/layout/MotionProvider";
import { MobileDock } from "@/components/layout/MobileDock";
import { PointerFX } from "@/components/layout/PointerFX";

/** Keep authenticated portals visually independent from the public club website chrome. */
export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const portal = pathname === "/members" || pathname.startsWith("/members/") || pathname === "/board-admin" || pathname.startsWith("/board-admin/") || pathname.startsWith("/member-login") || pathname.startsWith("/member-dashboard") || pathname.startsWith("/admin");
  return <MotionProvider>
    {!portal && <Navbar />}
    <main id="main" className={portal ? "min-h-screen bg-[#071426]" : undefined}>{children}</main>
    {!portal && <><Footer /><MobileDock /><PointerFX /></>}
  </MotionProvider>;
}
