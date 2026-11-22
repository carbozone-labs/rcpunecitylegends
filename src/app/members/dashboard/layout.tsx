import { AuthProvider } from "@/components/members-hub/AuthProvider";
import { MemberShell } from "@/components/members-hub/MemberShell";
export default function MembersDashboardLayout({children}:{children:React.ReactNode}) { return <AuthProvider><MemberShell>{children}</MemberShell></AuthProvider>; }
