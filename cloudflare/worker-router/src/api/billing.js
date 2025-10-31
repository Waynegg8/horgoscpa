import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

function parseId(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function handleBilling(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();

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

      // 获取收费明细
      const rows = await env.DATABASE.prepare(
        `SELECT schedule_id, billing_month, billing_amount, payment_due_days, notes, created_at, updated_at
         FROM ServiceBillingSchedule
         WHERE client_service_id = ?
         ORDER BY billing_month ASC`
      ).bind(clientServiceId).all();

      const data = (rows?.results || []).map(r => ({
        schedule_id: r.schedule_id,
        billing_month: r.billing_month,
        billing_amount: Number(r.billing_amount || 0),
        payment_due_days: Number(r.payment_due_days || 30),
        notes: r.notes || "",
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

  // POST /internal/api/v1/billing/service/:serviceId - 新增收费明细
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
        `INSERT INTO ServiceBillingSchedule (client_service_id, billing_month, billing_amount, payment_due_days, notes)
         VALUES (?, ?, ?, ?, ?)`
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
      // 检查明细是否存在
      const existing = await env.DATABASE.prepare(
        "SELECT schedule_id FROM ServiceBillingSchedule WHERE schedule_id = ?"
      ).bind(scheduleId).first();

      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "收费明细不存在", meta: { requestId } }, corsHeaders);
      }

      // 更新收费明细
      await env.DATABASE.prepare(
        `UPDATE ServiceBillingSchedule 
         SET billing_amount = ?, payment_due_days = ?, notes = ?, updated_at = datetime('now')
         WHERE schedule_id = ?`
      ).bind(billingAmount, paymentDueDays, notes, scheduleId).run();

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
      // 检查明细是否存在
      const existing = await env.DATABASE.prepare(
        "SELECT schedule_id FROM ServiceBillingSchedule WHERE schedule_id = ?"
      ).bind(scheduleId).first();

      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "收费明细不存在", meta: { requestId } }, corsHeaders);
      }

      // 删除收费明细
      await env.DATABASE.prepare(
        "DELETE FROM ServiceBillingSchedule WHERE schedule_id = ?"
      ).bind(scheduleId).run();

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

