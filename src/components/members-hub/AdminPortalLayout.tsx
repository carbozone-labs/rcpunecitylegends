"use client";
import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";
export function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "";
  if (path === "/board-admin/login/" || path === "/board-admin/login") return <>{children}</>;
  return <AdminShell>{children}</AdminShell>;
}
