/**
 * 路由管理器
 * 統一管理所有 API 路由
 */

import { jsonResponse } from '../utils.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

/**
 * 路由器類
 */
export class Router {
  constructor() {
    this.routes = {
      GET: new Map(),
      POST: new Map(),
      PUT: new Map(),
      DELETE: new Map(),
      PATCH: new Map(),
      OPTIONS: new Map()
    };
  }

  /**
   * 註冊 GET 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  get(path, handler) {
    this.routes.GET.set(path, handler);
    return this;
  }

  /**
   * 註冊 POST 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  post(path, handler) {
    this.routes.POST.set(path, handler);
    return this;
  }

  /**
   * 註冊 PUT 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  put(path, handler) {
    this.routes.PUT.set(path, handler);
    return this;
  }

  /**
   * 註冊 DELETE 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  delete(path, handler) {
    this.routes.DELETE.set(path, handler);
    return this;
  }

  /**
   * 註冊 PATCH 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  patch(path, handler) {
    this.routes.PATCH.set(path, handler);
    return this;
  }

  /**
   * 註冊 OPTIONS 路由
   * @param {string} path - 路徑
   * @param {Function} handler - 處理函數
   */
  options(path, handler) {
    this.routes.OPTIONS.set(path, handler);
    return this;
  }

  /**
   * 處理請求
   * @param {Request} request - HTTP 請求
   * @param {Object} env - 環境變數
   * @returns {Promise<Response>}
   */
  async handle(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    // 嘗試精確匹配
    const handler = this.routes[method]?.get(pathname);
    if (handler) {
      return handler(env, request);
    }

    // 嘗試參數匹配（如 /api/clients/123）
    const paramHandler = this._findParameterizedRoute(method, pathname);
    if (paramHandler) {
      const { handler, params } = paramHandler;
      request.params = params;
      return handler(env, request);
    }

    // 路由不存在
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `路由不存在: ${method} ${pathname}`
      }
    }, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * 查找參數化路由
   * @private
   */
  _findParameterizedRoute(method, pathname) {
    const routes = this.routes[method];
    if (!routes) return null;

    for (const [pattern, handler] of routes.entries()) {
      // 檢查是否包含參數（:id）
      if (!pattern.includes(':')) continue;

      const params = this._matchRoute(pattern, pathname);
      if (params) {
        return { handler, params };
      }
    }

    return null;
  }

  /**
   * 匹配路由並提取參數
   * @private
   */
  _matchRoute(pattern, pathname) {
    const patternParts = pattern.split('/');
    const pathnameParts = pathname.split('/');

    if (patternParts.length !== pathnameParts.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathnamePart = pathnameParts[i];

      if (patternPart.startsWith(':')) {
        // 參數部分
        const paramName = patternPart.slice(1);
        params[paramName] = pathnamePart;
      } else if (patternPart !== pathnamePart) {
        // 不匹配
        return null;
      }
    }

    return params;
  }

  /**
   * 批量註冊路由
   * @param {Array} routes - 路由配置數組
   */
  registerRoutes(routes) {
    routes.forEach(({ method, path, handler }) => {
      this[method.toLowerCase()](path, handler);
    });
    return this;
  }

  /**
   * 列出所有已註冊的路由
   */
  listRoutes() {
    const routes = [];
    
    for (const [method, routeMap] of Object.entries(this.routes)) {
      for (const path of routeMap.keys()) {
        routes.push({ method, path });
      }
    }
    
    return routes.sort((a, b) => {
      if (a.path < b.path) return -1;
      if (a.path > b.path) return 1;
      return 0;
    });
  }
}

export default Router;

