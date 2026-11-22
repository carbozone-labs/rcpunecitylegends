/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row payloads are currently generated dynamically; replace with Database types in a follow-up. */
import { adminAuthClient } from "@/lib/supabase/browser";

const rpc = <T,>(name: string, args: Record<string, unknown> = {}) =>
  adminAuthClient.data<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

export type AdminMember = {
  id: string; membership_id: string; full_name: string; email: string;
  designation: string | null; committee: string | null; membership_status: string;
  joining_date: string | null; roles: string[];
};
export type AdminOverview = {
  members: { total: number; active: number; inactive: number; suspended: number; board: number };
  events: { upcoming: number; registrations: number };
  attendance: { present: number; late: number; absent: number };
  tasks: { pending: number; completed: number };
  contributions: { pending: number; approved: number };
  monthly_members: { month: string; count: number }[];
  monthly_events: { month: string; registrations: number }[];
  monthly_tasks: { month: string; approved: number }[];
  monthly_attendance: { month: string; marked: number }[];
  monthly_contributions: { month: string; approved: number }[];
  committee_participation: { committee: string; attendance_records: number }[];
  achievement_distribution: { achievement: string; unlocked: number }[];
  gamification: { xp_enabled: boolean; achievements_enabled: boolean; leaderboard_enabled: boolean };
};
export const adminApi = {
  permissions: () => adminAuthClient.data<{ permission: string }[]>("/rest/v1/member_permissions?select=permission"),
  overview: () => rpc<AdminOverview>("get_admin_overview"),
  members: (search_text = "", status_filter = "all", designation_filter = "all", committee_filter = "all", page_size = 50, page_offset = 0) => rpc<AdminMember[]>("get_admin_members", { search_text, status_filter, designation_filter, committee_filter, page_size, page_offset }),
  updateMember: (target_member: string, new_full_name: string, new_designation: string, new_committee: string, new_status: string, change_reason: string) => rpc<void>("admin_update_member", { target_member, new_full_name, new_designation, new_committee, new_status, change_reason }),
  setRole: (target_user_id: string, target_role: string, should_grant: boolean, change_reason: string) => rpc<void>("admin_set_member_role", { target_user_id, target_role, should_grant, change_reason }),
  grantPermission: (target_user: string, permission_name: string, should_grant: boolean, change_reason: string) => rpc<void>("grant_board_permission", { target_user, permission_name, should_grant, change_reason }),
  contributions: () => rpc<any[]>("get_admin_contributions"),
  pendingAchievements: () => rpc<any[]>("get_admin_achievements"),
  reviewAchievement: (target_member:string,target_achievement:string,decision:string,review_reason:string) => rpc<void>("review_achievement",{target_member,target_achievement,decision,review_reason}),
  reviewContribution: (target_contribution: string, decision: string, review_reason: string) => rpc<void>("review_contribution", { target_contribution, decision, review_reason }),
  awardXp: (target_contribution: string, award_reason: string) => rpc<string>("award_contribution_xp", { target_contribution, award_reason }),
  reverseXp: (target_ledger: string, reversal_reason: string) => rpc<string>("reverse_xp_award", { target_ledger, reversal_reason }),
  audit: (page_size = 100, page_offset = 0) => rpc<any[]>("get_admin_audit", { page_size, page_offset }),
  memberActivity: (target_member:string,page_size=50) => rpc<any[]>("get_member_activity",{target_member,page_size}),
  rules: () => adminAuthClient.data<any[]>("/rest/v1/contribution_rules?select=*&order=created_at.asc"),
  configureRule: (target_rule: string, new_xp: number, is_enabled: boolean) => rpc<void>("configure_contribution_rule", { target_rule, new_xp, is_enabled }),
  levels: () => adminAuthClient.data<any[]>("/rest/v1/club_level_rules?select=*&order=sort_order.asc"),
  configureLevel: (target_rule: string, new_title: string, new_min_xp: number, is_enabled: boolean) => rpc<void>("configure_level_rule", { target_rule, new_title, new_min_xp, is_enabled }),
  achievements: () => adminAuthClient.data<any[]>("/rest/v1/achievement_definitions?select=*&order=created_at.asc"),
  configureAchievement: (target_achievement:string,new_title:string,new_description:string,new_criteria:Record<string,unknown>,new_enabled:boolean,new_manual_review:boolean,new_icon_key:string) => rpc<void>("configure_achievement",{target_achievement,new_title,new_description,new_criteria,new_enabled,new_manual_review,new_icon_key}),
  boardHistory: (memberId:string) => adminAuthClient.data<any[]>(`/rest/v1/member_board_term_history?select=id,designation,committee,valid_from,valid_to,change_reason&member_id=eq.${encodeURIComponent(memberId)}&order=valid_from.desc`),
  gamificationSettings: () => adminAuthClient.data<any[]>("/rest/v1/club_gamification_settings?select=*&singleton=eq.true"),
  configureGamification: (enable_xp: boolean, enable_achievements: boolean, enable_leaderboard: boolean) => rpc<void>("configure_gamification", { enable_xp, enable_achievements, enable_leaderboard }),
  memberPermissions: (userId: string) => adminAuthClient.data<any[]>(`/rest/v1/member_permissions?select=permission&user_id=eq.${encodeURIComponent(userId)}`),
};
