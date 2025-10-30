import { jsonResponse, getCorsHeadersForRequest, getCookie, hashPasswordPBKDF2 } from "../utils.js";

export async function handleDevSeeding(request, env, requestId, path) {
	// 僅非 prod 可用
	if (env.APP_ENV === "prod") {
		return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } });
	}
	const corsHeaders = getCorsHeadersForRequest(request, env);

	// /internal/api/v1/admin/dev-debug-cookie
	if (path === "/internal/api/v1/admin/dev-debug-cookie") {
		const cookieName = String(env.SESSION_COOKIE_NAME || "session");
		const sid = getCookie(request, cookieName);
		let exists = null; let exp = null;
		if (sid && env.DATABASE) {
			const row = await env.DATABASE.prepare("SELECT id, expires_at FROM sessions WHERE id = ? LIMIT 1").bind(sid).first();
			exists = !!row;
			exp = row?.expires_at || null;
		}
		return jsonResponse(200, { ok:true, code:"OK", message:"成功", data:{ cookieName, sid, exists, exp }, meta:{ requestId } }, corsHeaders);
	}

	if (request.method.toUpperCase() !== "POST") {
		return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
	}

	// /internal/api/v1/admin/dev-seed-user
	if (path === "/internal/api/v1/admin/dev-seed-user") {
		let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
		const username = (body?.username || "").trim().toLowerCase();
		const name = (body?.name || "測試用戶").trim();
		const password = body?.password || "changeme";
		let email = (body?.email || "").trim();
		if (!username || !password) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"username/password 必填", meta:{ requestId } }, corsHeaders);
		}
		try {
			const exists = await env.DATABASE.prepare("SELECT user_id FROM Users WHERE LOWER(username) = ? LIMIT 1").bind(username).first();
			if (!email) email = `${username}@example.com`;
			const passwordHash = await hashPasswordPBKDF2(password);
			if (exists) {
				await env.DATABASE.prepare("UPDATE Users SET username = ?, name = ?, email = ?, password_hash = ?, updated_at = ? WHERE user_id = ?").bind(username, name, email, passwordHash, new Date().toISOString(), exists.user_id).run();
			} else {
				await env.DATABASE.prepare("INSERT INTO Users (username, password_hash, name, email, gender, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, 'M', date('now'), datetime('now'), datetime('now'))").bind(username, passwordHash, name, email).run();
			}
			return jsonResponse(200, { ok:true, code:"OK", message:"已建立/更新測試用戶", data:{ username, email }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	// /internal/api/v1/admin/dev-seed-clients
	if (path === "/internal/api/v1/admin/dev-seed-clients") {
		try {
			await env.DATABASE.prepare("INSERT OR IGNORE INTO CustomerTags(tag_id, tag_name, tag_color) VALUES (1,'一般','#3b5bdb'),(2,'VIP','#ef4444')").run();
			const now = new Date().toISOString();
			await env.DATABASE.prepare(
				"INSERT OR IGNORE INTO Clients(client_id, company_name, tax_registration_number, assignee_user_id, phone, email, created_at, updated_at) VALUES " +
				"('c_001','星河資訊股份有限公司','12345678',1,'02-1234-5678','contact@galaxy.com',?,?)," +
				"('c_002','松柏有限公司','87654321',1,'02-8765-4321','service@pine.com',?,?)," +
				"('c_003','安和顧問股份有限公司','11223344',1,'02-5566-7788','info@anhe.com',?,?)"
			).bind(now, now, now, now, now, now).run();
			await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientTagAssignments(client_id, tag_id) VALUES ('c_001',1),('c_001',2),('c_002',2),('c_003',1)").run();
			return jsonResponse(200, { ok:true, code:"OK", message:"已建立測試客戶/標籤", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body);
		}
	}

	// /internal/api/v1/admin/dev-seed-tasks
	if (path === "/internal/api/v1/admin/dev-seed-tasks") {
		try {
			await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientServices(client_id, service_id, status) VALUES ('c_001',1,'active'),('c_002',1,'active'),('c_003',1,'active')").run();
			const cs1 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_001' LIMIT 1").first();
			const cs2 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_002' LIMIT 1").first();
			const cs3 = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_id='c_003' LIMIT 1").first();
			const today = new Date();
			const fmt = (d)=> new Date(today.getTime()+d*86400000).toISOString().slice(0,10);
			await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))").bind(cs1.client_service_id, '星河資訊 − 12 月記帳', fmt(2), 'pending', 1).run();
			await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))").bind(cs2.client_service_id, '松柏 − 12 月營業稅', fmt(-1), 'in_progress', 1).run();
			await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, task_name, due_date, status, assignee_user_id, created_at) VALUES (?,?,?,?,?,datetime('now'))").bind(cs3.client_service_id, '安和 − 年度結算', fmt(10), 'completed', 1).run();
			return jsonResponse(200, { ok: true, code: "OK", message: "已建立測試任務", meta: { requestId } });
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body);
		}
	}

	// /internal/api/v1/admin/dev-seed-timesheets
	if (path === "/internal/api/v1/admin/dev-seed-timesheets") {
		try {
			const today = new Date();
			const d = (off)=> new Date(today.getTime()+off*86400000).toISOString().slice(0,10);
			await env.DATABASE.prepare(
				"INSERT INTO Timesheets (user_id, work_date, client_id, service_name, work_type, hours, note) VALUES "+
				"(1, ?, 'c_001', '記帳', 'normal', 2.5, ''),"+
				"(1, ?, 'c_002', '營業稅', 'ot-weekday', 1.0, '加班'),"+
				"(1, ?, 'c_003', '結算', 'normal', 3.0, '整理')"
			).bind(d(-2), d(-1), d(0)).run();
			return jsonResponse(200, { ok:true, code:"OK", message:"已建立測試工時", meta:{ requestId } });
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } });
		}
	}

	// /internal/api/v1/admin/dev-seed-leaves
	if (path === "/internal/api/v1/admin/dev-seed-leaves") {
		try {
			const y = new Date().getFullYear();
			await env.DATABASE.prepare(
				"INSERT OR REPLACE INTO LeaveBalances(user_id, leave_type, year, total, used, remain, updated_at) VALUES "+
				"(1,'annual',?,30,3,27,datetime('now')),"+
				"(1,'sick',?,30,1,29,datetime('now')),"+
				"(1,'comp',?,24,16,8,datetime('now'))"
			).bind(y, y, y).run();
			await env.DATABASE.prepare(
				"INSERT INTO LeaveRequests (user_id, leave_type, start_date, end_date, unit, amount, reason, status, submitted_at) VALUES "+
				"(1,'annual',date('now','-10 day'),date('now','-10 day'),'day',1,'', 'approved', datetime('now','-10 day')),"+
				"(1,'sick',date('now','-25 day'),date('now','-25 day'),'half',0.5,'看醫生','approved', datetime('now','-25 day')),"+
				"(1,'comp',date('now','-5 day'),date('now','-5 day'),'hour',2,'加班補休','pending', datetime('now','-5 day'))"
			).run();
			return jsonResponse(200, { ok:true, code:"OK", message:"已建立假期餘額與申請資料", meta:{ requestId, year:y } });
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } });
		}
	}

	// /internal/api/v1/admin/dev-seed-receipts
	if (path === "/internal/api/v1/admin/dev-seed-receipts") {
		try {
			await env.DATABASE.prepare(
				"INSERT OR IGNORE INTO Receipts (receipt_id, client_id, receipt_date, due_date, total_amount, status, is_auto_generated, created_by) VALUES "+
				"('202510-001','c_001','2025-10-01','2025-10-31',12000,'paid',1,1),"+
				"('202510-002','c_002','2025-10-10','2025-10-30',8000,'unpaid',1,1),"+
				"('202509-003','c_003','2025-09-20','2025-10-05',5000,'unpaid',1,1)"
			).run();
			return jsonResponse(200, { ok:true, code:"OK", message:"已建立測試收據", meta:{ requestId } });
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } });
		}
	}

	return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}



