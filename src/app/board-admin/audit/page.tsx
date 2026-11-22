import { AdminConsole } from "@/components/members-hub/AdminConsole";
export const metadata = { title: "Audit | Club Administration", robots: { index: false, follow: false } };
export default function Page() { return <AdminConsole section="audit" />; }
