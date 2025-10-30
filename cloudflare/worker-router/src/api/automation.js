import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

function isValidSchedule(type, value) {
  if (!['daily','weekly','monthly','cron'].includes(type)) return false;
  if (type === 'daily') return /^\d{2}:\d{2}$/.test(value||'');
  if (type === 'weekly') return /^([A-Z][a-z]{2})\s+\d{2}:\d{2}$/.test(value||''); // e.g. Mon 03:00
  if (type === 'monthly') return /^(\d{1,2})\s+\d{2}:\d{2}$/.test(value||''); // e.g. 1 02:00
  if (type === 'cron') return typeof value === 'string' && value.trim().length > 0; // accept any non-empty; real cron parser omitted
  return false;
}

function parseJsonSafe(s, def=null) { try { return JSON.parse(String(s||'null')); } catch(_) { return def; } }

export async function handleAutomation(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  if (!me?.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
  const method = request.method.toUpperCase();

  // List
  if (path === "/internal/api/v1/admin/automation-rules" && method === "GET") {
    try {
      const p = url.searchParams; const q = (p.get('q')||'').trim(); const enabled = p.get('enabled');
      const page = Math.max(1, parseInt(p.get('page')||'1',10)); const perPage = Math.min(100, Math.max(1, parseInt(p.get('perPage')||'20',10)));
      const offset = (page-1)*perPage; const where=["is_deleted=0"]; const binds=[];
      if (q) { where.push("rule_name LIKE ?"); binds.push(`%${q}%`); }
      if (enabled==='0' || enabled==='1') { where.push("is_enabled = ?"); binds.push(parseInt(enabled,10)); }
      const whereSql = where.length?`WHERE ${where.join(' AND ')}`:'';
      const totalRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM AutomationRules ${whereSql}`).bind(...binds).first();
      const rows = await env.DATABASE.prepare(
        `SELECT rule_id, rule_name, schedule_type, schedule_value, is_enabled, last_run_at, created_at, updated_at
         FROM AutomationRules ${whereSql} ORDER BY updated_at DESC, rule_id DESC LIMIT ? OFFSET ?`
      ).bind(...binds, perPage, offset).all();
      const data = (rows?.results||[]).map(r=>({ id:r.rule_id, name:r.rule_name, scheduleType:r.schedule_type, scheduleValue:r.schedule_value, isEnabled:r.is_enabled===1, lastRunAt:r.last_run_at, createdAt:r.created_at, updatedAt:r.updated_at }));
      return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total:Number(totalRow?.total||0) } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Create
  if (path === "/internal/api/v1/admin/automation-rules" && method === "POST") {
    let body; try { body = await request.json(); } catch(_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
    const name = String(body?.rule_name || body?.name || '').trim();
    const scheduleType = String(body?.schedule_type || body?.scheduleType || '').trim();
    const scheduleValue = String(body?.schedule_value || body?.scheduleValue || '').trim();
    const condition = body?.condition_json ?? body?.condition ?? null;
    const action = body?.action_json ?? body?.action ?? null;
    const errors = [];
    if (!name) errors.push({ field:'rule_name', message:'必填' });
    if (!isValidSchedule(scheduleType, scheduleValue)) errors.push({ field:'schedule', message:'排程不合法' });
    if (!action) errors.push({ field:'action', message:'必填' });
    if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
    try {
      await env.DATABASE.prepare(
        `INSERT INTO AutomationRules (rule_name, schedule_type, schedule_value, condition_json, action_json, is_enabled) VALUES (?, ?, ?, ?, ?, 1)`
      ).bind(name, scheduleType, scheduleValue, JSON.stringify(condition ?? {}), JSON.stringify(action ?? {})).run();
      const idRow = await env.DATABASE.prepare(`SELECT last_insert_rowid() AS id`).first();
      return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ id:Number(idRow?.id||0) }, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Update
  const updateMatch = path.match(/^\/internal\/api\/v1\/admin\/automation-rules\/(\d+)$/);
  if (updateMatch) {
    if (!['PUT','DELETE'].includes(method)) return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
    const id = parseInt(updateMatch[1],10);
    if (method === 'DELETE') {
      try {
        await env.DATABASE.prepare(`UPDATE AutomationRules SET is_deleted = 1 WHERE rule_id = ?`).bind(id).run();
        return jsonResponse(200, { ok:true, code:"OK", message:"已刪除", data:{ id }, meta:{ requestId } }, corsHeaders);
      } catch (err) {
        console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
        return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
      }
    }
    let body; try { body = await request.json(); } catch(_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
    const name = body?.rule_name !== undefined ? String(body.rule_name).trim() : undefined;
    const scheduleType = body?.schedule_type !== undefined ? String(body.schedule_type).trim() : undefined;
    const scheduleValue = body?.schedule_value !== undefined ? String(body.schedule_value).trim() : undefined;
    const isEnabled = body?.is_enabled;
    const condition = body?.condition_json !== undefined ? JSON.stringify(parseJsonSafe(body.condition_json, {})) : undefined;
    const action = body?.action_json !== undefined ? JSON.stringify(parseJsonSafe(body.action_json, {})) : undefined;
    const sets = []; const binds = [];
    if (name !== undefined) { if (!name) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"名稱必填", meta:{ requestId } }, corsHeaders); sets.push('rule_name = ?'); binds.push(name); }
    if (scheduleType !== undefined || scheduleValue !== undefined) {
      const t = scheduleType ?? (await env.DATABASE.prepare(`SELECT schedule_type FROM AutomationRules WHERE rule_id = ?`).bind(id).first())?.schedule_type;
      const v = scheduleValue ?? (await env.DATABASE.prepare(`SELECT schedule_value FROM AutomationRules WHERE rule_id = ?`).bind(id).first())?.schedule_value;
      if (!isValidSchedule(t, v)) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"排程不合法", meta:{ requestId } }, corsHeaders);
      if (scheduleType !== undefined) { sets.push('schedule_type = ?'); binds.push(scheduleType); }
      if (scheduleValue !== undefined) { sets.push('schedule_value = ?'); binds.push(scheduleValue); }
    }
    if (condition !== undefined) { sets.push('condition_json = ?'); binds.push(condition); }
    if (action !== undefined) { sets.push('action_json = ?'); binds.push(action); }
    if (isEnabled === 0 || isEnabled === 1 || isEnabled === true || isEnabled === false) { sets.push('is_enabled = ?'); binds.push((isEnabled===1||isEnabled===true)?1:0); }
    if (!sets.length) return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"無可更新欄位", meta:{ requestId } }, corsHeaders);
    sets.push('updated_at = datetime(\'now\')');
    try {
      await env.DATABASE.prepare(`UPDATE AutomationRules SET ${sets.join(', ')} WHERE rule_id = ?`).bind(...binds, id).run();
      return jsonResponse(200, { ok:true, code:"OK", message:"已更新", data:{ id }, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  // Test execution (dry run)
  const testMatch = path.match(/^\/internal\/api\/v1\/admin\/automation-rules\/(\d+)\/test$/);
  if (testMatch) {
    if (method !== 'POST') return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
    const id = parseInt(testMatch[1], 10);
    try {
      const row = await env.DATABASE.prepare(`SELECT rule_id, rule_name, schedule_type, schedule_value, condition_json, action_json, is_enabled FROM AutomationRules WHERE rule_id = ? AND is_deleted = 0`).bind(id).first();
      if (!row) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"規則不存在", meta:{ requestId } }, corsHeaders);
      const condition = parseJsonSafe(row.condition_json, {});
      const action = parseJsonSafe(row.action_json, {});
      // 這裡僅回傳將執行的動作摘要（乾跑）；實際執行交由排程器
      const summary = { ruleId: row.rule_id, ruleName: row.rule_name, willExecute: !!row.is_enabled, condition, action };
      return jsonResponse(200, { ok:true, code:"OK", message:"測試成功", data: summary, meta:{ requestId } }, corsHeaders);
    } catch (err) {
      console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
      return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
    }
  }

  return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}


