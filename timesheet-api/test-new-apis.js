/**
 * 測試新增的API端點
 * 運行: node test-new-apis.js
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';

async function apiRequest(url, options = {}, token = null) {
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    const data = await response.json();
    return { status: response.status, data };
}

async function testAPIs() {
    console.log('='.repeat(60));
    console.log('API 端點測試');
    console.log('='.repeat(60));

    // 測試登入
    console.log('\n[測試 1] 登入...');
    const loginResult = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('登入狀態:', loginResult.status);
    
    if (loginResult.status !== 200) {
        console.log('✗ 登入失敗，無法繼續測試');
        return;
    }
    
    const token = loginResult.data.token;
    console.log('✓ 登入成功');

    // 測試週期性任務模板
    console.log('\n[測試 2] 獲取週期性任務模板...');
    const templatesResult = await apiRequest('/api/recurring-templates', { method: 'GET' }, token);
    console.log('狀態:', templatesResult.status);
    console.log('模板數量:', templatesResult.data.templates?.length || 0);
    if (templatesResult.status === 200 && templatesResult.data.templates) {
        console.log('✓ 模板列表:', templatesResult.data.templates.map(t => t.name).join(', '));
    }

    // 測試多階段任務模板
    console.log('\n[測試 3] 獲取多階段任務模板...');
    const multiStageTemplatesResult = await apiRequest('/api/multi-stage-templates', { method: 'GET' }, token);
    console.log('狀態:', multiStageTemplatesResult.status);
    console.log('模板數量:', multiStageTemplatesResult.data.templates?.length || 0);
    if (multiStageTemplatesResult.status === 200 && multiStageTemplatesResult.data.templates) {
        console.log('✓ 模板列表:');
        multiStageTemplatesResult.data.templates.forEach(t => {
            console.log(`  - ${t.name} (${t.total_stages}階段)`);
        });
    }

    // 測試獲取模板階段
    if (multiStageTemplatesResult.data.templates?.length > 0) {
        const templateId = multiStageTemplatesResult.data.templates[0].id;
        console.log(`\n[測試 4] 獲取模板 #${templateId} 的階段...`);
        const stagesResult = await apiRequest(`/api/multi-stage-templates/${templateId}/stages`, { method: 'GET' }, token);
        console.log('狀態:', stagesResult.status);
        console.log('階段數量:', stagesResult.data.stages?.length || 0);
        if (stagesResult.status === 200 && stagesResult.data.stages) {
            console.log('✓ 階段列表:');
            stagesResult.data.stages.forEach(s => {
                console.log(`  階段 ${s.stage_number}: ${s.stage_name}`);
            });
        }
    }

    // 測試創建客戶服務配置
    console.log('\n[測試 5] 創建客戶服務配置...');
    const serviceData = {
        client_name: '測試客戶',
        client_tax_id: '12345678',
        service_name: '月度記帳',
        service_category: '記帳',
        frequency: '每月',
        fee: 2000,
        estimated_hours: 4,
        monthly_schedule: {
            '1': true, '2': true, '3': true, '4': true,
            '5': true, '6': true, '7': true, '8': true,
            '9': true, '10': true, '11': true, '12': true
        },
        billing_timing: '每月',
        service_notes: '測試服務配置',
        assigned_to: '劉會計師'
    };
    
    const createServiceResult = await apiRequest('/api/services', {
        method: 'POST',
        body: JSON.stringify(serviceData)
    }, token);
    console.log('狀態:', createServiceResult.status);
    if (createServiceResult.status === 200) {
        console.log('✓ 服務配置創建成功，ID:', createServiceResult.data.id);
    }

    // 測試生成週期性任務
    console.log('\n[測試 6] 生成週期性任務...');
    const generateResult = await apiRequest('/api/tasks/recurring/generate', {
        method: 'POST',
        body: JSON.stringify({ year: 2025, month: 11 })
    }, token);
    console.log('狀態:', generateResult.status);
    if (generateResult.status === 200) {
        console.log('✓ 生成成功，任務數量:', generateResult.data.tasks_generated);
    }

    // 測試獲取週期性任務
    console.log('\n[測試 7] 獲取週期性任務...');
    const recurringTasksResult = await apiRequest('/api/tasks/recurring?year=2025&month=11', { method: 'GET' }, token);
    console.log('狀態:', recurringTasksResult.status);
    console.log('任務數量:', recurringTasksResult.data.tasks?.length || 0);
    if (recurringTasksResult.status === 200 && recurringTasksResult.data.tasks?.length > 0) {
        console.log('✓ 任務列表（前3項）:');
        recurringTasksResult.data.tasks.slice(0, 3).forEach(t => {
            console.log(`  - ${t.task_name} [${t.category}] - ${t.status}`);
        });
    }

    // 測試按類別統計
    console.log('\n[測試 8] 獲取任務統計...');
    const statsResult = await apiRequest('/api/tasks/recurring/stats?year=2025&month=11', { method: 'GET' }, token);
    console.log('狀態:', statsResult.status);
    if (statsResult.status === 200 && statsResult.data.stats) {
        console.log('✓ 統計數據:');
        statsResult.data.stats.forEach(stat => {
            console.log(`  ${stat.category} - ${stat.status}: ${stat.count} 項`);
        });
    }

    // 測試專案API（含類別）
    console.log('\n[測試 9] 獲取專案（按類別篩選）...');
    const projectsResult = await apiRequest('/api/projects?category=記帳', { method: 'GET' }, token);
    console.log('狀態:', projectsResult.status);
    console.log('專案數量:', projectsResult.data.data?.length || 0);

    console.log('\n' + '='.repeat(60));
    console.log('測試完成！');
    console.log('='.repeat(60));
}

// 運行測試
testAPIs().catch(error => {
    console.error('測試失敗:', error);
    process.exit(1);
});

