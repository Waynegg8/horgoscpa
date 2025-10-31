import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

const DANGEROUS_KEYS = new Set(["rule_comp_hours_expiry"]);
const ALLOWED_KEYS = new Set([
  "company_name",
  "contact_email",
  "timezone",
  "currency",
  "timesheet_min_unit",
  "soft_delete_enabled",
  "workday_start",
  "workday_end",
  "report_locale",
  "rule_comp_hours_expiry",
  "attendance_bonus_amount",
  "overhead_cost_per_hour",
  "target_profit_margin",
]);

function normalizeKey(key){
  return String(key||"").trim();
}

export async function handleSettings(request, env, me, requestId, url, path){
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  
  // GET /internal/api/v1/users - 获取所有员工列表（所有登录用户都可访问）
  if (path === "/internal/api/v1/users" && method === "GET"){
    try {
      const rows = await env.DATABASE.prepare(
        "SELECT user_id, username, name, is_admin FROM Users WHERE is_deleted = 0 ORDER BY user_id ASC"
      ).all();
      const data = (rows?.results || []).map(r => ({
        user_id: r.user_id,
        username: r.username,
        name: r.name || r.username,
        is_admin: Boolean(r.is_admin)
      }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }
  
  if (!me?.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);

  // GET all settings
  if (path === "/internal/api/v1/admin/settings" && method === "GET"){
    try {
      const rows = await env.DATABASE.prepare(
        "SELECT setting_key AS key, setting_value AS value, is_dangerous AS isDangerous, description, updated_at AS updatedAt, updated_by AS updatedBy FROM Settings ORDER BY setting_key"
      ).all();
      const map = {};
      for (const r of (rows?.results||[])) map[r.key] = r.value;
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data:{ items: rows?.results||[], map }, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // PUT update single setting: /internal/api/v1/admin/settings/:key
  if (path.startsWith("/internal/api/v1/admin/settings/") && method === "PUT"){
    const key = normalizeKey(path.replace("/internal/api/v1/admin/settings/", ""));
    if (!ALLOWED_KEYS.has(key)) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"不支援的設定鍵", meta:{ requestId } }, corsHeaders);
    let payload;
    try { payload = await request.json(); } catch(_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
    const value = String(payload?.value ?? "");
    if (key === "contact_email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)){
      return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"Email 格式錯誤", meta:{ requestId } }, corsHeaders);
    }
    if (key === "timesheet_min_unit"){
      const n = parseFloat(value);
      if (!Number.isFinite(n) || (n!==0.25 && n!==0.5 && n!==1)){
        return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"工時最小單位僅允許 0.25/0.5/1", meta:{ requestId } }, corsHeaders);
      }
    }
    if (key === "soft_delete_enabled"){
      if (!(value === "0" || value === "1")) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"軟刪除值僅能為 0 或 1", meta:{ requestId } }, corsHeaders);
    }
    if (key === "workday_start" || key === "workday_end"){
      if (!/^\d{2}:\d{2}$/.test(value)) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"時間格式需為 HH:MM", meta:{ requestId } }, corsHeaders);
    }
    if (key === "rule_comp_hours_expiry"){
      const okVals = new Set(["current_month","next_month","3_months","6_months"]);
      if (!okVals.has(value)) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"無效的規則值", meta:{ requestId } }, corsHeaders);
      if (DANGEROUS_KEYS.has(key) && payload?.confirmed !== true){
        return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"危險設定需確認", meta:{ requestId, field:key } }, corsHeaders);
      }
    }
    if (key === "attendance_bonus_amount"){
      const n = parseInt(value, 10);
      if (!Number.isInteger(n) || n < 0) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"全勤獎金必須為非負整數", meta:{ requestId } }, corsHeaders);
    }
    if (key === "overhead_cost_per_hour"){
      const n = parseFloat(value);
      if (!Number.isFinite(n) || n < 0) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"管理成本必須為非負數字", meta:{ requestId } }, corsHeaders);
    }
    if (key === "target_profit_margin"){
      const n = parseFloat(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"目標毛利率必須在 0-100 之間", meta:{ requestId } }, corsHeaders);
    }
    try {
      const nowIso = new Date().toISOString();
      await env.DATABASE.prepare(
        "INSERT INTO Settings(setting_key, setting_value, updated_at, updated_by) VALUES(?, ?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
      ).bind(key, value, nowIso, String(me.user_id||me.userId||"1")).run();
      return jsonResponse(200, { ok:true, code:"OK", message:"已更新", data:{ key, value }, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"無此端點", meta:{ requestId } }, corsHeaders);
}


