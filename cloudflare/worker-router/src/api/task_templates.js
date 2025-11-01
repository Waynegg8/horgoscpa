import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

function parseId(s) {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function handleTaskTemplates(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();

  // GET /internal/api/v1/task-templates - 获取任务模板列表
  if (method === "GET" && path === "/internal/api/v1/task-templates") {
    const serviceId = url.searchParams.get("service_id");
    const clientId = url.searchParams.get("client_id");

    try {
      let query = `
        SELECT tt.template_id, tt.template_name, tt.service_id, tt.client_id, tt.description, 
               tt.sop_id, tt.is_active, tt.created_at,
               tt.default_due_date_rule, tt.default_due_date_value, 
               tt.default_due_date_offset_days, tt.default_advance_days,
               s.service_name, s.service_code,
               c.company_name as client_name,
               (SELECT COUNT(*) FROM TaskTemplateStages WHERE template_id = tt.template_id) as stages_count
        FROM TaskTemplates tt
        LEFT JOIN Services s ON s.service_id = tt.service_id
        LEFT JOIN Clients c ON c.client_id = tt.client_id
        WHERE 1=1
      `;
      const params = [];

      if (serviceId) {
        query += ` AND tt.service_id = ?`;
        params.push(parseInt(serviceId, 10));
      }

      if (clientId) {
        if (clientId === 'null') {
          query += ` AND tt.client_id IS NULL`;
        } else {
          query += ` AND tt.client_id = ?`;
          params.push(parseInt(clientId, 10));
        }
      }

      query += ` ORDER BY tt.template_name ASC`;

      const stmt = params.length > 0 
        ? env.DATABASE.prepare(query).bind(...params)
        : env.DATABASE.prepare(query);

      const rows = await stmt.all();

      const data = (rows?.results || []).map(r => ({
        template_id: r.template_id,
        template_name: r.template_name || "",
        service_id: r.service_id || null,
        service_name: r.service_name || "",
        service_code: r.service_code || "",
        client_id: r.client_id || null,
        client_name: r.client_name || "",
        description: r.description || "",
        sop_id: r.sop_id || null,
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
        stages_count: r.stages_count || 0,
        default_due_date_rule: r.default_due_date_rule || null,
        default_due_date_value: r.default_due_date_value || null,
        default_due_date_offset_days: r.default_due_date_offset_days || 0,
        default_advance_days: r.default_advance_days || 7
      }));

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "查询成功",
        data: data,
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // GET /internal/api/v1/task-templates/:id - 获取任务模板详情（含阶段）
  const matchGet = path.match(/^\/internal\/api\/v1\/task-templates\/(\d+)$/);
  if (method === "GET" && matchGet) {
    const templateId = parseId(matchGet[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "模板ID无效", meta: { requestId } }, corsHeaders);
    }

    try {
      // 获取模板基本信息
      const template = await env.DATABASE.prepare(
        `SELECT tt.template_id, tt.template_name, tt.service_id, tt.description, 
                tt.sop_id, tt.is_active, tt.created_at,
                s.service_name, s.service_code
         FROM TaskTemplates tt
         LEFT JOIN Services s ON s.service_id = tt.service_id
         WHERE tt.template_id = ?`
      ).bind(templateId).first();

      if (!template) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "模板不存在", meta: { requestId } }, corsHeaders);
      }

      // 获取阶段列表
      const stagesRows = await env.DATABASE.prepare(
        `SELECT stage_id, stage_name, stage_order, description, estimated_hours
         FROM TaskTemplateStages
         WHERE template_id = ?
         ORDER BY stage_order ASC`
      ).bind(templateId).all();

      const stages = (stagesRows?.results || []).map(s => ({
        stage_id: s.stage_id,
        stage_name: s.stage_name || "",
        stage_order: s.stage_order,
        description: s.description || "",
        estimated_hours: Number(s.estimated_hours || 0)
      }));

      const data = {
        template_id: template.template_id,
        template_name: template.template_name || "",
        service_id: template.service_id || null,
        service_name: template.service_name || "",
        service_code: template.service_code || "",
        description: template.description || "",
        sop_id: template.sop_id || null,
        is_active: Boolean(template.is_active),
        created_at: template.created_at,
        stages: stages
      };

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "查询成功",
        data: data,
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // POST /internal/api/v1/task-templates - 创建任务模板
  if (method === "POST" && path === "/internal/api/v1/task-templates") {
    // 仅管理员可创建模板
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "仅管理员可创建模板", meta: { requestId } }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "请求格式错误", meta: { requestId } }, corsHeaders);
    }

    const errors = [];
    const templateName = String(body?.template_name || "").trim();
    const serviceId = body?.service_id ? parseInt(body.service_id, 10) : null;
    const clientId = body?.client_id ? parseInt(body.client_id, 10) : null;
    const description = String(body?.description || "").trim();
    const sopId = body?.sop_id ? parseInt(body.sop_id, 10) : null;
    const stages = Array.isArray(body?.stages) ? body.stages : [];

    // 验证
    if (!templateName) {
      errors.push({ field: "template_name", message: "请输入模板名称" });
    }

    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "输入有误", errors, meta: { requestId } }, corsHeaders);
    }

    try {
      // 插入模板
      const result = await env.DATABASE.prepare(
        `INSERT INTO TaskTemplates (template_name, service_id, client_id, description, sop_id, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`
      ).bind(templateName, serviceId, clientId, description, sopId).run();

      const templateId = result?.meta?.last_row_id;

      // 插入阶段（如果有）
      if (stages.length > 0) {
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const stageName = String(stage?.stage_name || "").trim();
          const stageDesc = String(stage?.description || "").trim();
          const estimatedHours = parseFloat(stage?.estimated_hours || 0);

          if (stageName) {
            await env.DATABASE.prepare(
              `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
               VALUES (?, ?, ?, ?, ?)`
            ).bind(templateId, stageName, i + 1, stageDesc, estimatedHours).run();
          }
        }
      }

      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "模板已创建",
        data: { template_id: templateId },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // PUT /internal/api/v1/task-templates/:id - 更新任务模板
  const matchUpdate = path.match(/^\/internal\/api\/v1\/task-templates\/(\d+)$/);
  if (method === "PUT" && matchUpdate) {
    const templateId = parseId(matchUpdate[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "模板ID无效", meta: { requestId } }, corsHeaders);
    }

    // 仅管理员可更新模板
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "仅管理员可更新模板", meta: { requestId } }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "请求格式错误", meta: { requestId } }, corsHeaders);
    }

    const errors = [];
    const templateName = String(body?.template_name || "").trim();
    const serviceId = body?.service_id ? parseInt(body.service_id, 10) : null;
    const description = String(body?.description || "").trim();
    const sopId = body?.sop_id ? parseInt(body.sop_id, 10) : null;
    const isActive = body?.is_active !== false; // 默认true
    const stages = Array.isArray(body?.stages) ? body.stages : null; // null表示不更新阶段

    // 验证
    if (!templateName) {
      errors.push({ field: "template_name", message: "请输入模板名称" });
    }

    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "输入有误", errors, meta: { requestId } }, corsHeaders);
    }

    try {
      // 检查模板是否存在
      const existing = await env.DATABASE.prepare(
        "SELECT template_id FROM TaskTemplates WHERE template_id = ?"
      ).bind(templateId).first();

      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "模板不存在", meta: { requestId } }, corsHeaders);
      }

      // 更新模板基本信息
      await env.DATABASE.prepare(
        `UPDATE TaskTemplates 
         SET template_name = ?, service_id = ?, description = ?, sop_id = ?, is_active = ?
         WHERE template_id = ?`
      ).bind(templateName, serviceId, description, sopId, isActive ? 1 : 0, templateId).run();

      // 更新阶段（如果提供了stages数组）
      if (stages !== null) {
        // 删除现有阶段
        await env.DATABASE.prepare(
          "DELETE FROM TaskTemplateStages WHERE template_id = ?"
        ).bind(templateId).run();

        // 插入新阶段
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const stageName = String(stage?.stage_name || "").trim();
          const stageDesc = String(stage?.description || "").trim();
          const estimatedHours = parseFloat(stage?.estimated_hours || 0);

          if (stageName) {
            await env.DATABASE.prepare(
              `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
               VALUES (?, ?, ?, ?, ?)`
            ).bind(templateId, stageName, i + 1, stageDesc, estimatedHours).run();
          }
        }
      }

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "模板已更新",
        data: { template_id: templateId },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // DELETE /internal/api/v1/task-templates/:id - 删除任务模板
  if (method === "DELETE" && matchUpdate) {
    const templateId = parseId(matchUpdate[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "模板ID无效", meta: { requestId } }, corsHeaders);
    }

    // 仅管理员可删除模板
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "仅管理员可删除模板", meta: { requestId } }, corsHeaders);
    }

    try {
      // 检查模板是否存在
      const existing = await env.DATABASE.prepare(
        "SELECT template_id FROM TaskTemplates WHERE template_id = ?"
      ).bind(templateId).first();

      if (!existing) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "模板不存在", meta: { requestId } }, corsHeaders);
      }

      // 检查是否有客户服务正在使用此模板
      const inUse = await env.DATABASE.prepare(
        "SELECT client_service_id FROM ClientServices WHERE task_template_id = ? AND is_deleted = 0 LIMIT 1"
      ).bind(templateId).first();

      if (inUse) {
        return jsonResponse(422, {
          ok: false,
          code: "IN_USE",
          message: "该模板正在被使用，无法删除",
          meta: { requestId }
        }, corsHeaders);
      }

      // 删除阶段
      await env.DATABASE.prepare(
        "DELETE FROM TaskTemplateStages WHERE template_id = ?"
      ).bind(templateId).run();

      // 删除模板
      await env.DATABASE.prepare(
        "DELETE FROM TaskTemplates WHERE template_id = ?"
      ).bind(templateId).run();

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "模板已删除",
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // GET /internal/api/v1/task-templates/:id/stages - 获取模板的阶段列表
  const matchStages = path.match(/^\/internal\/api\/v1\/task-templates\/(\d+)\/stages$/);
  if (method === "GET" && matchStages) {
    const templateId = parseId(matchStages[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "模板ID无效", meta: { requestId } }, corsHeaders);
    }

    try {
      const stagesRows = await env.DATABASE.prepare(
        `SELECT tts.stage_id, tts.stage_name, tts.stage_order, tts.description, 
                tts.estimated_hours, tts.sop_id, tts.attachment_id,
                sop.title as sop_title,
                att.original_filename as attachment_name, att.file_url as attachment_url
         FROM TaskTemplateStages tts
         LEFT JOIN SOPDocuments sop ON sop.sop_id = tts.sop_id
         LEFT JOIN Attachments att ON att.attachment_id = tts.attachment_id
         WHERE tts.template_id = ?
         ORDER BY tts.stage_order ASC`
      ).bind(templateId).all();

      const stages = (stagesRows?.results || []).map(s => ({
        stage_id: s.stage_id,
        stage_name: s.stage_name || "",
        stage_order: s.stage_order,
        description: s.description || "",
        estimated_hours: Number(s.estimated_hours || 0),
        sop_id: s.sop_id || null,
        sop_title: s.sop_title || "",
        attachment_id: s.attachment_id || null,
        attachment_name: s.attachment_name || "",
        attachment_url: s.attachment_url || ""
      }));

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "查询成功",
        data: stages,
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // POST /internal/api/v1/task-templates/:id/stages - 为模板添加阶段
  if (method === "POST" && matchStages) {
    const templateId = parseId(matchStages[1]);
    if (!templateId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "模板ID无效", meta: { requestId } }, corsHeaders);
    }

    // 仅管理员可添加阶段
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "仅管理员可添加阶段", meta: { requestId } }, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "请求格式错误", meta: { requestId } }, corsHeaders);
    }

    const errors = [];
    const stageName = String(body?.stage_name || "").trim();
    const stageOrder = body?.stage_order ? parseInt(body.stage_order, 10) : null;
    const description = String(body?.description || "").trim();
    const estimatedHours = body?.estimated_hours ? parseFloat(body.estimated_hours) : null;
    const sopId = body?.sop_id ? parseInt(body.sop_id, 10) : null;
    const attachmentId = body?.attachment_id ? parseInt(body.attachment_id, 10) : null;

    // 验证
    if (!stageName) {
      errors.push({ field: "stage_name", message: "请输入任务名称" });
    }
    if (!stageOrder || stageOrder < 1) {
      errors.push({ field: "stage_order", message: "请输入有效的顺序" });
    }

    if (errors.length) {
      return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "输入有误", errors, meta: { requestId } }, corsHeaders);
    }

    try {
      // 检查模板是否存在
      const template = await env.DATABASE.prepare(
        "SELECT template_id FROM TaskTemplates WHERE template_id = ?"
      ).bind(templateId).first();

      if (!template) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "模板不存在", meta: { requestId } }, corsHeaders);
      }

      // 插入阶段
      const result = await env.DATABASE.prepare(
        `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours, sop_id, attachment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(templateId, stageName, stageOrder, description, estimatedHours, sopId, attachmentId).run();

      return jsonResponse(201, {
        ok: true,
        code: "CREATED",
        message: "任务已添加",
        data: { stage_id: result?.meta?.last_row_id },
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  // DELETE /internal/api/v1/task-templates/:templateId/stages/:stageId - 删除阶段
  const matchDeleteStage = path.match(/^\/internal\/api\/v1\/task-templates\/(\d+)\/stages\/(\d+)$/);
  if (method === "DELETE" && matchDeleteStage) {
    const templateId = parseId(matchDeleteStage[1]);
    const stageId = parseId(matchDeleteStage[2]);
    
    if (!templateId || !stageId) {
      return jsonResponse(400, { ok: false, code: "INVALID_ID", message: "ID无效", meta: { requestId } }, corsHeaders);
    }

    // 仅管理员可删除阶段
    if (!me.is_admin) {
      return jsonResponse(403, { ok: false, code: "FORBIDDEN", message: "仅管理员可删除阶段", meta: { requestId } }, corsHeaders);
    }

    try {
      // 检查阶段是否存在
      const stage = await env.DATABASE.prepare(
        "SELECT stage_id FROM TaskTemplateStages WHERE template_id = ? AND stage_id = ?"
      ).bind(templateId, stageId).first();

      if (!stage) {
        return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "任务不存在", meta: { requestId } }, corsHeaders);
      }

      // 删除阶段
      await env.DATABASE.prepare(
        "DELETE FROM TaskTemplateStages WHERE template_id = ? AND stage_id = ?"
      ).bind(templateId, stageId).run();

      return jsonResponse(200, {
        ok: true,
        code: "OK",
        message: "任务已删除",
        meta: { requestId }
      }, corsHeaders);

    } catch (err) {
      console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
      return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
    }
  }

  return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "路由不存在", meta: { requestId } }, corsHeaders);
}

