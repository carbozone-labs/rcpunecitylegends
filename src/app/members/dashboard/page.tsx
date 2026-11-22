import type { Metadata } from "next";
import { DashboardView } from "@/components/members-hub/DashboardView";
export const metadata:Metadata={title:"Members Hub",robots:{index:false,follow:false}};
export default function MemberDashboardPage(){return <DashboardView/>}
