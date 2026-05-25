import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-admin-session",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabase() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
}

async function validateSession(supabase: ReturnType<typeof createClient>, sessionToken: string): Promise<string | null> {
  if (!sessionToken) return null;
  const { data } = await supabase
    .from("admin_sessions")
    .select("username, expires_at")
    .eq("id", sessionToken)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("admin_sessions").delete().eq("id", sessionToken);
    return null;
  }
  return data.username;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = getSupabase();
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/admin/, "");

    if (req.method === "POST" && path === "/login") {
      return await handleLogin(supabase, await req.json());
    }

    if (req.method === "POST" && path === "/change-password") {
      const sessionToken = req.headers.get("x-admin-session") || "";
      const username = await validateSession(supabase, sessionToken);
      if (!username) return errorResponse("Unauthorized", 401);
      return await handleChangePassword(supabase, username, await req.json());
    }

    const sessionToken = req.headers.get("x-admin-session") || "";
    const username = await validateSession(supabase, sessionToken);
    if (!username) return errorResponse("Unauthorized", 401);

    if (req.method === "GET" && path === "/kpis") return await handleKPIs(supabase);
    if (req.method === "GET" && path === "/users") {
      const query = url.searchParams.get("query") || "";
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const pageSize = parseInt(url.searchParams.get("page_size") || "10", 10);
      return await handleSearchUsers(supabase, query, page, pageSize);
    }
    if (req.method === "POST" && path === "/user/adjust-balance") return await handleAdjustBalance(supabase, username, await req.json());
    if (req.method === "POST" && path === "/user/reset-streak") return await handleResetStreak(supabase, username, await req.json());
    if (req.method === "POST" && path === "/user/ban") return await handleBanUser(supabase, username, await req.json());
    if (req.method === "POST" && path === "/user/grant-qualification") return await handleGrantQualification(supabase, username, await req.json());
    if (req.method === "GET" && path === "/settings") return await handleGetSettings(supabase);
    if (req.method === "POST" && path === "/settings/update") return await handleUpdateSetting(supabase, username, await req.json());
    if (req.method === "GET" && path === "/audit-log") return await handleAuditLog(supabase);
    if (req.method === "GET" && path === "/games") return await handleGetGames(supabase);
    if (req.method === "POST" && path === "/games/update") return await handleUpdateGame(supabase, username, await req.json());
    if (req.method === "GET" && path === "/qualification-rules") return await handleGetQualRules(supabase);
    if (req.method === "POST" && path === "/qualification-rules/update") return await handleUpdateQualRule(supabase, username, await req.json());
    if (req.method === "POST" && path === "/qualification-rules/create") return await handleCreateQualRule(supabase, username, await req.json());
    if (req.method === "GET" && path === "/weekend-events") return await handleGetWeekendEvents(supabase);
    if (req.method === "POST" && path === "/weekend-events/finalize") return await handleFinalizeEvent(supabase, username, await req.json());
    if (req.method === "GET" && path === "/flyers") return await handleGetFlyers(supabase);
    if (req.method === "POST" && path === "/flyers/update") return await handleUpdateFlyer(supabase, username, await req.json());
    if (req.method === "POST" && path === "/flyers/create") return await handleCreateFlyer(supabase, username, await req.json());
    if (req.method === "GET" && path === "/winners") return await handleGetWinners(supabase);
    if (req.method === "POST" && path === "/winners/create") return await handleCreateWinner(supabase, username, await req.json());
    if (req.method === "GET" && path === "/ecosystem-kpis") return await handleEcosystemKPIs(supabase);

    // ── Skull Gate Scene routes ──────────────────────────────────────────────
    if (req.method === "GET"  && path === "/skull-gate-scenes")             return await handleListScenes(supabase);
    if (req.method === "POST" && path === "/skull-gate-scenes/create")      return await handleCreateScene(supabase, username, await req.json());
    if (req.method === "POST" && path === "/skull-gate-scenes/save-draft")  return await handleSaveDraft(supabase, username, await req.json());
    if (req.method === "POST" && path === "/skull-gate-scenes/publish")     return await handlePublishScene(supabase, username, await req.json());
    if (req.method === "POST" && path === "/skull-gate-scenes/revert")      return await handleRevertDraft(supabase, username, await req.json());
    if (req.method === "POST" && path === "/skull-gate-scenes/duplicate")   return await handleDuplicateScene(supabase, username, await req.json());
    if (req.method === "POST" && path === "/skull-gate-scenes/archive")     return await handleArchiveScene(supabase, username, await req.json());

    // ── Asset Library routes ─────────────────────────────────────────────────
    if (req.method === "GET"  && path === "/skull-gate-assets")             return await handleListAssets(supabase);
    if (req.method === "POST" && path === "/skull-gate-assets/create")      return await handleCreateAsset(supabase, username, await req.json());
    if (req.method === "POST" && path === "/skull-gate-assets/update")      return await handleUpdateAsset(supabase, username, await req.json());
    if (req.method === "POST" && path === "/skull-gate-assets/delete")      return await handleDeleteAsset(supabase, username, await req.json());

    return errorResponse("Not found", 404);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
});

async function handleLogin(supabase: ReturnType<typeof createClient>, body: { username: string; password: string }) {
  const { username, password } = body;
  if (!username || !password) return errorResponse("Missing username or password");

  const { data: cred } = await supabase
    .rpc("verify_admin_password", { p_username: username, p_password: password })
    .maybeSingle();

  if (!cred || !cred.valid) return errorResponse("Invalid credentials", 401);

  const { data: session, error } = await supabase
    .from("admin_sessions")
    .insert({ username })
    .select("id")
    .maybeSingle();

  if (error || !session) return errorResponse("Failed to create session", 500);

  await supabase.from("admin_audit_log").insert({
    admin_actor: username,
    action: "login",
    payload_json: { username },
  });

  return jsonResponse({
    session_token: session.id,
    must_change_password: cred.must_change_password,
    username,
  });
}

async function handleChangePassword(supabase: ReturnType<typeof createClient>, username: string, body: { new_password: string }) {
  const { new_password } = body;
  if (!new_password || new_password.length < 8) return errorResponse("Password must be at least 8 characters");

  const { error } = await supabase.rpc("update_admin_password", {
    p_username: username,
    p_new_password: new_password,
  });

  if (error) return errorResponse(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_actor: username,
    action: "change_password",
    payload_json: { username },
  });

  return jsonResponse({ success: true });
}

async function handleKPIs(supabase: ReturnType<typeof createClient>) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const weekAgo = new Date(Date.now() - 7 * 86400000).toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });

  const [
    { count: totalUsers },
    { count: dau },
    { count: wau },
    { count: newToday },
    { data: streakData },
    { data: potData },
    { data: jackpotRow },
    { data: topupsData },
    { data: stakesData },
    { data: cashoutsData },
    { data: survivalData },
    { data: configRow },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("plays").select("*", { count: "exact", head: true }).gte("play_date", today),
    supabase.from("plays").select("*", { count: "exact", head: true }).gte("play_date", weekAgo),
    supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", today + "T00:00:00"),
    supabase.from("game_state").select("current_streak").gt("current_streak", 0),
    supabase.from("game_state").select("pot_cents").gt("pot_cents", 0),
    supabase.from("jackpot_state").select("jackpot_cents").eq("id", 1).maybeSingle(),
    supabase.from("wallet_ledger").select("amount_cents").eq("type", "TOPUP").gte("created_at", today + "T00:00:00"),
    supabase.from("wallet_ledger").select("amount_cents").eq("type", "STAKE").gte("created_at", today + "T00:00:00"),
    supabase.from("wallet_ledger").select("amount_cents").eq("type", "CASHOUT").gte("created_at", today + "T00:00:00"),
    supabase.from("plays").select("outcome").gte("created_at", today + "T00:00:00"),
    supabase.from("settings").select("value_json").eq("key", "daily_gate_survival_probability").maybeSingle(),
  ]);

  const avgStreak = streakData?.length ? streakData.reduce((s: number, r: { current_streak: number }) => s + r.current_streak, 0) / streakData.length : 0;
  const avgPot = potData?.length ? potData.reduce((s: number, r: { pot_cents: number }) => s + r.pot_cents, 0) / potData.length : 0;
  const totalTopups = topupsData?.reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0) ?? 0;
  const totalStakes = stakesData?.reduce((s: number, r: { amount_cents: number }) => s + Math.abs(r.amount_cents), 0) ?? 0;
  const cashoutCount = cashoutsData?.length ?? 0;
  const cashoutSum = cashoutsData?.reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0) ?? 0;
  const survivals = survivalData?.filter((r: { outcome: string }) => r.outcome === "SURVIVE").length ?? 0;
  const totalPlaysToday = survivalData?.length ?? 0;
  const configuredRate = configRow?.value_json ?? 0.5;

  return jsonResponse({
    dau: dau || 0, wau: wau || 0, new_users_today: newToday || 0, total_users: totalUsers || 0,
    avg_streak: avgStreak, avg_pot: Math.round(avgPot),
    total_topups_today: totalTopups, total_stakes_today: totalStakes,
    cashouts_today_count: cashoutCount, cashouts_today_sum: cashoutSum,
    jackpot_cents: jackpotRow?.jackpot_cents || 0,
    survival_rate_actual: totalPlaysToday > 0 ? survivals / totalPlaysToday : 0,
    survival_rate_configured: typeof configuredRate === "number" ? configuredRate : parseFloat(String(configuredRate)),
  });
}

async function handleEcosystemKPIs(supabase: ReturnType<typeof createClient>) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });

  const [
    { count: satQualified },
    { count: sunQualified },
    { count: satEntries },
    { count: sunEntries },
    { data: gamePlayCounts },
    { data: pointsData },
  ] = await Promise.all([
    supabase.from("weekly_qualification_status").select("*", { count: "exact", head: true }).eq("week_start_date", weekStartStr).eq("saturday_qualified", true),
    supabase.from("weekly_qualification_status").select("*", { count: "exact", head: true }).eq("week_start_date", weekStartStr).eq("sunday_qualified", true),
    supabase.from("weekend_event_entries").select("*", { count: "exact", head: true }).eq("event_game_id", "saturday_main_event").eq("week_start_date", weekStartStr),
    supabase.from("weekend_event_entries").select("*", { count: "exact", head: true }).eq("event_game_id", "sunday_winners_event").eq("week_start_date", weekStartStr),
    supabase.from("daily_game_plays").select("game_id").gte("play_date", weekStartStr),
    supabase.from("weekly_qualification_status").select("total_points").eq("week_start_date", weekStartStr),
  ]);

  const gameCounts: Record<string, number> = {};
  gamePlayCounts?.forEach((r: { game_id: string }) => {
    gameCounts[r.game_id] = (gameCounts[r.game_id] || 0) + 1;
  });

  const avgPoints = pointsData?.length
    ? pointsData.reduce((s: number, r: { total_points: number }) => s + r.total_points, 0) / pointsData.length
    : 0;

  return jsonResponse({
    saturday_qualified: satQualified || 0,
    sunday_qualified: sunQualified || 0,
    saturday_entries: satEntries || 0,
    sunday_entries: sunEntries || 0,
    game_play_counts: gameCounts,
    avg_qualification_points: Math.round(avgPoints),
    week_start: weekStartStr,
  });
}

async function handleSearchUsers(
  supabase: ReturnType<typeof createClient>,
  query: string,
  page = 1,
  pageSize = 10,
) {
  const offset = (page - 1) * pageSize;

  // When searching, fetch matching users sorted by game_state.updated_at via a join approach:
  // 1. Get matching user IDs from users table
  // 2. Join with game_state to sort by most recent activity (updated_at)
  // Sorting field: game_state.updated_at (most recent play/state change)

  let userIds: string[] = [];
  let totalCount = 0;

  if (query) {
    // Search mode — filter first, then paginate
    const isUuid = /^[0-9a-f-]{36}$/i.test(query);
    const { data: matchedUsers, error: searchErr } = await supabase
      .from("users")
      .select("id")
      .or(`guest_id.ilike.%${query}%${isUuid ? `,id.eq.${query}` : ""}`)
      .limit(200);
    if (searchErr) return errorResponse(searchErr.message);
    userIds = (matchedUsers || []).map((u: { id: string }) => u.id);
    totalCount = userIds.length;
    // Sort matched IDs by game_state.updated_at
    if (userIds.length > 0) {
      const { data: sorted } = await supabase
        .from("game_state")
        .select("user_id")
        .in("user_id", userIds)
        .order("updated_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      const sortedIds = (sorted || []).map((r: { user_id: string }) => r.user_id);
      // Include any matched users without a game_state row (new users)
      const unsorted = userIds.filter((id) => !sortedIds.includes(id));
      userIds = [...sortedIds, ...unsorted].slice(0, pageSize);
    }
  } else {
    // Default listing — sort all users by game_state.updated_at DESC
    const { count } = await supabase
      .from("game_state")
      .select("*", { count: "exact", head: true });
    totalCount = count || 0;

    const { data: sorted, error: sortErr } = await supabase
      .from("game_state")
      .select("user_id")
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (sortErr) return errorResponse(sortErr.message);
    userIds = (sorted || []).map((r: { user_id: string }) => r.user_id);
  }

  if (!userIds.length) return jsonResponse({ users: [], total: totalCount, page, page_size: pageSize });

  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, guest_id, status, risk_flags, created_at")
    .in("id", userIds);
  if (usersErr) return errorResponse(usersErr.message);
  if (!users?.length) return jsonResponse({ users: [], total: totalCount, page, page_size: pageSize });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });

  const results = [];
  for (const uid of userIds) {
    const user = users.find((u: { id: string }) => u.id === uid);
    if (!user) continue;
    const [{ data: gs }, { data: wbc }, { data: plays }, { data: qual }] = await Promise.all([
      supabase.from("game_state").select("current_streak, pot_cents, last_play_date, updated_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_balance_cache").select("balance_cents").eq("user_id", user.id).maybeSingle(),
      supabase.from("plays").select("play_date, outcome, stake_cents, streak_after").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("weekly_qualification_status").select("*").eq("user_id", user.id).eq("week_start_date", weekStartStr).maybeSingle(),
    ]);
    results.push({
      ...user,
      current_streak: gs?.current_streak ?? 0,
      pot_cents: gs?.pot_cents ?? 0,
      last_play_date: gs?.last_play_date ?? null,
      last_active_at: gs?.updated_at ?? user.created_at,
      wallet_balance: wbc?.balance_cents ?? 0,
      recent_plays: plays || [],
      qualification: qual || null,
    });
  }

  return jsonResponse({ users: results, total: totalCount, page, page_size: pageSize });
}

async function handleAdjustBalance(supabase: ReturnType<typeof createClient>, actor: string, body: { user_id: string; amount_cents: number; reason: string }) {
  const { user_id, amount_cents, reason } = body;
  if (!user_id || amount_cents === undefined) return errorResponse("Missing user_id or amount_cents");
  const { error: ledgerErr } = await supabase.from("wallet_ledger").insert({ user_id, type: "ADMIN_ADJUST", amount_cents, meta: { reason: reason || "Admin adjustment" } });
  if (ledgerErr) return errorResponse(ledgerErr.message);
  const { data: current } = await supabase.from("wallet_balance_cache").select("balance_cents").eq("user_id", user_id).maybeSingle();
  const newBalance = (current?.balance_cents || 0) + amount_cents;
  await supabase.from("wallet_balance_cache").upsert({ user_id, balance_cents: newBalance, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "adjust_balance", payload_json: { user_id, amount_cents, reason, new_balance: newBalance } });
  return jsonResponse({ success: true, new_balance: newBalance });
}

async function handleResetStreak(supabase: ReturnType<typeof createClient>, actor: string, body: { user_id: string }) {
  const { user_id } = body;
  if (!user_id) return errorResponse("Missing user_id");
  await supabase.from("game_state").update({ current_streak: 0, pot_cents: 0, updated_at: new Date().toISOString() }).eq("user_id", user_id);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "reset_streak", payload_json: { user_id } });
  return jsonResponse({ success: true });
}

async function handleBanUser(supabase: ReturnType<typeof createClient>, actor: string, body: { user_id: string; banned: boolean }) {
  const { user_id, banned } = body;
  if (!user_id) return errorResponse("Missing user_id");
  await supabase.from("users").update({ status: banned ? "banned" : "active" }).eq("id", user_id);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: banned ? "ban_user" : "unban_user", payload_json: { user_id } });
  return jsonResponse({ success: true });
}

async function handleGrantQualification(supabase: ReturnType<typeof createClient>, actor: string, body: { user_id: string; event_game_id?: string; target?: string; grant: boolean }) {
  const { user_id, grant } = body;
  const eventGameId = body.event_game_id || body.target || "";
  if (!user_id || !eventGameId) return errorResponse("Missing user_id or event_game_id");
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const update: Record<string, boolean> = {};
  if (eventGameId === "saturday_main_event" || eventGameId === "saturday") update["saturday_qualified"] = grant;
  if (eventGameId === "sunday_winners_event" || eventGameId === "sunday") update["sunday_qualified"] = grant;
  await supabase.from("weekly_qualification_status").upsert({ user_id, week_start_date: weekStartStr, ...update, updated_at: new Date().toISOString() }, { onConflict: "user_id,week_start_date" });
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "grant_qualification", payload_json: { user_id, event_game_id: eventGameId, grant } });
  return jsonResponse({ success: true });
}

async function handleGetSettings(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from("settings").select("key, value_json").order("key");
  if (error) return errorResponse(error.message);
  return jsonResponse(data || []);
}

async function handleUpdateSetting(supabase: ReturnType<typeof createClient>, actor: string, body: { key: string; value_json: unknown }) {
  const { key, value_json } = body;
  if (!key) return errorResponse("Missing key");
  if (key === "daily_gate_survival_probability") {
    const prob = typeof value_json === "number" ? value_json : parseFloat(String(value_json));
    if (isNaN(prob) || prob < 0 || prob > 0.6) return errorResponse("Survival probability must be between 0.0 and 0.6");
  }
  const { error } = await supabase.from("settings").update({ value_json, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return errorResponse(error.message);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "update_setting", payload_json: { key, value_json } });
  return jsonResponse({ success: true });
}

async function handleAuditLog(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return errorResponse(error.message);
  return jsonResponse(data || []);
}

async function handleGetGames(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from("games").select("*").order("sort_order");
  if (error) return errorResponse(error.message);
  return jsonResponse(data || []);
}

async function handleUpdateGame(supabase: ReturnType<typeof createClient>, actor: string, body: { game_id: string; [key: string]: unknown }) {
  const { game_id, launch_state, category, points_on_play, points_on_win, sort_order, qualification_enabled } = body;
  if (!game_id) return errorResponse("Missing game_id");

  // Use RPC to bypass PostgREST schema cache issues with newer columns like launch_state
  const { data: ok, error } = await supabase.rpc("update_game_fields", {
    p_game_id:               game_id,
    p_launch_state:          launch_state          ?? null,
    p_category:              category              ?? null,
    p_points_on_play:        points_on_play        ?? null,
    p_points_on_win:         points_on_win         ?? null,
    p_sort_order:            sort_order            ?? null,
    p_qualification_enabled: qualification_enabled ?? null,
  });
  if (error) return errorResponse(error.message);
  if (!ok) return errorResponse("Game not found");
  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "update_game",
    payload_json: { game_id, launch_state, category, points_on_play, points_on_win, sort_order, qualification_enabled },
  });
  return jsonResponse({ success: true });
}

async function handleGetQualRules(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from("qualification_rules").select("*").order("priority");
  if (error) return errorResponse(error.message);
  return jsonResponse(data || []);
}

async function handleUpdateQualRule(supabase: ReturnType<typeof createClient>, actor: string, body: { id: string; [key: string]: unknown }) {
  const { id, ...updates } = body;
  if (!id) return errorResponse("Missing id");
  updates.updated_at = new Date().toISOString();
  const { error } = await supabase.from("qualification_rules").update(updates).eq("id", id);
  if (error) return errorResponse(error.message);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "update_qual_rule", payload_json: { id, updates } });
  return jsonResponse({ success: true });
}

async function handleCreateQualRule(supabase: ReturnType<typeof createClient>, actor: string, body: { rule_name: string; target_event: string; rule_type: string; threshold_value: number }) {
  const { rule_name, target_event, rule_type, threshold_value } = body;
  if (!rule_name) return errorResponse("Missing rule_name");
  const { data, error } = await supabase.from("qualification_rules").insert({ rule_name, target_event, rule_type, threshold_value, active: true }).select().maybeSingle();
  if (error) return errorResponse(error.message);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "create_qual_rule", payload_json: body });
  return jsonResponse(data);
}

async function handleGetWeekendEvents(supabase: ReturnType<typeof createClient>) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });

  const [{ data: satEntries }, { data: sunEntries }] = await Promise.all([
    supabase.from("weekend_event_entries").select("id, user_id, event_game_id, week_start_date, entered_at, result_status, reward_cents").eq("event_game_id", "saturday_main_event").eq("week_start_date", weekStartStr).order("entered_at"),
    supabase.from("weekend_event_entries").select("id, user_id, event_game_id, week_start_date, entered_at, result_status, reward_cents").eq("event_game_id", "sunday_winners_event").eq("week_start_date", weekStartStr).order("entered_at"),
  ]);

  const allEntries = [...(satEntries || []), ...(sunEntries || [])];
  const counts: Record<string, number> = {
    saturday_main_event: satEntries?.length || 0,
    sunday_winners_event: sunEntries?.length || 0,
  };

  return jsonResponse({ entries: allEntries, counts, week_start: weekStartStr });
}

async function handleFinalizeEvent(supabase: ReturnType<typeof createClient>, actor: string, body: { event_game_id: string; week_start_date: string; winner_user_id: string; payout_cents: number; display_name: string; result_summary: string }) {
  const { event_game_id, week_start_date, winner_user_id, payout_cents, display_name, result_summary } = body;
  if (!event_game_id || !winner_user_id) return errorResponse("Missing required fields");
  await supabase.from("weekend_event_entries").update({ result_status: "completed" }).eq("event_game_id", event_game_id).eq("week_start_date", week_start_date);
  const { data: winner, error } = await supabase.from("winner_announcements").insert({
    event_game_id, event_date: week_start_date, user_id: winner_user_id,
    display_name: display_name || "Anonymous", result_summary: result_summary || "",
    payout_cents: payout_cents || 0,
    share_text: `${display_name || "A player"} won the ${event_game_id.replace(/_/g, " ")} with a payout of ${(payout_cents / 100).toFixed(2)} EUR!`,
  }).select().maybeSingle();
  if (error) return errorResponse(error.message);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "finalize_event", payload_json: body });
  return jsonResponse({ success: true, winner });
}

async function handleGetFlyers(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from("promotional_assets").select("*").order("sort_order");
  if (error) return errorResponse(error.message);
  return jsonResponse(data || []);
}

async function handleUpdateFlyer(supabase: ReturnType<typeof createClient>, actor: string, body: { id: string; [key: string]: unknown }) {
  const { id, ...updates } = body;
  if (!id) return errorResponse("Missing id");
  delete updates.created_at;
  const { error } = await supabase.from("promotional_assets").update(updates).eq("id", id);
  if (error) return errorResponse(error.message);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "update_flyer", payload_json: { id, updates } });
  return jsonResponse({ success: true });
}

async function handleCreateFlyer(supabase: ReturnType<typeof createClient>, actor: string, body: { asset_type: string; template_key: string; title: string; subtitle?: string; body_json?: unknown }) {
  const { error, data } = await supabase.from("promotional_assets").insert({ ...body, active: true }).select().maybeSingle();
  if (error) return errorResponse(error.message);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "create_flyer", payload_json: body });
  return jsonResponse(data);
}

async function handleGetWinners(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from("winner_announcements").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) return errorResponse(error.message);
  return jsonResponse(data || []);
}

async function handleCreateWinner(supabase: ReturnType<typeof createClient>, actor: string, body: { event_game_id: string; event_date: string; display_name: string; payout_cents: number; result_summary?: string; share_text?: string }) {
  const { error, data } = await supabase.from("winner_announcements").insert(body).select().maybeSingle();
  if (error) return errorResponse(error.message);
  await supabase.from("admin_audit_log").insert({ admin_actor: actor, action: "create_winner", payload_json: body });
  return jsonResponse(data);
}

// ── Skull Gate Scene handlers ─────────────────────────────────────────────────

async function handleListScenes(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("skull_gate_scenes")
    .select("id, slug, title, description, template_type, status, enabled, weight, cooldown_days, min_streak, max_streak, draft_config_json, published_config_json, created_at, updated_at, published_at")
    .order("created_at", { ascending: true });
  if (error) return errorResponse(error.message);
  return jsonResponse(data || []);
}

async function handleCreateScene(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: { slug: string; title: string; template_type?: string; draft_config_json: unknown },
) {
  const { slug, title, draft_config_json } = body;
  if (!slug || !title) return errorResponse("Missing slug or title");
  if (!slug.match(/^[a-z0-9-]+$/)) return errorResponse("Slug must be lowercase letters, numbers, and hyphens only");

  const { data, error } = await supabase
    .from("skull_gate_scenes")
    .insert({
      slug,
      title,
      template_type: body.template_type || "choice_2",
      draft_config_json: draft_config_json || {},
    })
    .select()
    .maybeSingle();
  if (error) return errorResponse(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "create_skull_gate_scene",
    payload_json: { slug, title },
  });
  return jsonResponse(data);
}

async function handleSaveDraft(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: {
    id: string;
    draft_config_json: unknown;
    title?: string;
    description?: string;
    template_type?: string;
    weight?: number;
    cooldown_days?: number;
    min_streak?: number | null;
    max_streak?: number | null;
  },
) {
  const { id, draft_config_json } = body;
  if (!id) return errorResponse("Missing id");
  if (!draft_config_json) return errorResponse("Missing draft_config_json");

  const updates: Record<string, unknown> = { draft_config_json };
  if (body.title       !== undefined) updates.title        = body.title;
  if (body.description !== undefined) updates.description  = body.description;
  if (body.template_type !== undefined) updates.template_type = body.template_type;
  if (body.weight      !== undefined) updates.weight       = body.weight;
  if (body.cooldown_days !== undefined) updates.cooldown_days = body.cooldown_days;
  if (body.min_streak  !== undefined) updates.min_streak   = body.min_streak;
  if (body.max_streak  !== undefined) updates.max_streak   = body.max_streak;

  const { data, error } = await supabase
    .from("skull_gate_scenes")
    .update(updates)
    .eq("id", id)
    .select("id, slug, title, status, updated_at")
    .maybeSingle();
  if (error) return errorResponse(error.message);
  if (!data) return errorResponse("Scene not found", 404);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "save_skull_gate_scene_draft",
    payload_json: { id, slug: data.slug },
  });
  return jsonResponse({ success: true, scene: data });
}

function validateSceneConfig(cfg: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!cfg.title)         errors.push("Scene title is missing");
  if (!cfg.slug)          errors.push("Scene slug is missing");
  if (!cfg.templateType)  errors.push("templateType is missing");
  if (!Array.isArray(cfg.layers)) { errors.push("layers must be an array"); return errors; }

  const layers = cfg.layers as Record<string, unknown>[];
  const choices = layers.filter((l) => l.role === "choice_object" && l.clickable && l.choiceId);

  if (cfg.templateType === "choice_2" && choices.length < 2)
    errors.push("choice_2 scenes require at least 2 clickable choice_object layers with choiceId");
  if (cfg.templateType === "choice_3" && choices.length < 3)
    errors.push("choice_3 scenes require at least 3 clickable choice_object layers with choiceId");

  // Validate door layers
  const doorRoles = ["gate_door_left", "gate_door_right"];
  layers
    .filter((l) => doorRoles.includes(l.role as string))
    .forEach((l) => {
      const da = l.doorAnimation as Record<string, unknown> | undefined;
      if (!da) {
        errors.push(`Door layer "${l.name || l.id}" has no doorAnimation config`);
      } else {
        if (!da.preset)  errors.push(`Door layer "${l.name || l.id}" doorAnimation missing preset`);
        if (!da.trigger) errors.push(`Door layer "${l.name || l.id}" doorAnimation missing trigger`);
      }
    });

  return errors;
}

async function handlePublishScene(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: { id: string },
) {
  const { id } = body;
  if (!id) return errorResponse("Missing id");

  const { data: scene, error: fetchErr } = await supabase
    .from("skull_gate_scenes")
    .select("id, slug, draft_config_json")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return errorResponse(fetchErr.message);
  if (!scene)   return errorResponse("Scene not found", 404);

  const cfg = scene.draft_config_json as Record<string, unknown>;
  const validationErrors = validateSceneConfig(cfg);
  if (validationErrors.length > 0) {
    return jsonResponse({ success: false, validation_errors: validationErrors }, 422);
  }

  const { data, error } = await supabase
    .from("skull_gate_scenes")
    .update({
      published_config_json: scene.draft_config_json,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, slug, status, published_at")
    .maybeSingle();
  if (error) return errorResponse(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "publish_skull_gate_scene",
    payload_json: { id, slug: scene.slug },
  });
  return jsonResponse({ success: true, scene: data });
}

async function handleRevertDraft(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: { id: string },
) {
  const { id } = body;
  if (!id) return errorResponse("Missing id");

  const { data: scene, error: fetchErr } = await supabase
    .from("skull_gate_scenes")
    .select("id, slug, published_config_json")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return errorResponse(fetchErr.message);
  if (!scene)   return errorResponse("Scene not found", 404);
  if (!scene.published_config_json) return errorResponse("No published version to revert to");

  const { data, error } = await supabase
    .from("skull_gate_scenes")
    .update({ draft_config_json: scene.published_config_json })
    .eq("id", id)
    .select("id, slug, updated_at")
    .maybeSingle();
  if (error) return errorResponse(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "revert_skull_gate_scene_draft",
    payload_json: { id, slug: scene.slug },
  });
  return jsonResponse({ success: true, scene: data });
}

async function handleDuplicateScene(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: { id: string },
) {
  const { id } = body;
  if (!id) return errorResponse("Missing id");

  const { data: src, error: fetchErr } = await supabase
    .from("skull_gate_scenes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return errorResponse(fetchErr.message);
  if (!src)     return errorResponse("Scene not found", 404);

  const newSlug = `${src.slug}-copy-${Date.now().toString(36)}`;
  const newTitle = `${src.title} (Copy)`;

  // Patch the draft config with new slug/title so it stays consistent
  const patchedConfig = {
    ...(src.draft_config_json as Record<string, unknown>),
    slug: newSlug,
    title: newTitle,
    status: "draft",
  };

  const { data, error } = await supabase
    .from("skull_gate_scenes")
    .insert({
      slug: newSlug,
      title: newTitle,
      description: src.description,
      template_type: src.template_type,
      status: "draft",
      enabled: false,
      weight: src.weight,
      cooldown_days: src.cooldown_days,
      min_streak: src.min_streak,
      max_streak: src.max_streak,
      draft_config_json: patchedConfig,
      published_config_json: null,
    })
    .select()
    .maybeSingle();
  if (error) return errorResponse(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "duplicate_skull_gate_scene",
    payload_json: { source_id: id, new_id: data?.id, new_slug: newSlug },
  });
  return jsonResponse({ success: true, scene: data });
}

async function handleArchiveScene(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: { id: string },
) {
  const { id } = body;
  if (!id) return errorResponse("Missing id");

  const { data, error } = await supabase
    .from("skull_gate_scenes")
    .update({ status: "archived", enabled: false })
    .eq("id", id)
    .select("id, slug, status")
    .maybeSingle();
  if (error) return errorResponse(error.message);
  if (!data)  return errorResponse("Scene not found", 404);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "archive_skull_gate_scene",
    payload_json: { id, slug: data.slug },
  });
  return jsonResponse({ success: true, scene: data });
}

// ── Asset Library handlers ────────────────────────────────────────────────────

async function handleListAssets(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("skull_gate_assets")
    .select("*")
    .order("asset_type")
    .order("label");
  if (error) return errorResponse(error.message);
  return jsonResponse({ assets: data ?? [] });
}

async function handleCreateAsset(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: { asset_path: string; asset_type: string; label: string; tags?: string[]; notes?: string },
) {
  const { asset_path, asset_type, label, tags, notes } = body;
  if (!asset_path) return errorResponse("Missing asset_path");
  if (!asset_type) return errorResponse("Missing asset_type");

  const { data, error } = await supabase
    .from("skull_gate_assets")
    .insert({ asset_path, asset_type, label: label || asset_path.split("/").pop() || "", tags: tags ?? [], notes: notes ?? null })
    .select("*")
    .maybeSingle();
  if (error) return errorResponse(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "create_skull_gate_asset",
    payload_json: { id: data?.id, asset_path },
  });
  return jsonResponse({ success: true, asset: data });
}

async function handleUpdateAsset(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: { id: string; asset_path?: string; asset_type?: string; label?: string; tags?: string[]; notes?: string },
) {
  const { id, ...rest } = body;
  if (!id) return errorResponse("Missing id");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.asset_path !== undefined) updates.asset_path = rest.asset_path;
  if (rest.asset_type !== undefined) updates.asset_type = rest.asset_type;
  if (rest.label      !== undefined) updates.label      = rest.label;
  if (rest.tags       !== undefined) updates.tags       = rest.tags;
  if (rest.notes      !== undefined) updates.notes      = rest.notes;

  const { data, error } = await supabase
    .from("skull_gate_assets")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return errorResponse(error.message);
  if (!data)  return errorResponse("Asset not found", 404);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "update_skull_gate_asset",
    payload_json: { id, asset_path: data.asset_path },
  });
  return jsonResponse({ success: true, asset: data });
}

async function handleDeleteAsset(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  body: { id: string },
) {
  const { id } = body;
  if (!id) return errorResponse("Missing id");

  const { data: existing } = await supabase
    .from("skull_gate_assets")
    .select("asset_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("skull_gate_assets")
    .delete()
    .eq("id", id);
  if (error) return errorResponse(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_actor: actor,
    action: "delete_skull_gate_asset",
    payload_json: { id, asset_path: existing?.asset_path },
  });
  return jsonResponse({ success: true });
}
