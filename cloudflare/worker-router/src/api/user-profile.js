import { jsonResponse, getCorsHeadersForRequest, hashPasswordPBKDF2, verifyPasswordPBKDF2 } from "../utils.js";

/**
 * 用户个人资料管理 API
 * 支持查看和更新个人资料、修改密码等功能
 */
export async function handleUserProfile(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	// GET /internal/api/v1/users/:id - 获取单个用户详情
	if (method === "GET" && path.match(/^\/internal\/api\/v1\/users\/\d+$/)) {
		const userId = parseInt(path.split("/")[5]);
		return await getUserProfile(env, me, userId, requestId, corsHeaders);
	}

	// PUT /internal/api/v1/users/:id/profile - 更新用户个人资料
	if (method === "PUT" && path.match(/^\/internal\/api\/v1\/users\/\d+\/profile$/)) {
		const userId = parseInt(path.split("/")[5]);
		return await updateUserProfile(request, env, me, userId, requestId, corsHeaders);
	}

	// POST /internal/api/v1/auth/change-password - 修改密码
	if (method === "POST" && path === "/internal/api/v1/auth/change-password") {
		return await changePassword(request, env, me, requestId, corsHeaders);
	}

	// POST /internal/api/v1/admin/users/:id/reset-password - 管理员重置密码
	if (method === "POST" && path.match(/^\/internal\/api\/v1\/admin\/users\/\d+\/reset-password$/)) {
		const userId = parseInt(path.split("/")[6]);
		return await resetUserPassword(request, env, me, userId, requestId, corsHeaders);
	}

	// POST /internal/api/v1/leaves/recalculate-balances/:userId - 重新计算假期余额
	if (method === "POST" && path.match(/^\/internal\/api\/v1\/leaves\/recalculate-balances\/\d+$/)) {
		const userId = parseInt(path.split("/")[6]);
		return await recalculateLeaveBalances(env, me, userId, requestId, corsHeaders);
	}

	return null; // 未匹配的路由
}

/**
 * 获取用户详情
 */
async function getUserProfile(env, me, userId, requestId, corsHeaders) {
	try {
		// 权限检查：只能查看自己的资料，或管理员可以查看任何人
		if (!me.is_admin && me.user_id !== userId) {
			return jsonResponse(403, {
				ok: false,
				code: "FORBIDDEN",
				message: "沒有權限查看此用戶資料",
				meta: { requestId }
			}, corsHeaders);
		}

		const user = await env.DATABASE.prepare(
			`SELECT user_id, username, name, email, is_admin, hire_date, gender, 
			        created_at, last_login
			 FROM Users 
			 WHERE user_id = ? AND is_deleted = 0`
		).bind(userId).first();

		if (!user) {
			return jsonResponse(404, {
				ok: false,
				code: "NOT_FOUND",
				message: "用戶不存在",
				meta: { requestId }
			}, corsHeaders);
		}

		const data = {
			user_id: user.user_id,
			username: user.username,
			name: user.name || user.username,
			email: user.email,
			is_admin: Boolean(user.is_admin),
			hire_date: user.hire_date || null,
			gender: user.gender || null,
			created_at: user.created_at,
			last_login: user.last_login
		};

		return jsonResponse(200, {
			ok: true,
			code: "SUCCESS",
			message: "查詢成功",
			data,
			meta: { requestId }
		}, corsHeaders);

	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: "getUserProfile", err: String(err) }));
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "伺服器錯誤",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 更新用户个人资料（到职日、性别）
 */
async function updateUserProfile(request, env, me, userId, requestId, corsHeaders) {
	try {
		// 权限检查：只能更新自己的资料，或管理员可以更新任何人
		if (!me.is_admin && me.user_id !== userId) {
			return jsonResponse(403, {
				ok: false,
				code: "FORBIDDEN",
				message: "沒有權限修改此用戶資料",
				meta: { requestId }
			}, corsHeaders);
		}

		const body = await request.json();
		const { hire_date, gender } = body;

		// 验证
		const errors = [];
		if (hire_date && !/^\d{4}-\d{2}-\d{2}$/.test(hire_date)) {
			errors.push({ field: "hire_date", message: "日期格式錯誤（應為 YYYY-MM-DD）" });
		}
		if (gender && !["male", "female"].includes(gender)) {
			errors.push({ field: "gender", message: "性別必須為 male 或 female" });
		}

		if (errors.length > 0) {
			return jsonResponse(422, {
				ok: false,
				code: "VALIDATION_ERROR",
				message: "輸入有誤",
				errors,
				meta: { requestId }
			}, corsHeaders);
		}

		// 检查用户是否存在
		const existing = await env.DATABASE.prepare(
			"SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0"
		).bind(userId).first();

		if (!existing) {
			return jsonResponse(404, {
				ok: false,
				code: "NOT_FOUND",
				message: "用戶不存在",
				meta: { requestId }
			}, corsHeaders);
		}

		// 更新资料
		const now = new Date().toISOString();
		const updates = [];
		const binds = [];

		if (hire_date !== undefined) {
			updates.push("hire_date = ?");
			binds.push(hire_date || null);
		}
		if (gender !== undefined) {
			updates.push("gender = ?");
			binds.push(gender || null);
		}

		if (updates.length > 0) {
			updates.push("updated_at = ?");
			binds.push(now);
			binds.push(userId);

			await env.DATABASE.prepare(
				`UPDATE Users SET ${updates.join(", ")} WHERE user_id = ?`
			).bind(...binds).run();
		}

		return jsonResponse(200, {
			ok: true,
			code: "SUCCESS",
			message: "更新成功",
			meta: { requestId }
		}, corsHeaders);

	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: "updateUserProfile", err: String(err) }));
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "伺服器錯誤",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 修改密码（需要提供当前密码）
 */
async function changePassword(request, env, me, requestId, corsHeaders) {
	try {
		const body = await request.json();
		const { current_password, new_password } = body;

		// 验证
		const errors = [];
		if (!current_password) {
			errors.push({ field: "current_password", message: "請輸入當前密碼" });
		}
		if (!new_password) {
			errors.push({ field: "new_password", message: "請輸入新密碼" });
		}
		if (new_password && new_password.length < 6) {
			errors.push({ field: "new_password", message: "密碼長度至少需要 6 個字元" });
		}

		if (errors.length > 0) {
			return jsonResponse(422, {
				ok: false,
				code: "VALIDATION_ERROR",
				message: "輸入有誤",
				errors,
				meta: { requestId }
			}, corsHeaders);
		}

		// 获取当前用户的密码哈希
		const user = await env.DATABASE.prepare(
			"SELECT password_hash FROM Users WHERE user_id = ? AND is_deleted = 0"
		).bind(me.user_id).first();

		if (!user) {
			return jsonResponse(404, {
				ok: false,
				code: "NOT_FOUND",
				message: "用戶不存在",
				meta: { requestId }
			}, corsHeaders);
		}

		// 验证当前密码
		const isValid = await verifyPasswordPBKDF2(current_password, user.password_hash);
		if (!isValid) {
			return jsonResponse(401, {
				ok: false,
				code: "UNAUTHORIZED",
				message: "當前密碼錯誤",
				meta: { requestId }
			}, corsHeaders);
		}

		// 生成新密码哈希
		const newHash = await hashPasswordPBKDF2(new_password);

		// 更新密码
		const now = new Date().toISOString();
		await env.DATABASE.prepare(
			"UPDATE Users SET password_hash = ?, updated_at = ? WHERE user_id = ?"
		).bind(newHash, now, me.user_id).run();

		return jsonResponse(200, {
			ok: true,
			code: "SUCCESS",
			message: "密碼修改成功",
			meta: { requestId }
		}, corsHeaders);

	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: "changePassword", err: String(err) }));
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "伺服器錯誤",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 管理员重置用户密码
 */
async function resetUserPassword(request, env, me, userId, requestId, corsHeaders) {
	try {
		// 权限检查：仅管理员
		if (!me.is_admin) {
			return jsonResponse(403, {
				ok: false,
				code: "FORBIDDEN",
				message: "此功能僅限管理員使用",
				meta: { requestId }
			}, corsHeaders);
		}

		const body = await request.json();
		const { new_password } = body;

		// 验证
		const errors = [];
		if (!new_password) {
			errors.push({ field: "new_password", message: "請輸入新密碼" });
		}
		if (new_password && new_password.length < 6) {
			errors.push({ field: "new_password", message: "密碼長度至少需要 6 個字元" });
		}

		if (errors.length > 0) {
			return jsonResponse(422, {
				ok: false,
				code: "VALIDATION_ERROR",
				message: "輸入有誤",
				errors,
				meta: { requestId }
			}, corsHeaders);
		}

		// 检查用户是否存在
		const user = await env.DATABASE.prepare(
			"SELECT user_id, name FROM Users WHERE user_id = ? AND is_deleted = 0"
		).bind(userId).first();

		if (!user) {
			return jsonResponse(404, {
				ok: false,
				code: "NOT_FOUND",
				message: "用戶不存在",
				meta: { requestId }
			}, corsHeaders);
		}

		// 生成新密码哈希
		const newHash = await hashPasswordPBKDF2(new_password);

		// 更新密码
		const now = new Date().toISOString();
		await env.DATABASE.prepare(
			"UPDATE Users SET password_hash = ?, updated_at = ? WHERE user_id = ?"
		).bind(newHash, now, userId).run();

		return jsonResponse(200, {
			ok: true,
			code: "SUCCESS",
			message: `已重置 ${user.name} 的密碼`,
			meta: { requestId }
		}, corsHeaders);

	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: "resetUserPassword", err: String(err) }));
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "伺服器錯誤",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 重新计算用户的假期余额
 * 根据到职日和性别重新计算所有假期额度
 */
async function recalculateLeaveBalances(env, me, userId, requestId, corsHeaders) {
	try {
		// 权限检查：只能计算自己的，或管理员可以计算任何人
		if (!me.is_admin && me.user_id !== userId) {
			return jsonResponse(403, {
				ok: false,
				code: "FORBIDDEN",
				message: "沒有權限",
				meta: { requestId }
			}, corsHeaders);
		}

		// 获取用户信息
		const user = await env.DATABASE.prepare(
			"SELECT hire_date, gender FROM Users WHERE user_id = ? AND is_deleted = 0"
		).bind(userId).first();

		if (!user) {
			return jsonResponse(404, {
				ok: false,
				code: "NOT_FOUND",
				message: "用戶不存在",
				meta: { requestId }
			}, corsHeaders);
		}

		if (!user.hire_date) {
			return jsonResponse(422, {
				ok: false,
				code: "VALIDATION_ERROR",
				message: "用戶尚未設定到職日，無法計算假期額度",
				meta: { requestId }
			}, corsHeaders);
		}

		// 计算特休额度（根据到职日）
		const hireDate = new Date(user.hire_date);
		const today = new Date();
		const monthsWorked = (today.getFullYear() - hireDate.getFullYear()) * 12 + 
		                     (today.getMonth() - hireDate.getMonth());
		
		let annualLeaveDays = 0;
		if (monthsWorked >= 6 && monthsWorked < 12) {
			annualLeaveDays = 3; // 满6个月未满1年：3天
		} else if (monthsWorked >= 12) {
			const years = Math.floor(monthsWorked / 12);
			if (years < 1) annualLeaveDays = 3;
			else if (years === 1) annualLeaveDays = 7;
			else if (years === 2) annualLeaveDays = 10;
			else if (years >= 3 && years <= 5) annualLeaveDays = 14;
			else if (years >= 6 && years <= 10) annualLeaveDays = 15;
			else annualLeaveDays = 15 + Math.min(years - 10, 20); // 10年以上每年加1天，最多30天
		}

		// 更新或插入假期余额
		const now = new Date().toISOString();
		const currentYear = today.getFullYear();

		// 特休
		await env.DATABASE.prepare(
			`INSERT INTO LeaveBalances (user_id, leave_type, balance_days, balance_hours, year, created_at, updated_at)
			 VALUES (?, 'annual', ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id, leave_type, year) 
			 DO UPDATE SET balance_days = ?, balance_hours = ?, updated_at = ?`
		).bind(
			userId, annualLeaveDays, annualLeaveDays * 8, currentYear, now, now,
			annualLeaveDays, annualLeaveDays * 8, now
		).run();

		// 病假（固定30天）
		await env.DATABASE.prepare(
			`INSERT INTO LeaveBalances (user_id, leave_type, balance_days, balance_hours, year, created_at, updated_at)
			 VALUES (?, 'sick', 30, 240, ?, ?, ?)
			 ON CONFLICT(user_id, leave_type, year) 
			 DO UPDATE SET balance_days = 30, balance_hours = 240, updated_at = ?`
		).bind(userId, currentYear, now, now, now).run();

		// 事假（固定14天）
		await env.DATABASE.prepare(
			`INSERT INTO LeaveBalances (user_id, leave_type, balance_days, balance_hours, year, created_at, updated_at)
			 VALUES (?, 'personal', 14, 112, ?, ?, ?)
			 ON CONFLICT(user_id, leave_type, year) 
			 DO UPDATE SET balance_days = 14, balance_hours = 112, updated_at = ?`
		).bind(userId, currentYear, now, now, now).run();

		return jsonResponse(200, {
			ok: true,
			code: "SUCCESS",
			message: "假期額度已重新計算",
			data: {
				annual_leave: annualLeaveDays,
				sick_leave: 30,
				personal_leave: 14
			},
			meta: { requestId }
		}, corsHeaders);

	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: "recalculateLeaveBalances", err: String(err) }));
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "伺服器錯誤",
			meta: { requestId }
		}, corsHeaders);
	}
}

