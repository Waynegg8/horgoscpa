import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { generateCacheKey, invalidateCacheByType } from "../cache-helper.js";
import { deleteKVCache, deleteKVCacheByPrefix } from "../kv-cache-helper.js";

function parseId(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function handleBilling(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();

  // 檢查資料表欄位（兼容舊結構）
  async function getBillingSchema() {
    try {
      const info = await env.DATABASE.prepare("PRAGMA table_info(ServiceBillingSchedule)").all();
      const cols = new Set((info?.results || []).map(r => r.name));
      return {
        hasType: cols.has("billing_type"),
        hasDate: cols.has("billing_date"),
        hasDesc: cols.has("description"),
      };
    } catch (_) {
      return { hasType: false, hasDate: false, hasDesc: false };
    }
  }

  // GET /internal/api/v1/billing/service/:serviceId - 获取服务的收费明细
  const matchGet = path.match(/^\/internal\/api\/v1\/billing\/service\/(\d+)$/);
  if (method === "GET" && matchGet) {
    const clientServiceId = parseId(matchGet[1]);
    if (!clientServiceId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "服务ID无效", meta: { requestId } }, corsHeaders);
    }

    try {
      // 检查服务是否存在且有权限访问
      const service = await env.DATABASE.prepare(
        `SELECT cs.client_service_id, cs.client_id, c.assignee_user_id
         FROM ClientServices cs
         LEFT JOIN Clients c ON c.client_id = cs.client_id
         WHERE cs.client_service_id = ? AND cs.is_deleted = 0`
      ).bind(clientServiceId).first();

      if (!service) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "服务不存在", meta: { requestId } }, corsHeaders);
      }

      // 权限检查：管理员或负责人可查看
      if (!me.is_admin && service.assignee_user_id !== me.user_id) {
        return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "无权限访问", meta: { requestId } }, corsHeaders);
      }

      const schema = await getBillingSchema();
      const selectCols = [
        "schedule_id",
        "billing_month",
        "billing_amount",
        "payment_due_days",
        "notes",
      ];
      if (schema.hasType) selectCols.push("billing_type");
      if (schema.hasDate) selectCols.push("billing_date");
      if (schema.hasDesc) selectCols.push("description");
      selectCols.push("created_at", "updated_at");

      const orderBy = schema.hasType ? "billing_type ASC, billing_month ASC" : "billing_month ASC";
      const rows = await env.DATABASE.prepare(
        `SELECT ${selectCols.join(", ")}
         FROM ServiceBillingSchedule
         WHERE client_service_id = ?
         ORDER BY ${orderBy}`
      ).bind(clientServiceId).all();

      const data = (rows?.results || []).map(r => ({
        schedule_id: r.schedule_id,
        billing_month: r.billing_month,
        billing_amount: Number(r.billing_amount || 0),
        payment_due_days: Number(r.payment_due_days || 30),
        notes: r.notes || "",
        billing_type: schema.hasType ? (r.billing_type || 'monthly') : 'monthly',
        billing_date: schema.hasDate ? (r.billing_date || null) : null,
        description: schema.hasDesc ? (r.description || null) : null,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));

      // 计算年度总额
      const yearTotal = data.reduce((sum, item) => sum + item.billing_amount, 0);

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "查询成功",
        data: {
          schedules: data,
          year_total: yearTotal
        },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // POST /internal/api/v1/billing - 新增收费明细（新endpoint）
  if (method === "POST" && path === "/internal/api/v1/billing") {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "请求格式错误", meta: { requestId } }, corsHeaders);
    }

    const clientServiceId = parseId(body?.client_service_id);
    if (!clientServiceId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "服务ID无效", meta: { requestId } }, corsHeaders);
    }

    const errors = [];
    const billingType = String(body?.billing_type || "monthly").trim();
    const billingMonth = parseInt(body?.billing_month, 10);
    const billingAmount = parseFloat(body?.billing_amount);
    const paymentDueDays = parseInt(body?.payment_due_days || 30, 10);
    const notes = String(body?.notes || "").trim();
    const billingDate = String(body?.billing_date || "").trim();
    const description = String(body?.description || "").trim();

    // 验证收费类型
    if (!['monthly', 'one-time'].includes(billingType)) {
      errors.push({ field: "billing_type", message: "收费类型必须为monthly或one-time" });
    }

    // 根据类型验证字段
    if (billingType === 'monthly') {
      if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
        errors.push({ field: "billing_month", message: "月份必须在1-12之间" });
      }
    } else if (billingType === 'one-time') {
      if (!billingDate) {
        errors.push({ field: "billing_date", message: "一次性收费必须提供日期" });
      }
      if (!description) {
        errors.push({ field: "description", message: "一次性收费必须提供说明" });
      }
    }

    if (isNaN(billingAmount) || billingAmount < 0) {
      errors.push({ field: "billing_amount", message: "金额必须为非负数" });
    }
    if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
      errors.push({ field: "payment_due_days", message: "收款期限必须大于0" });
    }

    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "输入有误", errors, meta: { requestId } }, corsHeaders);
    }

    try {
      const schema = await getBillingSchema();
      // 检查服务是否存在
      const service = await env.DATABASE.prepare(
        "SELECT client_service_id, client_id FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0"
      ).bind(clientServiceId).first();

      if (!service) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "服务不存在", meta: { requestId } }, corsHeaders);
      }

      // 唯一性檢查
      if (billingType === 'monthly') {
        const existing = await env.DATABASE.prepare(
          "SELECT schedule_id FROM ServiceBillingSchedule WHERE client_service_id = ? AND billing_month = ? AND billing_type = 'monthly'"
        ).bind(clientServiceId, billingMonth).first();

        if (existing) {
          return jsonResponse(422, {
            ok: false,
            code: "DUPLICATE",
            message: "该月份已设定收费",
            errors: [{ field: "billing_month", message: "该月份已存在" }],
            meta: { requestId }
          }, corsHeaders);
        }
      } else if (billingType === 'one-time') {
        const existing = await env.DATABASE.prepare(
          "SELECT schedule_id FROM ServiceBillingSchedule WHERE client_service_id = ? AND billing_type = 'one-time' AND billing_date = ? AND COALESCE(description,'') = ?"
        ).bind(clientServiceId, billingDate, description).first();
        if (existing) {
          return jsonResponse(422, {
            ok: false,
            code: "DUPLICATE",
            message: "該日期與說明的一次性收費已存在",
            errors: [{ field: "billing_date", message: "重複" }],
            meta: { requestId }
          }, corsHeaders);
        }
      }

      // 插入收费明细（兼容舊表結構）
      let result;
      if (schema.hasType && schema.hasDate) {
        // 新結構：完整字段
        result = await env.DATABASE.prepare(
          `INSERT INTO ServiceBillingSchedule 
           (client_service_id, billing_type, billing_month, billing_amount, payment_due_days, notes, billing_date, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          clientServiceId,
          billingType,
          billingType === 'monthly' ? billingMonth : 0,
          billingAmount,
          paymentDueDays,
          notes || null,
          billingDate || null,
          description || null
        ).run();
      } else {
        // 舊結構：僅支援 monthly 欄位。若 one-time，退化為該日期所在月份。
        const finalMonth = billingType === 'one-time'
          ? (parseInt((billingDate || '').slice(5,7), 10) || new Date().getMonth() + 1)
          : billingMonth;
        result = await env.DATABASE.prepare(
          `INSERT INTO ServiceBillingSchedule 
           (client_service_id, billing_month, billing_amount, payment_due_days, notes)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          clientServiceId,
          finalMonth,
          billingAmount,
          paymentDueDays,
          (description ? `[一次性] ${description} ` : '') + (notes || '')
        ).run();
      }

      const scheduleId = result?.meta?.last_row_id;

      // 失效與此客戶相關的快取（列表+詳情）
      try {
        const clientId = service?.client_id;
        if (clientId) {
          const detailKey = generateCacheKey('client_detail', { clientId });
          await deleteKVCache(env, detailKey);
        }
        await invalidateCacheByType(env, 'clients_list');
        await deleteKVCacheByPrefix(env, 'clients_list');
      } catch (e) {
        console.error('[BILLING] 快取失效失敗:', e);
      }

      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "收费明细已新增",
        data: { schedule_id: scheduleId },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }
  
  // POST /internal/api/v1/billing/service/:serviceId - 新增收费明细（旧endpoint，保留兼容性）
  if (method === "POST" && matchGet) {
    const clientServiceId = parseId(matchGet[1]);
    if (!clientServiceId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "服务ID无效", meta: { requestId } }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "请求格式错误", meta: { requestId } }, corsHeaders);
    }

    const errors = [];
    const billingMonth = parseInt(body?.billing_month, 10);
    const billingAmount = parseFloat(body?.billing_amount);
    const paymentDueDays = parseInt(body?.payment_due_days || 30, 10);
    const notes = String(body?.notes || "").trim();

    // 验证
    if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
      errors.push({ field: "billing_month", message: "月份必须在1-12之间" });
    }
    if (isNaN(billingAmount) || billingAmount < 0) {
      errors.push({ field: "billing_amount", message: "金额必须为非负数" });
    }
    if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
      errors.push({ field: "payment_due_days", message: "收款期限必须大于0" });
    }

    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "输入有误", errors, meta: { requestId } }, corsHeaders);
    }

    try {
      // 检查服务是否存在
      const service = await env.DATABASE.prepare(
        "SELECT client_service_id FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0"
      ).bind(clientServiceId).first();

      if (!service) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "服务不存在", meta: { requestId } }, corsHeaders);
      }

      // 检查该月份是否已存在
      const existing = await env.DATABASE.prepare(
        "SELECT schedule_id FROM ServiceBillingSchedule WHERE client_service_id = ? AND billing_month = ?"
      ).bind(clientServiceId, billingMonth).first();

      if (existing) {
        return jsonResponse(422, {
          ok: false,
          code: "DUPLICATE",
          message: "该月份已设定收费",
          errors: [{ field: "billing_month", message: "该月份已存在" }],
          meta: { requestId }
        }, corsHeaders);
      }

      // 插入收费明细
      const result = await env.DATABASE.prepare(
        `INSERT INTO ServiceBillingSchedule (client_service_id, billing_type, billing_month, billing_amount, payment_due_days, notes)
         VALUES (?, 'monthly', ?, ?, ?, ?)`
      ).bind(clientServiceId, billingMonth, billingAmount, paymentDueDays, notes).run();

      const scheduleId = result?.meta?.last_row_id;

      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "收费明细已新增",
        data: { schedule_id: scheduleId },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // PUT /internal/api/v1/billing/:scheduleId - 更新收费明细
  const matchUpdate = path.match(/^\/internal\/api\/v1\/billing\/(\d+)$/);
  if (method === "PUT" && matchUpdate) {
    const scheduleId = parseId(matchUpdate[1]);
    if (!scheduleId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "明细ID无效", meta: { requestId } }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "请求格式错误", meta: { requestId } }, corsHeaders);
    }

    const errors = [];
    const billingAmount = parseFloat(body?.billing_amount);
    const paymentDueDays = parseInt(body?.payment_due_days || 30, 10);
    const notes = String(body?.notes || "").trim();

    // 验证
    if (isNaN(billingAmount) || billingAmount < 0) {
      errors.push({ field: "billing_amount", message: "金额必须为非负数" });
    }
    if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
      errors.push({ field: "payment_due_days", message: "收款期限必须大于0" });
    }

    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "输入有误", errors, meta: { requestId } }, corsHeaders);
    }

    try {
      const schema = await getBillingSchema();
      // 检查明细是否存在
      const existing = await env.DATABASE.prepare(
        `SELECT s.schedule_id, cs.client_id
         FROM ServiceBillingSchedule s
         LEFT JOIN ClientServices cs ON cs.client_service_id = s.client_service_id
         WHERE s.schedule_id = ?`
      ).bind(scheduleId).first();

      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "收费明细不存在", meta: { requestId } }, corsHeaders);
      }

      // 更新收费明细（兼容舊結構）
      await env.DATABASE.prepare(
        `UPDATE ServiceBillingSchedule 
         SET billing_amount = ?, payment_due_days = ?, notes = ?, updated_at = datetime('now')
         WHERE schedule_id = ?`
      ).bind(billingAmount, paymentDueDays, notes, scheduleId).run();

      // 失效快取
      try {
        const clientId = existing?.client_id;
        if (clientId) {
          const detailKey = generateCacheKey('client_detail', { clientId });
          await deleteKVCache(env, detailKey);
        }
        await invalidateCacheByType(env, 'clients_list');
        await deleteKVCacheByPrefix(env, 'clients_list');
      } catch (e) {
        console.error('[BILLING] 快取失效失敗:', e);
      }

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "收费明细已更新",
        data: { schedule_id: scheduleId },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // DELETE /internal/api/v1/billing/:scheduleId - 删除收费明细
  if (method === "DELETE" && matchUpdate) {
    const scheduleId = parseId(matchUpdate[1]);
    if (!scheduleId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "明细ID无效", meta: { requestId } }, corsHeaders);
    }

    try {
      const schema = await getBillingSchema();
      // 检查明细是否存在
      const existing = await env.DATABASE.prepare(
        `SELECT s.schedule_id, cs.client_id
         FROM ServiceBillingSchedule s
         LEFT JOIN ClientServices cs ON cs.client_service_id = s.client_service_id
         WHERE s.schedule_id = ?`
      ).bind(scheduleId).first();

      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "收费明细不存在", meta: { requestId } }, corsHeaders);
      }

      // 删除收费明细
      await env.DATABASE.prepare(
        "DELETE FROM ServiceBillingSchedule WHERE schedule_id = ?"
      ).bind(scheduleId).run();

      // 失效快取
      try {
        const clientId = existing?.client_id;
        if (clientId) {
          const detailKey = generateCacheKey('client_detail', { clientId });
          await deleteKVCache(env, detailKey);
        }
        await invalidateCacheByType(env, 'clients_list');
        await deleteKVCacheByPrefix(env, 'clients_list');
      } catch (e) {
        console.error('[BILLING] 快取失效失敗:', e);
      }

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "收费明细已删除",
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "路由不存在", meta: { requestId } }, corsHeaders);
}

