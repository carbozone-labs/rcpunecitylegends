import type { Metadata } from "next";
import { OperationsView } from "@/components/members-hub/OperationsView";
export const metadata: Metadata = { title: "Announcements | Members Hub", robots: { index: false, follow: false } };
export default function Page() { return <OperationsView module="announcements" />; }
