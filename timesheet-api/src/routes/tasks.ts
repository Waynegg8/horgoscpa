/**
 * 任務管理 API 路由
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { TaskService } from '../services/TaskService';
import { TaskTemplateService } from '../services/TaskTemplateService';
import { ClientServiceManagementService } from '../services/ClientServiceManagementService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const tasks = new Hono<{ Bindings: Env }>();

// ==================== 任務模板管理 ====================

tasks.get('/task-templates', authMiddleware, async (c) => {
  const filters = { service_id: c.req.query('service_id') };
  const service = new TaskTemplateService(c.env.DB);
  const templates = await service.getTemplates(filters);
  return jsonResponse(c, successResponse(templates), 200);
});

tasks.post('/task-templates', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  const service = new TaskTemplateService(c.env.DB);
  const template = await service.createTemplate(data, user);
  return jsonResponse(c, successResponse(template), 201);
});

tasks.put('/task-templates/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const templateId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  const service = new TaskTemplateService(c.env.DB);
  const template = await service.updateTemplate(templateId, updates, user);
  return jsonResponse(c, successResponse(template), 200);
});

tasks.delete('/task-templates/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const templateId = parseInt(c.req.param('id'));
  const service = new TaskTemplateService(c.env.DB);
  await service.deleteTemplate(templateId, user);
  return jsonResponse(c, successResponse({ message: '模板已刪除' }), 200);
});

tasks.post('/task-templates/:id/copy', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const templateId = parseInt(c.req.param('id'));
  const { new_name } = await c.req.json();
  const service = new TaskTemplateService(c.env.DB);
  const template = await service.copyTemplate(templateId, new_name, user);
  return jsonResponse(c, successResponse(template), 201);
});

// ==================== 客戶服務管理 ====================

tasks.get('/client-services', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const filters = { client_id: c.req.query('client_id'), status: c.req.query('status') };
  const service = new ClientServiceManagementService(c.env.DB);
  const clientServices = await service.getClientServices(filters, user);
  return jsonResponse(c, successResponse(clientServices), 200);
});

tasks.post('/client-services', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  const service = new ClientServiceManagementService(c.env.DB);
  const clientService = await service.createClientService(data, user);
  return jsonResponse(c, successResponse(clientService), 201);
});

tasks.put('/client-services/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const serviceId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  const service = new ClientServiceManagementService(c.env.DB);
  const clientService = await service.updateClientService(serviceId, updates, user);
  return jsonResponse(c, successResponse(clientService), 200);
});

tasks.delete('/client-services/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const serviceId = parseInt(c.req.param('id'));
  const service = new ClientServiceManagementService(c.env.DB);
  await service.deleteClientService(serviceId, user);
  return jsonResponse(c, successResponse({ message: '客戶服務已刪除' }), 200);
});

tasks.get('/clients/:clientId/services', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const clientId = c.req.param('clientId');
  const service = new ClientServiceManagementService(c.env.DB);
  const services = await service.getClientServices(clientId, user);
  return jsonResponse(c, successResponse(services), 200);
});

tasks.get('/clients/:clientId/available-templates', authMiddleware, async (c) => {
  const clientId = c.req.param('clientId');
  const serviceId = c.req.query('service_id') ? parseInt(c.req.query('service_id')!) : undefined;
  const service = new ClientServiceManagementService(c.env.DB);
  const templates = await service.getAvailableTemplates(clientId, serviceId);
  return jsonResponse(c, successResponse(templates), 200);
});

// ==================== 任務進度追蹤 ====================

tasks.get('/tasks', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const filters = {
    status: c.req.query('status'),
    limit: parseInt(c.req.query('limit') || '50'),
    offset: parseInt(c.req.query('offset') || '0'),
  };
  const taskService = new TaskService(c.env.DB);
  const tasksList = await taskService.getTasks(filters, user);
  return jsonResponse(c, successResponse(tasksList), 200);
});

tasks.get('/tasks/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const taskId = parseInt(c.req.param('id'));
  const taskService = new TaskService(c.env.DB);
  const task = await taskService.getTaskById(taskId, user);
  return jsonResponse(c, successResponse(task), 200);
});

tasks.post('/tasks/:id/stages/:stageId/start', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const taskId = parseInt(c.req.param('id'));
  const stageId = parseInt(c.req.param('stageId'));
  const taskService = new TaskService(c.env.DB);
  const result = await taskService.startStage(taskId, stageId, user);
  return jsonResponse(c, successResponse(result), 200);
});

tasks.post('/tasks/:id/stages/:stageId/complete', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const taskId = parseInt(c.req.param('id'));
  const stageId = parseInt(c.req.param('stageId'));
  const taskService = new TaskService(c.env.DB);
  const result = await taskService.completeStage(taskId, stageId, user);
  return jsonResponse(c, successResponse(result), 200);
});

tasks.put('/tasks/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const taskId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  const taskService = new TaskService(c.env.DB);
  const task = await taskService.updateTask(taskId, updates, user);
  return jsonResponse(c, successResponse(task), 200);
});

/**
 * GET /api/v1/tasks/:id/sop
 * 查詢任務關聯的SOP（通用+客戶專屬）
 * ⚠️ 補充遺漏的 API
 */
tasks.get('/tasks/:id/sop', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const taskId = parseInt(c.req.param('id'));
  const taskService = new TaskService(c.env.DB);
  const sops = await taskService.getTaskSOPs(taskId, user);
  return jsonResponse(c, successResponse(sops), 200);
});

export default tasks;

