import { AdminConsole } from "@/components/members-hub/AdminConsole";
export const metadata = { title: "Contributions | Club Administration", robots: { index: false, follow: false } };
export default function Page() { return <AdminConsole section="contributions" />; }
