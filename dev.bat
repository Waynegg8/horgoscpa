@echo off
echo ========================================
echo   启动 Cloudflare Workers 本地开发服务器
echo ========================================
echo.
echo 正在启动开发服务器...
echo 服务器将运行在: http://localhost:8787
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

cd cloudflare\worker-router
npx wrangler dev --remote --port 8787

