#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
文章管理模組
負責文章分類和標籤生成
"""

import os
import re
import json
from pathlib import Path
from collections import Counter
from loguru import logger

from utils import read_json, write_json

class ContentManager:
    """文章管理類"""
    
    def __init__(self, data_dir="assets/data"):
        """
        初始化文章管理器
        
        Args:
            data_dir: 資料目錄
        """
        self.data_dir = Path(data_dir)
        
        # 確保目錄存在
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 資料檔案路徑
        self.categories_file = self.data_dir / "categories.json"
        self.tags_file = self.data_dir / "tags.json"
        self.blog_posts_file = self.data_dir / "blog-posts.json"
        
        # 載入分類和標籤資料
        self.categories = self._load_categories()
        self.tags = self._load_tags()
        self.blog_posts = self._load_blog_posts()
        
        # 載入關鍵詞字典 (用於分類和標籤判斷)
        self.keyword_dict = self._load_keyword_dict()
    
    def _load_categories(self):
        """
        載入分類資料
        
        Returns:
            dict: 分類資料
        """
        categories = read_json(self.categories_file, default={"categories": []})
        if "categories" not in categories:
            categories["categories"] = []
        return categories
    
    def _load_tags(self):
        """
        載入標籤資料
        
        Returns:
            dict: 標籤資料
        """
        tags = read_json(self.tags_file, default={"tags": []})
        if "tags" not in tags:
            tags["tags"] = []
        return tags
    
    def _load_blog_posts(self):
        """
        載入文章資料
        
        Returns:
            dict: 文章資料
        """
        blog_posts = read_json(self.blog_posts_file, default={"posts": []})
        if "posts" not in blog_posts:
            blog_posts["posts"] = []
        return blog_posts
    
    def _load_keyword_dict(self):
        """
        載入關鍵詞字典
        
        Returns:
            dict: 關鍵詞字典
        """
        # 關鍵詞字典檔案路徑
        keyword_dict_file = self.data_dir / "keyword_dict.json"
        default_dict_file = self.data_dir / "default_keywords.json"
        
        # 檢查是否存在關鍵詞字典檔案
        if not keyword_dict_file.exists():
            # 檢查是否存在預設關鍵詞字典檔案
            if not default_dict_file.exists():
                logger.error(f"未找到預設關鍵詞字典檔案: {default_dict_file}")
                raise FileNotFoundError(f"無法找到預設關鍵詞字典檔案: {default_dict_file}")
            
            # 使用預設關鍵詞字典檔案
            default_dict = read_json(default_dict_file)
            write_json(keyword_dict_file, default_dict)
            logger.info(f"已從預設檔案創建關鍵詞字典: {keyword_dict_file}")
            return default_dict
        
        # 載入關鍵詞字典
        try:
            keyword_dict = read_json(keyword_dict_file)
            logger.info(f"已載入關鍵詞字典: {keyword_dict_file}")
            return keyword_dict
        except Exception as e:
            # 如果讀取失敗但預設字典存在，則使用預設字典
            if default_dict_file.exists():
                logger.warning(f"載入關鍵詞字典失敗: {e}，使用預設字典")
                default_dict = read_json(default_dict_file)
                write_json(keyword_dict_file, default_dict)
                return default_dict
            else:
                # 如果預設字典也不存在，則拋出異常
                logger.error(f"載入關鍵詞字典失敗且預設字典不存在: {e}")
                raise
    
    def analyze_content(self, article_info):
        """
        分析文章內容
        
        Args:
            article_info: 文章信息字典
            
        Returns:
            dict: 包含分析結果的字典
        """
        # 合併標題和內容進行分析
        full_text = article_info["title"] + " "
        if "content" in article_info and article_info["content"]:
            full_text += " ".join(article_info["content"])
        
        # 創建分析結果字典
        analysis = {
            "word_count": len(full_text.split()),
            "keyword_matches": {},
            "category_scores": {},
            "tag_scores": {},
            "detected_keywords": []
        }
        
        # 分析分類關鍵詞
        for category_slug, category_data in self.keyword_dict["categories"].items():
            matches = []
            for keyword in category_data["keywords"]:
                count = full_text.lower().count(keyword.lower())
                if count > 0:
                    matches.append((keyword, count))
                    if keyword not in analysis["detected_keywords"]:
                        analysis["detected_keywords"].append(keyword)
            
            if matches:
                score = sum(count for _, count in matches)
                analysis["category_scores"][category_slug] = score
                analysis["keyword_matches"][category_slug] = matches
        
        # 分析標籤關鍵詞
        for tag_slug, tag_data in self.keyword_dict["tags"].items():
            matches = []
            for keyword in tag_data["keywords"]:
                count = full_text.lower().count(keyword.lower())
                if count > 0:
                    matches.append((keyword, count))
                    if keyword not in analysis["detected_keywords"]:
                        analysis["detected_keywords"].append(keyword)
            
            if matches:
                score = sum(count for _, count in matches)
                analysis["tag_scores"][tag_slug] = score
                analysis["keyword_matches"][tag_slug] = matches
        
        return analysis
    
    def determine_category(self, analysis, default_category="tax"):
        """
        根據分析結果判斷文章分類
        
        Args:
            analysis: 分析結果字典
            default_category: 預設分類
            
        Returns:
            dict: 分類信息
        """
        # 如果沒有匹配任何分類關鍵詞，使用預設分類
        if not analysis["category_scores"]:
            logger.info(f"沒有匹配到分類關鍵詞，使用預設分類: {default_category}")
            return {
                "slug": default_category,
                "name": self.keyword_dict["categories"][default_category]["name"]
            }
        
        # 找出得分最高的分類
        best_category = max(analysis["category_scores"].items(), key=lambda x: x[1])
        category_slug = best_category[0]
        
        return {
            "slug": category_slug,
            "name": self.keyword_dict["categories"][category_slug]["name"]
        }
    
    def generate_tags(self, analysis, max_tags=3):
        """
        根據分析結果生成標籤
        
        Args:
            analysis: 分析結果字典
            max_tags: 最大標籤數量
            
        Returns:
            list: 標籤列表
        """
        # 如果沒有匹配任何標籤關鍵詞，返回空列表
        if not analysis["tag_scores"]:
            logger.info("沒有匹配到標籤關鍵詞")
            return []
        
        # 按得分排序標籤
        sorted_tags = sorted(analysis["tag_scores"].items(), key=lambda x: x[1], reverse=True)
        
        # 選擇得分最高的標籤
        tags = []
        for tag_slug, _ in sorted_tags[:max_tags]:
            tags.append({
                "slug": tag_slug,
                "name": self.keyword_dict["tags"][tag_slug]["name"]
            })
        
        return tags
    
    def get_series_tags(self, series_name, series_slug):
        """
        獲取系列文章的標籤
        
        Args:
            series_name: 系列名稱
            series_slug: 系列標識
            
        Returns:
            list: 標籤列表
        """
        # 查找相同系列的文章
        series_posts = []
        for post in self.blog_posts["posts"]:
            if post.get("is_series") and post.get("series_slug") == series_slug:
                series_posts.append(post)
        
        # 如果沒有找到系列文章，返回空列表
        if not series_posts:
            logger.info(f"沒有找到系列 '{series_name}' 的文章")
            return []
        
        # 統計標籤使用情況
        tag_counts = Counter()
        for post in series_posts:
            for tag in post.get("tags", []):
                tag_counts[(tag["slug"], tag["name"])] += 1
        
        # 選擇最常用的標籤
        common_tags = []
        for (slug, name), _ in tag_counts.most_common(3):
            common_tags.append({"slug": slug, "name": name})
        
        return common_tags
    
    def process_article(self, article_info, force_category=None):
        """
        處理文章信息，生成分類和標籤
        
        Args:
            article_info: 文章信息字典
            force_category: 強制指定分類
            
        Returns:
            tuple: (更新後的文章信息, 分類, 標籤)
        """
        # 分析文章內容
        analysis = self.analyze_content(article_info)
        
        # 判斷分類
        if force_category:
            category = force_category
        else:
            category = self.determine_category(analysis)
        
        # 添加分類信息到文章
        article_info["category"] = category["slug"]
        article_info["category_name"] = category["name"]
        
        # 如果是系列文章，使用系列標籤
        if article_info.get("is_series", False):
            # 從系列名稱生成系列標識
            series_slug = article_info.get("series_slug", "")
            if not series_slug and "series_name" in article_info:
                from utils import sanitize_filename
                series_slug = sanitize_filename(article_info["series_name"].lower())
                series_slug = series_slug.replace(" ", "-")
                article_info["series_slug"] = series_slug
            
            # 獲取系列標籤
            tags = self.get_series_tags(article_info["series_name"], series_slug)
            
            # 如果系列沒有標籤，生成新標籤
            if not tags:
                tags = self.generate_tags(analysis)
        else:
            # 生成標籤
            tags = self.generate_tags(analysis)
        
        # 添加標籤到文章
        article_info["tags"] = tags
        
        return article_info, category, tags
    
    def update_category_counts(self):
        """更新分類計數"""
        # 重置計數
        for category in self.categories["categories"]:
            category["count"] = 0
            
        # 統計文章分類
        for post in self.blog_posts["posts"]:
            category_slug = post.get("category")
            if category_slug:
                for category in self.categories["categories"]:
                    if category["slug"] == category_slug:
                        category["count"] = category.get("count", 0) + 1
                        break
        
        # 保存更新後的分類資料
        write_json(self.categories_file, self.categories)
    
    def update_tag_counts(self):
        """更新標籤計數"""
        # 建立標籤計數字典
        tag_counts = {}
        
        # 統計標籤使用情況
        for post in self.blog_posts["posts"]:
            for tag in post.get("tags", []):
                slug = tag.get("slug")
                name = tag.get("name")
                if slug and name:
                    if slug not in tag_counts:
                        tag_counts[slug] = {"slug": slug, "name": name, "count": 0}
                    tag_counts[slug]["count"] += 1
        
        # 更新標籤列表
        self.tags["tags"] = list(tag_counts.values())
        
        # 保存更新後的標籤資料
        write_json(self.tags_file, self.tags)
    
    def update_blog_post(self, post_info):
        """
        更新或添加文章資料
        
        Args:
            post_info: 文章信息字典
            
        Returns:
            bool: 是否更新成功
        """
        # 確保文章有 URL
        if not post_info.get("url"):
            logger.error("文章缺少 URL")
            return False
        
        # 檢查文章是否已存在
        existing_post_index = None
        for i, post in enumerate(self.blog_posts["posts"]):
            if post.get("url") == post_info["url"]:
                existing_post_index = i
                break
        
        # 更新或添加文章
        if existing_post_index is not None:
            self.blog_posts["posts"][existing_post_index] = post_info
            logger.info(f"更新文章: {post_info['title']}")
        else:
            self.blog_posts["posts"].append(post_info)
            logger.info(f"添加文章: {post_info['title']}")
        
        # 保存更新後的文章資料
        write_json(self.blog_posts_file, self.blog_posts)
        
        # 更新分類和標籤計數
        self.update_category_counts()
        self.update_tag_counts()
        
        return True
    
    def get_series_info(self, series_slug):
        """
        獲取系列文章信息
        
        Args:
            series_slug: 系列標識
            
        Returns:
            dict: 系列文章信息
        """
        # 查找系列文章
        series_posts = []
        series_name = None
        
        for post in self.blog_posts["posts"]:
            if post.get("is_series") and post.get("series_slug") == series_slug:
                series_posts.append(post)
                if not series_name and "series_name" in post:
                    series_name = post["series_name"]
        
        if not series_posts:
            return None
        
        # 按集數排序
        series_posts.sort(key=lambda x: x.get("episode", 0))
        
        return {
            "slug": series_slug,
            "name": series_name,
            "posts": series_posts,
            "count": len(series_posts)
        }