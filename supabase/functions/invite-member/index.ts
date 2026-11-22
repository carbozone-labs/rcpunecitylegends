import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://rcpunecitylegends.org", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: cors });
Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "https://rcpunecitylegends.org";
  const origin = req.headers.get("Origin");
  if (origin && origin !== allowedOrigin) return json(403, { error: "Origin not allowed" });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });
  const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(500, { error: "Invitation service is not configured" });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = auth.slice(7); const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json(401, { error: "Invalid session" });
  let payload: { action?: string; email?: string; membership_id?: string; full_name?: string; role?: "member" | "board_member" };
  try { payload = await req.json(); } catch { return json(400, { error: "Invalid JSON body" }); }
  // An invited person with an existing Auth account claims only their own matching invitation.
  if (payload.action === "accept") {
    const email = user.email?.trim().toLowerCase();
    if (!email || !user.email_confirmed_at) return json(403, { error: "A verified account email is required" });
    const { data: invite, error: findError } = await admin.from("member_invitations").select("id,membership_id,full_name,role").eq("email", email).eq("invitation_status", "pending").gt("expires_at", new Date().toISOString()).maybeSingle();
    if (findError || !invite) return json(404, { error: "No valid invitation was found for this account" });
    // Phase 1's auth.users trigger may already have provisioned this exact invitation.
    // Accept idempotently, but never attach a different email or membership identity.
    const { data: existingMember, error: existingMemberError } = await admin.from("members").select("id,email,membership_id").eq("id", user.id).maybeSingle();
    if (existingMemberError) return json(500, { error: "Member profile could not be verified" });
    if (existingMember && (existingMember.email?.toLowerCase() !== email || existingMember.membership_id !== invite.membership_id)) return json(409, { error: "This account is already linked to a different membership" });
    if (!existingMember) {
      const { error: memberError } = await admin.from("members").insert({ id: user.id, membership_id: invite.membership_id, full_name: String(invite.full_name ?? user.user_metadata?.full_name ?? email.split("@")[0]).slice(0,120), email, joining_date: new Date().toISOString().slice(0,10), membership_status: "active" });
      if (memberError) return json(409, { error: "This account could not be linked. Contact the club administrator." });
    }
    const invitedRole = invite.role === "board_member" ? "board_member" : "member";
    const { error: roleInsertError } = await admin.from("member_roles").upsert({ user_id: user.id, role: invitedRole }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (roleInsertError) return json(500, { error: "Member access could not be provisioned" });
    const oppositeRole = invitedRole === "board_member" ? "member" : "board_member";
    const { error: roleCleanupError } = await admin.from("member_roles").delete().eq("user_id", user.id).eq("role", oppositeRole);
    if (roleCleanupError) return json(500, { error: "Membership role could not be finalized" });
    await admin.from("member_invitations").update({ invitation_status: "accepted" }).eq("id", invite.id);
    return json(200, { success: true, message: "Invitation accepted" });
  }
  // Admin invitations are restricted to the trusted, private office-bearer allowlist.
  // Legacy admin/super_admin role rows are intentionally not sufficient.
  const { data: callerProfile, error: profileError } = await admin.from("members").select("membership_status").eq("id", user.id).maybeSingle();
  const { data: officeBearer, error: officeBearerError } = await admin.from("club_office_bearers").select("user_id,position").eq("user_id", user.id).eq("active", true).in("position", ["President", "Vice President", "Secretary"]).maybeSingle();
  const { data: adminRole, error: roleError } = await admin.from("member_roles").select("user_id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (profileError || officeBearerError || roleError || !callerProfile || callerProfile.membership_status !== "active" || !officeBearer || !adminRole) return json(403, { error: "Insufficient privileges" });
  const email = payload.email?.trim().toLowerCase(); const fullName = payload.full_name?.trim();
  const role = payload.role === "board_member" ? "board_member" : payload.role === "member" || payload.role === undefined ? "member" : null;
  if (!role) return json(400, { error: "Invalid member role" });
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "A valid email is required" });
  if (!fullName || fullName.length < 2 || fullName.length > 120) return json(400, { error: "A valid full name is required" });
  await admin.from("member_invitations").update({ invitation_status: "expired" }).eq("invitation_status", "pending").lte("expires_at", new Date().toISOString());
  const { data: existingMember } = await admin.from("members").select("id").eq("email", email).maybeSingle();
  if (existingMember) return json(409, { error: "This email already belongs to a member profile" });
  const { data: existing } = await admin.from("member_invitations").select("id").eq("email", email).eq("invitation_status", "pending").maybeSingle();
  if (existing) return json(409, { error: "A pending invitation already exists for this email" });

  let membershipId = payload.membership_id?.trim() ?? "";
  if (role === "board_member") {
    // BOD identifiers are always allocated by the database sequence; the
    // browser cannot choose or race another member's identifier.
    const { data: generatedId, error: generationError } = await admin.rpc("next_bod_member_id");
    if (generationError || typeof generatedId !== "string") return json(500, { error: "A BOD Member ID could not be generated" });
    membershipId = generatedId;
  } else {
    if (!membershipId || membershipId.length > 40 || !/^[A-Za-z0-9-]+$/.test(membershipId) || membershipId.startsWith("RCPL-BOD-2026-")) {
      return json(400, { error: "A valid general-member ID is required" });
    }
    const { data: usedMembershipId } = await admin.from("members").select("id").eq("membership_id", membershipId).maybeSingle();
    if (usedMembershipId) return json(409, { error: "This membership ID is already assigned" });
  }
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  // Detect an existing Auth identity so the admin can issue a claimable invitation instead of failing on duplicate email.
  let existingAuthUser = false;
  for (let page = 1; page <= 10; page++) {
    const { data: users, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) return json(500, { error: "Could not verify whether this email already has an account" });
    if (users.users.some((candidate) => candidate.email?.toLowerCase() === email)) { existingAuthUser = true; break; }
    if (users.users.length < 1000) break;
  }
  const { data: invitation, error: insertError } = await admin.from("member_invitations").insert({ email, full_name: fullName, membership_id: membershipId, role, invited_by: user.id, expires_at: expiresAt }).select("id").single();
  if (insertError || !invitation) return json(400, { error: "Invitation could not be recorded" });
  if (existingAuthUser) return json(200, { success: true, email, membership_id: membershipId, expires_at: expiresAt, requires_existing_account_claim: true, message: "Invitation recorded. The existing account holder must sign in and accept it from the Members Hub." });
  // The auth.users trigger validates this pending row as inviteUserByEmail creates the invited identity.
  const redirectTo = Deno.env.get("INVITE_REDIRECT_URL") ?? "https://rcpunecitylegends.org/members/login/";
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo });
  if (inviteError || !invited.user) { await admin.from("member_invitations").delete().eq("id", invitation.id); return json(400, { error: inviteError?.message ?? "Invitation could not be created" }); }
  return json(200, { success: true, email, membership_id: membershipId, expires_at: expiresAt, message: "Invitation sent" });
});
