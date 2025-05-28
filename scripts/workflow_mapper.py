#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
GitHub Actions工作流参数映射器 v3.0
解决GitHub Actions 10个参数限制问题
将4个分组参数映射为完整的10个功能标志
"""

import json
import os
from typing import Dict, List, Optional, Any
from loguru import logger

class WorkflowMapper:
    """GitHub Actions参数映射器"""
    
    def __init__(self, config_file: Optional[str] = None):
        """
        初始化映射器
        
        Args:
            config_file: 配置文件路径
        """
        self.config_file = config_file or "config/processing_config.json"
        self.config = self._load_config()
        
        # 🔧 核心：原有10个功能的完整映射
        self.original_functions = {
            'process_word': False,
            'update_json': False,
            'handle_deletion': False,
            'update_videos': False,
            'force_scan': False,
            'update_sitemap': False,
            'publish_scheduled': False,
            'update_dictionary': False,
            'validate_content': False,
            'use_enhanced_processor': False
        }
        
        logger.info("✅ GitHub Actions参数映射器v3.0已初始化")
    
    def _load_config(self) -> Dict:
        """加载配置文件"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.warning(f"配置文件不存在: {self.config_file}，使用默认配置")
                return self._get_default_config()
        except Exception as e:
            logger.error(f"加载配置失败: {e}，使用默认配置")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """获取默认配置"""
        return {
            "github_actions": {
                "workflow_mapping": {
                    "content_operations": {
                        "process_word": "处理Word文档",
                        "update_json": "更新JSON文件",
                        "validate_content": "验证内容",
                        "force_scan": "强制扫描HTML文章",
                        "all_content": "所有内容相关操作"
                    },
                    "maintenance_operations": {
                        "handle_deletion": "处理文章删除",
                        "update_sitemap": "更新站点地图",
                        "update_dictionary": "更新翻译字典",
                        "all_maintenance": "所有维护操作"
                    },
                    "media_publishing": {
                        "update_videos": "更新视频数据",
                        "publish_scheduled": "发布排程文章",
                        "all_media": "所有媒体操作"
                    },
                    "system_config": {
                        "basic_processor": "使用基础处理器",
                        "enhanced_processor": "使用增强处理器",
                        "strict_validation": "严格验证模式",
                        "force_mode": "强制处理模式"
                    }
                },
                "trigger_mappings": {
                    "schedule": {
                        "default_operations": {
                            "update_sitemap": True,
                            "update_dictionary": True,
                            "publish_scheduled": True
                        }
                    },
                    "push": {
                        "default_operations": {
                            "process_word": True,
                            "update_json": True,
                            "update_sitemap": True
                        }
                    },
                    "repository_dispatch": {
                        "action_mappings": {
                            "delete-article": {"handle_deletion": True},
                            "upload-article": {"process_word": True, "update_json": True},
                            "scan-articles": {"force_scan": True, "update_json": True},
                            "update-video": {"update_videos": True},
                            "update-sitemap": {"update_sitemap": True},
                            "publish-scheduled": {"publish_scheduled": True},
                            "update-dictionary": {"update_dictionary": True},
                            "validate-content": {"validate_content": True},
                            "intelligent-process": {
                                "process_word": True, 
                                "validate_content": True, 
                                "use_enhanced_processor": True
                            },
                            "maintenance-mode": {
                                "update_sitemap": True, 
                                "update_dictionary": True
                            }
                        }
                    }
                }
            }
        }
    
    def map_github_actions_inputs(self, 
                                 content_operations: str = "",
                                 maintenance_operations: str = "", 
                                 media_publishing: str = "",
                                 system_config: str = "",
                                 processing_scope: str = "",
                                 advanced_overrides: str = "",
                                 trigger_type: str = "",
                                 trigger_action: str = "") -> Dict[str, bool]:
        """
        将GitHub Actions的分组输入映射为原有的10个功能标志
        
        Args:
            content_operations: 内容处理操作（逗号分隔）
            maintenance_operations: 维护管理操作（逗号分隔）
            media_publishing: 媒体发布操作（逗号分隔）
            system_config: 系统配置（逗号分隔）
            processing_scope: 处理范围
            advanced_overrides: 高级覆盖选项（JSON字符串）
            trigger_type: 触发类型
            trigger_action: 触发动作
            
        Returns:
            Dict[str, bool]: 映射后的功能标志
        """
        logger.info("🔧 开始GitHub Actions参数映射...")
        
        # 初始化所有功能为False
        operations = self.original_functions.copy()
        
        # 🔧 第一步：解析分组操作
        operations.update(self._parse_content_operations(content_operations))
        operations.update(self._parse_maintenance_operations(maintenance_operations))
        operations.update(self._parse_media_publishing(media_publishing))
        operations.update(self._parse_system_config(system_config))
        
        # 🔧 第二步：处理处理范围
        operations.update(self._handle_processing_scope(processing_scope))
        
        # 🔧 第三步：应用高级覆盖
        operations.update(self._parse_advanced_overrides(advanced_overrides))
        
        # 🔧 第四步：智能触发条件适配
        operations.update(self._handle_trigger_conditions(trigger_type, trigger_action))
        
        # 🔧 第五步：逻辑一致性检查
        operations = self._ensure_logical_consistency(operations)
        
        # 输出映射结果
        enabled_ops = [k for k, v in operations.items() if v]
        logger.info(f"✅ 参数映射完成，启用的操作: {enabled_ops}")
        
        return operations
    
    def _parse_content_operations(self, content_operations: str) -> Dict[str, bool]:
        """解析内容处理操作"""
        operations = {}
        
        if not content_operations:
            return operations
        
        ops_list = [op.strip() for op in content_operations.split(',')]
        
        # 🔧 特殊处理：all_content
        if 'all_content' in ops_list:
            operations.update({
                'process_word': True,
                'update_json': True,
                'validate_content': True,
                'force_scan': True
            })
            logger.debug("启用所有内容操作")
        else:
            # 🔧 逐个映射
            mapping = {
                'process_word': 'process_word',
                'update_json': 'update_json', 
                'validate_content': 'validate_content',
                'force_scan': 'force_scan'
            }
            
            for op in ops_list:
                if op in mapping:
                    operations[mapping[op]] = True
                    logger.debug(f"启用内容操作: {op}")
        
        return operations
    
    def _parse_maintenance_operations(self, maintenance_operations: str) -> Dict[str, bool]:
        """解析维护管理操作"""
        operations = {}
        
        if not maintenance_operations or maintenance_operations == 'none':
            return operations
        
        ops_list = [op.strip() for op in maintenance_operations.split(',')]
        
        # 🔧 特殊处理：all_maintenance
        if 'all_maintenance' in ops_list:
            operations.update({
                'handle_deletion': True,
                'update_sitemap': True,
                'update_dictionary': True
            })
            logger.debug("启用所有维护操作")
        else:
            # 🔧 逐个映射
            mapping = {
                'handle_deletion': 'handle_deletion',
                'update_sitemap': 'update_sitemap',
                'update_dictionary': 'update_dictionary'
            }
            
            for op in ops_list:
                if op in mapping:
                    operations[mapping[op]] = True
                    logger.debug(f"启用维护操作: {op}")
        
        return operations
    
    def _parse_media_publishing(self, media_publishing: str) -> Dict[str, bool]:
        """解析媒体发布操作"""
        operations = {}
        
        if not media_publishing or media_publishing == 'none':
            return operations
        
        ops_list = [op.strip() for op in media_publishing.split(',')]
        
        # 🔧 特殊处理：all_media
        if 'all_media' in ops_list:
            operations.update({
                'update_videos': True,
                'publish_scheduled': True
            })
            logger.debug("启用所有媒体操作")
        else:
            # 🔧 逐个映射
            mapping = {
                'update_videos': 'update_videos',
                'publish_scheduled': 'publish_scheduled'
            }
            
            for op in ops_list:
                if op in mapping:
                    operations[mapping[op]] = True
                    logger.debug(f"启用媒体操作: {op}")
        
        return operations
    
    def _parse_system_config(self, system_config: str) -> Dict[str, bool]:
        """解析系统配置"""
        operations = {}
        
        if not system_config:
            return operations
        
        config_list = [config.strip() for config in system_config.split(',')]
        
        # 🔧 处理器类型
        if 'enhanced_processor' in config_list:
            operations['use_enhanced_processor'] = True
            logger.debug("启用增强处理器")
        elif 'basic_processor' in config_list:
            operations['use_enhanced_processor'] = False
            logger.debug("使用基础处理器")
        
        # 🔧 特殊模式
        if 'strict_validation' in config_list:
            operations['validate_content'] = True
            logger.debug("启用严格验证")
        
        if 'force_mode' in config_list:
            operations['force_scan'] = True
            logger.debug("启用强制模式")
        
        return operations
    
    def _handle_processing_scope(self, processing_scope: str) -> Dict[str, bool]:
        """处理处理范围"""
        operations = {}
        
        if processing_scope == 'force_all_ignore_cache':
            operations['force_scan'] = True
            logger.debug("启用强制处理忽略缓存")
        elif processing_scope == 'all_files':
            # 这个通过命令行参数处理，不需要特殊标志
            pass
        
        return operations
    
    def _parse_advanced_overrides(self, advanced_overrides: str) -> Dict[str, bool]:
        """解析高级覆盖选项"""
        operations = {}
        
        if not advanced_overrides.strip():
            return operations
        
        try:
            overrides = json.loads(advanced_overrides)
            logger.debug(f"解析高级覆盖选项: {overrides}")
            
            # 🔧 直接映射支持的覆盖
            for key, value in overrides.items():
                if key in self.original_functions and isinstance(value, bool):
                    operations[key] = value
                    logger.debug(f"高级覆盖: {key} = {value}")
                elif key == 'force_scan' and value:
                    operations['force_scan'] = True
                elif key == 'skip_video_check' and value:
                    operations['update_videos'] = False
            
        except json.JSONDecodeError:
            logger.warning(f"高级覆盖选项JSON格式错误: {advanced_overrides}")
        except Exception as e:
            logger.error(f"解析高级覆盖选项失败: {e}")
        
        return operations
    
    def _handle_trigger_conditions(self, trigger_type: str, trigger_action: str = "") -> Dict[str, bool]:
        """处理触发条件的智能适配"""
        operations = {}
        
        trigger_mappings = self.config.get('github_actions', {}).get('trigger_mappings', {})
        
        # 🔧 根据触发类型智能设置
        if trigger_type == 'schedule':
            # 定时任务：执行维护操作
            defaults = trigger_mappings.get('schedule', {}).get('default_operations', {})
            operations.update(defaults)
            logger.debug(f"定时触发，启用默认维护操作: {defaults}")
            
        elif trigger_type == 'push':
            # 推送触发：处理内容更新
            defaults = trigger_mappings.get('push', {}).get('default_operations', {})
            operations.update(defaults)
            logger.debug(f"推送触发，启用默认内容操作: {defaults}")
            
        elif trigger_type == 'repository_dispatch':
            # API触发：根据具体动作
            action_mappings = trigger_mappings.get('repository_dispatch', {}).get('action_mappings', {})
            if trigger_action in action_mappings:
                action_ops = action_mappings[trigger_action]
                operations.update(action_ops)
                logger.debug(f"API触发 {trigger_action}，启用操作: {action_ops}")
                
        elif trigger_type == 'delete':
            # 删除触发：处理文章删除
            operations['handle_deletion'] = True
            logger.debug("删除触发，启用删除处理")
        
        return operations
    
    def _ensure_logical_consistency(self, operations: Dict[str, bool]) -> Dict[str, bool]:
        """确保逻辑一致性"""
        # 🔧 依赖关系检查
        
        # 如果处理Word文档，通常需要更新JSON
        if operations.get('process_word') and not operations.get('update_json'):
            operations['update_json'] = True
            logger.debug("Word处理启用，自动启用JSON更新")
        
        # 如果有内容变更，通常需要更新站点地图
        if (operations.get('process_word') or operations.get('update_json')) and not operations.get('update_sitemap'):
            operations['update_sitemap'] = True
            logger.debug("内容变更检测，自动启用站点地图更新")
        
        # 如果启用增强处理器，建议启用验证
        if operations.get('use_enhanced_processor') and not operations.get('validate_content'):
            operations['validate_content'] = True
            logger.debug("增强处理器启用，自动启用内容验证")
        
        # 🔧 互斥关系检查
        # 目前没有互斥的操作
        
        return operations
    
    def generate_environment_variables(self, operations: Dict[str, bool]) -> Dict[str, str]:
        """生成环境变量格式的输出"""
        env_vars = {}
        
        for key, value in operations.items():
            env_key = key.upper()
            env_vars[env_key] = str(value).lower()
        
        return env_vars
    
    def generate_github_outputs(self, operations: Dict[str, bool]) -> List[str]:
        """生成GitHub Actions输出格式"""
        outputs = []
        
        for key, value in operations.items():
            outputs.append(f"{key}={str(value).lower()}")
        
        return outputs
    
    def validate_input_combinations(self, 
                                   content_operations: str,
                                   maintenance_operations: str,
                                   media_publishing: str,
                                   system_config: str) -> Dict[str, Any]:
        """验证输入组合的有效性"""
        validation_result = {
            'is_valid': True,
            'warnings': [],
            'errors': [],
            'suggestions': []
        }
        
        # 🔧 检查空配置
        all_empty = not any([
            content_operations.strip(),
            maintenance_operations.strip(),
            media_publishing.strip(),
            system_config.strip()
        ])
        
        if all_empty:
            validation_result['warnings'].append("所有操作组都为空，可能不会执行任何操作")
        
        # 🔧 检查冲突配置
        if 'basic_processor' in system_config and 'enhanced_processor' in system_config:
            validation_result['errors'].append("不能同时指定基础和增强处理器")
            validation_result['is_valid'] = False
        
        # 🔧 建议优化
        if 'process_word' in content_operations and 'validate_content' not in content_operations:
            validation_result['suggestions'].append("建议在Word处理时启用内容验证")
        
        if maintenance_operations == 'none' and media_publishing == 'none':
            validation_result['suggestions'].append("考虑启用一些维护操作以保持系统健康")
        
        return validation_result
    
    def get_operation_description(self, operation_key: str) -> str:
        """获取操作的描述"""
        descriptions = {
            'process_word': '处理Word文档，转换为HTML',
            'update_json': '更新博客JSON索引文件',
            'handle_deletion': '处理文章删除请求',
            'update_videos': '更新视频数据和索引',
            'force_scan': '强制扫描所有HTML文章',
            'update_sitemap': '更新网站站点地图',
            'publish_scheduled': '发布排程文章',
            'update_dictionary': '更新翻译字典',
            'validate_content': '执行内容完整性验证',
            'use_enhanced_processor': '使用v3.0增强处理器'
        }
        
        return descriptions.get(operation_key, f"操作: {operation_key}")
    
    def generate_execution_summary(self, operations: Dict[str, bool]) -> str:
        """生成执行摘要"""
        enabled_ops = [(k, v) for k, v in operations.items() if v]
        
        if not enabled_ops:
            return "❌ 没有启用任何操作"
        
        summary_lines = [
            f"✅ 将执行 {len(enabled_ops)} 个操作:",
            ""
        ]
        
        # 按功能分组显示
        content_ops = []
        maintenance_ops = []
        media_ops = []
        system_ops = []
        
        for op_key, _ in enabled_ops:
            if op_key in ['process_word', 'update_json', 'validate_content', 'force_scan']:
                content_ops.append(op_key)
            elif op_key in ['handle_deletion', 'update_sitemap', 'update_dictionary']:
                maintenance_ops.append(op_key)
            elif op_key in ['update_videos', 'publish_scheduled']:
                media_ops.append(op_key)
            else:
                system_ops.append(op_key)
        
        if content_ops:
            summary_lines.append("📝 内容处理:")
            for op in content_ops:
                summary_lines.append(f"  - {self.get_operation_description(op)}")
            summary_lines.append("")
        
        if maintenance_ops:
            summary_lines.append("🔧 维护管理:")
            for op in maintenance_ops:
                summary_lines.append(f"  - {self.get_operation_description(op)}")
            summary_lines.append("")
        
        if media_ops:
            summary_lines.append("🎬 媒体发布:")
            for op in media_ops:
                summary_lines.append(f"  - {self.get_operation_description(op)}")
            summary_lines.append("")
        
        if system_ops:
            summary_lines.append("⚙️ 系统配置:")
            for op in system_ops:
                summary_lines.append(f"  - {self.get_operation_description(op)}")
        
        return "\n".join(summary_lines)

# 测试和使用示例

def test_workflow_mapper():
    """测试工作流映射器"""
    mapper = WorkflowMapper()
    
    print("🧪 测试GitHub Actions参数映射...")
    
    # 🔧 测试用例1：完整内容处理流程
    test_case_1 = {
        'content_operations': 'process_word,update_json,validate_content',
        'maintenance_operations': 'update_sitemap',
        'media_publishing': 'none',
        'system_config': 'enhanced_processor',
        'processing_scope': 'auto_detect',
        'trigger_type': 'workflow_dispatch'
    }
    
    operations_1 = mapper.map_github_actions_inputs(**test_case_1)
    print(f"\n测试用例1结果: {operations_1}")
    print(mapper.generate_execution_summary(operations_1))
    
    # 🔧 测试用例2：维护模式
    test_case_2 = {
        'content_operations': 'force_scan,update_json',
        'maintenance_operations': 'all_maintenance',
        'media_publishing': 'publish_scheduled',
        'system_config': 'basic_processor',
        'trigger_type': 'schedule'
    }
    
    operations_2 = mapper.map_github_actions_inputs(**test_case_2)
    print(f"\n测试用例2结果: {operations_2}")
    
    # 🔧 测试高级覆盖
    test_case_3 = {
        'content_operations': 'process_word',
        'advanced_overrides': '{"force_scan": true, "validate_content": true}',
        'trigger_type': 'push'
    }
    
    operations_3 = mapper.map_github_actions_inputs(**test_case_3)
    print(f"\n测试用例3结果: {operations_3}")
    
    return True

if __name__ == "__main__":
    test_workflow_mapper()