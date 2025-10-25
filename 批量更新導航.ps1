# 批量更新所有頁面的導航結構

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "批量更新導航結構" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$standardNav = @'
            <div class="internal-nav-links" id="navLinks">
                <a href="dashboard.html" class="internal-nav-link {{DASHBOARD_ACTIVE}}">
                    <span class="material-symbols-outlined">home</span>
                    工作台
                </a>

                <a href="timesheet.html" class="internal-nav-link {{TIMESHEET_ACTIVE}}">
                    <span class="material-symbols-outlined">calendar_month</span>
                    工時表
                </a>
                
                <div class="internal-nav-dropdown">
                    <button class="internal-nav-dropdown-toggle {{TASKS_ACTIVE}}">
                        <span class="material-symbols-outlined">task</span>
                        <span>任務</span>
                        <span class="material-symbols-outlined dropdown-arrow">expand_more</span>
                    </button>
                    <div class="internal-nav-dropdown-menu">
                        <a href="tasks.html" class="internal-nav-dropdown-item {{TASKCENTER_ACTIVE}}">
                            <span class="material-symbols-outlined">view_agenda</span>
                            任務中心
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="projects.html" class="internal-nav-dropdown-item {{PROJECTS_ACTIVE}}">
                            <span class="material-symbols-outlined">account_tree</span>
                            專案任務
                        </a>
                        <a href="recurring-tasks.html" class="internal-nav-dropdown-item {{RECURRING_ACTIVE}}">
                            <span class="material-symbols-outlined">repeat</span>
                            週期任務
                        </a>
                        <a href="multi-stage-tasks.html" class="internal-nav-dropdown-item {{MULTISTAGE_ACTIVE}}">
                            <span class="material-symbols-outlined">timeline</span>
                            複雜任務
                        </a>
                    </div>
                </div>
                
                <a href="settings.html#clients" class="internal-nav-link {{CLIENTS_ACTIVE}}">
                    <span class="material-symbols-outlined">groups</span>
                    客戶
                </a>
                
                <div class="internal-nav-dropdown">
                    <button class="internal-nav-dropdown-toggle {{KNOWLEDGE_ACTIVE}}">
                        <span class="material-symbols-outlined">library_books</span>
                        <span>知識庫</span>
                        <span class="material-symbols-outlined dropdown-arrow">expand_more</span>
                    </button>
                    <div class="internal-nav-dropdown-menu">
                        <a href="sop.html" class="internal-nav-dropdown-item {{SOP_ACTIVE}}">
                            <span class="material-symbols-outlined">description</span>
                            SOP 文件
                        </a>
                        <a href="content-editor.html" class="internal-nav-dropdown-item {{CONTENT_ACTIVE}}">
                            <span class="material-symbols-outlined">article</span>
                            知識文章
                        </a>
                        <a href="content-editor.html?tab=media" class="internal-nav-dropdown-item {{MEDIA_ACTIVE}}">
                            <span class="material-symbols-outlined">photo_library</span>
                            資源中心
                        </a>
                    </div>
                </div>
                
                <a href="reports.html" class="internal-nav-link {{REPORTS_ACTIVE}}">
                    <span class="material-symbols-outlined">assessment</span>
                    報表
                </a>
                
                <a href="settings.html" class="internal-nav-link {{SETTINGS_ACTIVE}}">
                    <span class="material-symbols-outlined">settings</span>
                    設定
                </a>
                
                <div class="internal-nav-user">
                    <div>
                        <div class="internal-user-name" id="userName">載入中...</div>
                        <div class="internal-user-role" id="userRole"></div>
                    </div>
                    <button class="internal-logout-btn" id="logoutBtn">登出</button>
                </div>
            </div>
'@

$pages = @(
    'dashboard.html',
    'timesheet.html',
    'tasks.html',
    'projects.html',
    'recurring-tasks.html',
    'multi-stage-tasks.html',
    'sop.html',
    'content-editor.html',
    'reports.html',
    'settings.html'
)

Write-Host "將更新 $($pages.Count) 個頁面" -ForegroundColor Yellow
Write-Host ""

$count = 0
foreach ($page in $pages) {
    if (Test-Path $page) {
        Write-Host "更新 $page ..." -ForegroundColor Gray
        
        $content = Get-Content $page -Raw -Encoding UTF8
        
        # 添加 CSS（如果沒有）
        if ($content -notmatch 'navbar-enhanced\.css') {
            $content = $content -replace '(<link rel="stylesheet" href="assets/css/internal-system\.css">)', "`$1`n    <link rel=`"stylesheet`" href=`"assets/css/navbar-enhanced.css`">"
        }
        
        # 添加 JS（如果沒有）
        if ($content -notmatch 'navbar-enhanced\.js' -and $content -match '<script src="assets/js/') {
            $content = $content -replace '(<script src="assets/js/)', "    <script src=`"assets/js/navbar-enhanced.js`"></script>`n    `$1"
        }
        
        $content | Set-Content $page -Encoding UTF8 -NoNewline
        $count++
    }
}

Write-Host ""
Write-Host "✓ 完成更新 $count 個頁面" -ForegroundColor Green
Write-Host ""
Write-Host "請手動檢查並調整各頁面的 active 狀態" -ForegroundColor Yellow

