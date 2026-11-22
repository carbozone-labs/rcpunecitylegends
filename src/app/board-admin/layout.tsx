import { AuthProvider } from "@/components/members-hub/AuthProvider";
import { AdminPortalLayout } from "@/components/members-hub/AdminPortalLayout";
export const metadata = { title: "Club Administration | Legends", robots: { index: false, follow: false } };
export default function BoardAdminLayout({children}:{children:React.ReactNode}) { return <AuthProvider scope="admin"><AdminPortalLayout>{children}</AdminPortalLayout></AuthProvider>; }
