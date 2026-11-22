import { AuthProvider } from "@/components/members-hub/AuthProvider";
import { AdminShell } from "@/components/members-hub/AdminShell";
export const metadata = { title: "Club Administration | Legends Members Hub", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <AuthProvider scope="admin"><AdminShell>{children}</AdminShell></AuthProvider>; }
