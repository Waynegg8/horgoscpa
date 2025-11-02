@echo off
echo ========================================
echo 推送API修复到生产环境
echo ========================================
cd /d C:\Users\miama\Desktop\horgoscpa
echo.
echo 当前目录: %CD%
echo.
echo [1/4] 添加文件到Git...
git add cloudflare/worker-router/src/api/client_services.js
git add tasks-new.html
echo.
echo [2/4] 提交更改...
git commit -m "修复client-services API字段名并美化新增任务页面"
echo.
echo [3/4] 推送到远程仓库...
git push
echo.
echo [4/4] 完成！
echo.
echo ========================================
echo 部署成功！请等待1-2分钟后刷新浏览器
echo ========================================
pause

