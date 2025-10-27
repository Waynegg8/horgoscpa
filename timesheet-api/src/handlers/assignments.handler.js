/**
 * Assignments Handler
 * 客户分配管理（如果有独立表）
 */
import { success, list } from '../utils/response.util.js';

export async function getAssignments(env, request) {
  // 简化版：从 client_services 获取分配信息
  const result = await env.DB.prepare(`
    SELECT 
      cs.id,
      cs.client_id,
      c.name as client_name,
      cs.assigned_user_id,
      cs.service_type
    FROM client_services cs
    JOIN clients c ON cs.client_id = c.id
    WHERE cs.is_active = 1
    ORDER BY c.name
  `).all();

  return list(result.results || []);
}

export async function createAssignment(env, request) {
  // 简化版：实际是创建 client_service
  return success({ message: '请使用 /api/client-services 端点' });
}

export default {
  getAssignments,
  createAssignment
};

