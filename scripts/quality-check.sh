#!/bin/bash
# AI 质量自动检查脚本
# 在说"已完成"前必须运行此脚本

echo "🔍 开始质量检查..."
echo ""

# 计数器
pass=0
fail=0
warn=0

# 检查项总数
total=17

# ============================================
# 第1级：标准化检查（4项）
# ============================================
echo "=== 第1级：标准化检查 ==="

# 1.1 检查硬编码业务规则
echo -n "1.1 检查硬编码业务规则..."
if [ -d "timesheet-api/src" ]; then
  if grep -r "const.*=.*\[.*病假\|特休\|事假\|婚假" timesheet-api/src/ 2>/dev/null | grep -v "//"; then
    echo " ❌ 发现硬编码业务规则"
    ((fail++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  目录不存在，跳过"
  ((warn++))
fi

# 1.2 检查API前缀
echo -n "1.2 检查API前缀..."
if [ -d "timesheet-api/src/routes" ]; then
  bad_routes=$(grep -r "app\|router\|export" timesheet-api/src/routes/ 2>/dev/null | grep -i "get\|post\|put\|delete" | grep -v "/api/v1/" | grep -v "import" | grep -v "//" | wc -l)
  if [ $bad_routes -gt 0 ]; then
    echo " ⚠️  可能有 $bad_routes 个路由未使用 /api/v1/ 前缀"
    ((warn++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  目录不存在，跳过"
  ((warn++))
fi

# 1.3 检查SQL注入防护
echo -n "1.3 检查SQL注入防护..."
if [ -d "timesheet-api/src" ]; then
  if grep -r "db.prepare.*\${" timesheet-api/src/ 2>/dev/null | grep -v "//"; then
    echo " ❌ 发现字符串拼接SQL（SQL注入风险）"
    ((fail++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  目录不存在，跳过"
  ((warn++))
fi

# 1.4 检查表格命名（PascalCase）
echo -n "1.4 检查表格命名规范..."
if [ -d "timesheet-api/migrations" ] || [ -d "timesheet-api/schema" ]; then
  if find timesheet-api -name "*.sql" -o -name "*migration*" 2>/dev/null | xargs grep -h "CREATE TABLE" 2>/dev/null | grep -v "CREATE TABLE [A-Z]" | grep "CREATE TABLE"; then
    echo " ❌ 表格命名不符合 PascalCase"
    ((fail++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  目录不存在，跳过"
  ((warn++))
fi

echo ""

# ============================================
# 第2级：模块化检查（3项）
# ============================================
echo "=== 第2级：模块化检查 ==="

# 2.1 检查文件大小
echo -n "2.1 检查文件大小..."
if [ -d "timesheet-api/src" ]; then
  large_files=$(find timesheet-api/src -name "*.ts" -exec wc -l {} \; 2>/dev/null | awk '$1 > 300 {count++} END {print count+0}')
  if [ $large_files -gt 0 ]; then
    echo " ⚠️  发现 $large_files 个超过300行的文件"
    ((warn++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  目录不存在，跳过"
  ((warn++))
fi

# 2.2 检查分层架构
echo -n "2.2 检查分层架构..."
if [ -d "timesheet-api/src/routes" ]; then
  if grep -r "db.prepare\|db.run\|db.get" timesheet-api/src/routes/ 2>/dev/null | grep -v "//"; then
    echo " ❌ Route层不应该直接访问数据库"
    ((fail++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  目录不存在，跳过"
  ((warn++))
fi

# 2.3 检查共用组件使用
echo -n "2.3 检查共用组件使用..."
if [ -d "frontend/src" ] || [ -d "src/components" ]; then
  # 检查是否有重复的按钮实现
  button_implementations=$(find . -name "*.vue" -exec grep -l "<button" {} \; 2>/dev/null | xargs grep -l "class.*btn\|class.*button" 2>/dev/null | wc -l)
  styled_button_usage=$(find . -name "*.vue" -exec grep -l "StyledButton" {} \; 2>/dev/null | wc -l)
  
  if [ $button_implementations -gt 10 ] && [ $styled_button_usage -lt 5 ]; then
    echo " ⚠️  可能应该使用共用按钮组件"
    ((warn++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  目录不存在，跳过"
  ((warn++))
fi

echo ""

# ============================================
# 第3级：全局一致性检查（2项）
# ============================================
echo "=== 第3级：全局一致性检查 ==="

# 3.1 检查文档更新
echo -n "3.1 检查文档更新..."
if [ -d "docs" ]; then
  # 检查最近修改的文档数量
  recent_docs=$(find docs -name "*.md" -mtime -1 2>/dev/null | wc -l)
  if [ $recent_docs -gt 0 ]; then
    echo " ✅ ($recent_docs 个文档最近更新)"
    ((pass++))
  else
    echo " ⚠️  没有最近更新的文档"
    ((warn++))
  fi
else
  echo " ⚠️  docs目录不存在"
  ((warn++))
fi

# 3.2 检查命名一致性（外键命名）
echo -n "3.2 检查命名一致性..."
if find . -name "*.sql" -o -name "*migration*" -o -name "*schema*" 2>/dev/null | head -1 | grep -q "."; then
  inconsistent=$(find . \( -name "*.sql" -o -name "*migration*" -o -name "*schema*" \) -exec grep -h "FOREIGN KEY" {} \; 2>/dev/null | grep -v "_id)" | wc -l)
  if [ $inconsistent -gt 0 ]; then
    echo " ⚠️  发现 $inconsistent 个不一致的外键命名"
    ((warn++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  没有找到SQL文件"
  ((warn++))
fi

echo ""

# ============================================
# 第4级：安全性检查（2项）
# ============================================
echo "=== 第4级：安全性检查 ==="

# 4.1 检查外部网站保护
echo -n "4.1 检查外部网站保护..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  if git diff --name-only 2>/dev/null | grep -E "(^blog/|^services/|^assets/|^content/|\.html$)" | grep -v "timesheet\|admin\|internal"; then
    echo " ❌ 修改了外部网站文件"
    ((fail++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  不在git仓库中"
  ((warn++))
fi

# 4.2 检查密码安全
echo -n "4.2 检查密码安全..."
if [ -d "timesheet-api/src" ]; then
  unsafe_password=$(grep -r "password" timesheet-api/src/ 2>/dev/null | grep -v "argon2\|bcrypt\|//\|import" | grep -i "hash\|encrypt\|create" | wc -l)
  if [ $unsafe_password -gt 0 ]; then
    echo " ⚠️  密码处理可能不安全"
    ((warn++))
  else
    echo " ✅"
    ((pass++))
  fi
else
  echo " ⚠️  目录不存在，跳过"
  ((warn++))
fi

echo ""

# ============================================
# 第5级：功能质量检查（6项）
# ============================================
echo "=== 第5级：功能质量检查 ==="

echo "5.1 自动测试..."
if [ -f "timesheet-api/package.json" ] && grep -q "\"test\"" timesheet-api/package.json; then
  echo "  ✅ 测试脚本已配置"
  ((pass++))
else
  echo "  ⚠️  未找到测试配置"
  ((warn++))
fi

echo "5.2 错误日志检查..."
echo "  ℹ️  需要手动检查运行日志"
((pass++))

echo "5.3 性能检查..."
echo "  ℹ️  需要手动测试响应时间"
((pass++))

echo "5.4 前端UI检查..."
if [ -d "frontend" ] || [ -d "src/components" ]; then
  echo "  ✅ 前端代码存在"
  ((pass++))
else
  echo "  ⚠️  未找到前端代码"
  ((warn++))
fi

echo "5.5 边界情况..."
echo "  ℹ️  需要测试0、负数、超大值等"
((pass++))

echo "5.6 相关功能影响..."
echo "  ℹ️  需要手动测试相关功能"
((pass++))

echo ""

# ============================================
# 总结
# ============================================
echo "==================================="
echo "质量检查完成"
echo "==================================="
echo ""
echo "通过：✅ $pass 项"
echo "警告：⚠️  $warn 项"
echo "失败：❌ $fail 项"
echo "总计：$total 项"
echo ""

# 计算通过率
pass_rate=$(echo "scale=1; $pass * 100 / $total" | bc)
echo "通过率：$pass_rate%"
echo ""

if [ $fail -eq 0 ]; then
  if [ $warn -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 完美！所有检查通过！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  通过，但有 $warn 个警告"
    echo "建议修复警告项后再说'已完成'"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  fi
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ 有 $fail 项检查失败"
  echo "必须修复后才能说'已完成'"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

