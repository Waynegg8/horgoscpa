#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
JSON 資料生成模組
負責生成和更新 JSON 資料檔案
"""

import os
import json
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from loguru import logger

from utils import read_json, write_json

class JsonGenerator:
    """JSON 資料生成器類"""
    
    def __init__(self, data_dir="assets/data"):
        """
        初始化 JSON 資料生成器
        
        Args:
            data_dir: 資料目錄
        """
        self.data_dir = Path(data_dir)
        
        # 確保目錄存在
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 資料檔案路徑
        self.blog_posts_file = self.data_dir / "blog-posts.json"
        self.blog_index_file = self.data_dir / "blog-index.json"
        self.categories_file = self.data_dir / "categories.json"
        self.tags_file = self.data_dir / "tags.json"
        self.series_file = self.data_dir / "series.json"
        self.settings_file = self.data_dir / "settings.json"
        self.latest_posts_file = self.data_dir / "latest-posts.json"  # 新增最新文章檔案路徑
        
        # 載入設定
        self.settings = self._load_settings()
        
        # 載入資料
        self.blog_posts = self._load_blog_posts()
        self.categories = self._load_categories()
        self.tags = self._load_tags()
    
    def _load_settings(self):
        """
        載入設定
        
        Returns:
            dict: 設定資料
        """
        # 預設設定
        default_settings = {
            "pagination": {
                "items_per_page": 10
            },
            "default_category": "tax",
            "default_image": "/assets/images/blog/default.jpg",
            "site_url": "https://www.horgoscpa.com",
            "latest_posts_count": 3  # 新增最新文章數量設定
        }
        
        # 如果設定檔不存在，建立預設設定
        if not self.settings_file.exists():
            write_json(self.settings_file, default_settings)
            return default_settings
        
        # 載入設定
        try:
            settings = read_json(self.settings_file)
            
            # 確保有最新文章數量設定
            if "latest_posts_count" not in settings:
                settings["latest_posts_count"] = 3
                write_json(self.settings_file, settings)
                
            logger.info(f"已載入設定: {self.settings_file}")
            return settings
        except Exception as e:
            logger.error(f"載入設定失敗: {e}，使用預設設定")
            write_json(self.settings_file, default_settings)
            return default_settings
    
    def _load_blog_posts(self):
        """
        載入部落格文章資料
        
        Returns:
            dict: 部落格文章資料
        """
        return read_json(self.blog_posts_file, default={"posts": []})
    
    def _load_categories(self):
        """
        載入分類資料
        
        Returns:
            dict: 分類資料
        """
        return read_json(self.categories_file, default={"categories": []})
    
    def _load_tags(self):
        """
        載入標籤資料
        
        Returns:
            dict: 標籤資料
        """
        return read_json(self.tags_file, default={"tags": []})
    
    def _scan_html_files(self):
        """
        掃描blog目錄中的所有HTML文件，提取文章信息
        
        Returns:
            list: 文章信息列表
        """
        blog_dir = Path("blog")
        if not blog_dir.exists():
            logger.warning(f"部落格目錄不存在: {blog_dir}")
            return []
        
        posts = []
        html_files = list(blog_dir.glob("**/*.html"))
        
        logger.info(f"找到 {len(html_files)} 個HTML文件")
        
        for html_file in html_files:
            try:
                # 從HTML文件提取文章信息
                post_info = self._extract_info_from_html(html_file)
                if post_info:
                    posts.append(post_info)
            except Exception as e:
                logger.error(f"處理HTML文件 {html_file} 時發生錯誤: {e}")
        
        logger.info(f"成功提取 {len(posts)} 篇文章信息")
        
        # 按發布日期排序（新到舊）
        posts.sort(key=lambda x: x["date"], reverse=True)
        
        return posts

    def _extract_info_from_html(self, html_file):
        """
        從HTML文件提取文章信息
        
        Args:
            html_file: HTML文件路徑
            
        Returns:
            dict: 文章信息字典，如果提取失敗則返回None
        """
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 使用BeautifulSoup解析HTML
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            
            # 提取META資訊
            title = soup.title.string.split(" | ")[0] if soup.title else ""
            
            # 提取META標籤信息
            meta_tags = {}
            for meta in soup.find_all('meta'):
                if meta.get('name') and meta.get('content'):
                    meta_tags[meta['name']] = meta['content']
            
            # 提取主要數據
            post_info = {
                "title": title,
                "url": html_file.stem,  # 使用文件名作為URL (不含.html)
                "date": meta_tags.get("date", ""),
                "summary": meta_tags.get("description", ""),
                "category": meta_tags.get("main-category-code", ""),
                "category_name": meta_tags.get("main-category", ""),
                "image": meta_tags.get("image-url", self.settings["default_image"]),
                "original_filename": meta_tags.get("original-filename", "")
            }
            
            # 處理系列文章信息
            if "series-name" in meta_tags and meta_tags["series-name"]:
                post_info["is_series"] = True
                post_info["series_name"] = meta_tags["series-name"]
                
                # 處理系列標識 (slug)
                if "series-slug" in meta_tags:
                    post_info["series_slug"] = meta_tags["series-slug"]
                else:
                    # 如果沒有提供series-slug，則從series-name生成
                    from utils import sanitize_filename
                    series_slug = sanitize_filename(post_info["series_name"].lower())
                    series_slug = series_slug.replace(" ", "-")
                    post_info["series_slug"] = series_slug
                
                # 處理集數
                if "series-episode" in meta_tags:
                    try:
                        post_info["episode"] = int(meta_tags["series-episode"])
                    except ValueError:
                        post_info["episode"] = 1
            else:
                post_info["is_series"] = False
            
            # 提取標籤信息 - 從article-tag類查找
            tags = []
            for tag_element in soup.select(".article-tag"):
                tag_name = tag_element.text.strip()
                tag_href = tag_element.get("href", "")
                tag_slug = ""
                
                # 從href提取標籤標識
                if tag_href:
                    import re
                    tag_match = re.search(r'tag=([^&]+)', tag_href)
                    if tag_match:
                        tag_slug = tag_match.group(1)
                
                if tag_name and tag_slug:
                    tags.append({"name": tag_name, "slug": tag_slug})
                elif tag_name:
                    # 如果沒有找到slug，則自動生成
                    from utils import sanitize_filename
                    tag_slug = sanitize_filename(tag_name.lower())
                    tag_slug = tag_slug.replace(" ", "-")
                    tags.append({"name": tag_name, "slug": tag_slug})
            
            post_info["tags"] = tags
            
            return post_info
        except Exception as e:
            logger.error(f"從HTML文件 {html_file} 提取信息時發生錯誤: {e}")
            return None
    
    def _filter_posts_by_date(self, posts, current_date=None):
        """
        按日期過濾文章
        
        Args:
            posts: 文章列表
            current_date: 當前日期，預設為今天
            
        Returns:
            list: 過濾後的文章列表
        """
        # 獲取當前日期
        if current_date is None:
            current_date = datetime.now().date()
        elif isinstance(current_date, str):
            current_date = datetime.strptime(current_date, "%Y-%m-%d").date()
        
        # 過濾文章
        filtered_posts = []
        for post in posts:
            try:
                post_date = datetime.strptime(post["date"], "%Y-%m-%d").date()
                if post_date <= current_date:
                    filtered_posts.append(post)
            except (ValueError, KeyError) as e:
                logger.warning(f"文章日期格式錯誤: {post.get('title', '')}, {e}")
        
        # 按日期排序（新到舊）
        filtered_posts.sort(key=lambda x: x["date"], reverse=True)
        
        return filtered_posts
    
    def _organize_posts_by_series(self, posts):
        """
        按系列組織文章
        
        Args:
            posts: 文章列表
            
        Returns:
            dict: 按系列組織的文章字典
        """
        series_dict = defaultdict(list)
        
        # 分組文章
        for post in posts:
            if post.get("is_series", False) and "series_slug" in post and "episode" in post:
                series_slug = post["series_slug"]
                series_dict[series_slug].append(post)
        
        # 組織系列信息
        series_info = {}
        for series_slug, series_posts in series_dict.items():
            # 按集數排序
            series_posts.sort(key=lambda x: x.get("episode", 0))
            
            # 獲取系列名稱
            series_name = None
            for post in series_posts:
                if "series_name" in post:
                    series_name = post["series_name"]
                    break
            
            # 如果沒有找到系列名稱，使用系列標識
            if not series_name:
                series_name = series_slug
            
            # 組織系列信息
            series_info[series_slug] = {
                "name": series_name,
                "slug": series_slug,
                "posts": series_posts,
                "count": len(series_posts),
                "latest": series_posts[0] if series_posts else None,
                "first_post_date": series_posts[-1]["date"] if series_posts else None,
                "latest_post_date": series_posts[0]["date"] if series_posts else None
            }
        
        return series_info
    
    def generate_latest_posts(self, current_date=None):
        """
        生成最新文章檔案 - 基於掃描結果而非舊數據
        
        Args:
            current_date: 當前日期，預設為今天
            
        Returns:
            dict: 最新文章資料
        """
        # 過濾可發布的文章 - 使用掃描的HTML數據
        filtered_posts = self._filter_posts_by_date(self.blog_posts["posts"], current_date)
        
        # 獲取最新文章數量設定
        latest_count = self.settings.get("latest_posts_count", 3)
        
        # 取得最新的幾篇文章
        latest_posts = filtered_posts[:latest_count] if filtered_posts else []
        
        # 提取精簡資訊，避免檔案過大
        latest_posts_data = []
        for post in latest_posts:
            latest_post = {
                "title": post.get("title", ""),
                "url": post.get("url", ""),
                "date": post.get("date", ""),
                "image": post.get("image", ""),
                "summary": post.get("summary", ""),
                "category": post.get("category", ""),
                "category_name": post.get("category_name", "")
            }
            
            # 如果是系列文章，添加系列資訊
            if post.get("is_series", False):
                latest_post["is_series"] = True
                latest_post["series_name"] = post.get("series_name", "")
                latest_post["series_slug"] = post.get("series_slug", "")
                latest_post["episode"] = post.get("episode", 0)
            
            latest_posts_data.append(latest_post)
        
        # 建立最新文章資料 - 完全重新生成
        latest_data = {
            "latest_posts": latest_posts_data,
            "count": len(latest_posts_data),
            "generated_time": datetime.now().isoformat()
        }
        
        # 儲存最新文章資料
        write_json(self.latest_posts_file, latest_data)
        logger.info(f"已生成最新文章資料: {self.latest_posts_file}，共 {len(latest_posts_data)} 篇")
        
        return latest_data
    
    def generate_blog_index(self, current_date=None):
        """
        生成部落格索引 - 基於掃描結果而非舊數據
        
        Args:
            current_date: 當前日期，預設為今天
            
        Returns:
            dict: 部落格索引資料
        """
        # 過濾可發布的文章
        filtered_posts = self._filter_posts_by_date(self.blog_posts["posts"], current_date)
        
        # 計算分頁信息
        items_per_page = self.settings["pagination"]["items_per_page"]
        total_posts = len(filtered_posts)
        total_pages = (total_posts + items_per_page - 1) // items_per_page
        
        # 組織系列文章
        series_info = self._organize_posts_by_series(filtered_posts)
        series_list = list(series_info.values())
        series_list.sort(key=lambda x: x["latest_post_date"], reverse=True)
        
        # 建立索引資料 - 完全重新生成
        index_data = {
            "posts": filtered_posts,
            "series": series_info,
            "series_list": series_list,
            "pagination": {
                "total_posts": total_posts,
                "total_pages": total_pages,
                "items_per_page": items_per_page
            },
            "categories": self.categories.get("categories", []),
            "tags": self.tags.get("tags", []),
            "generated_time": datetime.now().isoformat()
        }
        
        # 儲存索引資料
        write_json(self.blog_index_file, index_data)
        logger.info(f"已生成部落格索引: {self.blog_index_file}，共 {total_posts} 篇文章")
        
        return index_data
    
    def generate_series_json(self):
        """
        生成系列文章 JSON - 基於掃描結果而非舊數據
        
        Returns:
            dict: 系列文章資料
        """
        # 過濾可發布的文章 - 使用掃描的HTML數據
        filtered_posts = self._filter_posts_by_date(self.blog_posts["posts"])
        
        # 組織系列文章
        series_info = self._organize_posts_by_series(filtered_posts)
        series_list = list(series_info.values())
        series_list.sort(key=lambda x: x["latest_post_date"], reverse=True)
        
        # 建立系列文章資料 - 完全重新生成
        series_data = {
            "series": series_info,
            "series_list": series_list,
            "generated_time": datetime.now().isoformat()
        }
        
        # 儲存系列文章資料
        write_json(self.series_file, series_data)
        logger.info(f"已生成系列文章資料: {self.series_file}，共 {len(series_list)} 個系列")
        
        return series_data
    
    def update_blog_post(self, post_info):
        """
        更新或添加部落格文章資料
        
        Args:
            post_info: 文章信息字典
            
        Returns:
            bool: 是否更新成功
        """
        # 確保必要欄位存在
        required_fields = ["title", "url", "date"]
        for field in required_fields:
            if field not in post_info:
                logger.error(f"文章缺少必要欄位: {field}")
                return False
        
        # 確保有圖片
        if "image" not in post_info or not post_info["image"]:
            post_info["image"] = self.settings["default_image"]
        
        # 確保有摘要
        if "summary" not in post_info or not post_info["summary"]:
            # 從內容生成摘要
            if "content" in post_info and post_info["content"]:
                content = post_info["content"]
                summary = content[0] if isinstance(content, list) and len(content) > 0 else ""
                # 限制摘要長度
                if len(summary) > 200:
                    summary = summary[:197] + "..."
                post_info["summary"] = summary
            else:
                post_info["summary"] = post_info["title"]
        
        # 檢查文章是否已存在
        existing_post_index = None
        for i, post in enumerate(self.blog_posts["posts"]):
            if post.get("url") == post_info["url"]:
                existing_post_index = i
                break
        
        # 更新或添加文章
        if existing_post_index is not None:
            self.blog_posts["posts"][existing_post_index] = post_info
            logger.info(f"更新文章資料: {post_info['title']}")
        else:
            self.blog_posts["posts"].append(post_info)
            logger.info(f"添加文章資料: {post_info['title']}")
        
        # 儲存更新後的文章資料
        write_json(self.blog_posts_file, self.blog_posts)
        
        # 更新分類和標籤計數
        self._update_categories_count()
        self._update_tags_count()
        
        # 更新部落格索引
        self.generate_blog_index()
        
        # 更新最新文章資料
        self.generate_latest_posts()
        
        return True
    
    def _update_categories_count(self):
        """更新分類計數"""
        # 建立分類計數字典
        category_counts = defaultdict(int)
        
        # 統計分類使用情況
        for post in self.blog_posts["posts"]:
            category_slug = post.get("category")
            if category_slug:
                category_counts[category_slug] += 1
        
        # 更新分類計數
        for category in self.categories.get("categories", []):
            slug = category.get("slug")
            if slug:
                category["count"] = category_counts.get(slug, 0)
        
        # 儲存更新後的分類資料
        write_json(self.categories_file, self.categories)
        logger.info(f"已更新分類計數: {self.categories_file}")
    
    def _update_tags_count(self):
        """更新標籤計數"""
        # 建立標籤計數字典
        tag_counts = defaultdict(int)
        
        # 統計標籤使用情況
        for post in self.blog_posts["posts"]:
            for tag in post.get("tags", []):
                slug = tag.get("slug")
                if slug:
                    tag_counts[slug] += 1
        
        # 更新標籤計數
        for tag in self.tags.get("tags", []):
            slug = tag.get("slug")
            if slug:
                tag["count"] = tag_counts.get(slug, 0)
        
        # 儲存更新後的標籤資料
        write_json(self.tags_file, self.tags)
        logger.info(f"已更新標籤計數: {self.tags_file}")
    
    def generate_all_json(self, current_date=None):
        """
        生成所有 JSON 資料 - 徹底重寫，基於實際HTML文件掃描
        
        Args:
            current_date: 當前日期，預設為今天
            
        Returns:
            dict: 生成結果
        """
        logger.info("開始重新生成所有JSON數據...")
        
        # 先掃描所有HTML文件，提取文章信息
        all_posts = self._scan_html_files()
        logger.info(f"掃描到 {len(all_posts)} 篇文章")
        
        # 使用掃描結果覆蓋現有的blog_posts數據
        self.blog_posts = {"posts": all_posts}
        
        # 保存更新後的文章資料 - 這將完全替換舊有數據
        write_json(self.blog_posts_file, self.blog_posts)
        logger.info(f"已更新文章資料: {self.blog_posts_file}")
        
        # 更新分類和標籤計數 - 基於最新的掃描結果
        self._update_categories_count()
        self._update_tags_count()
        
        # 生成部落格索引 - 使用掃描的HTML文件數據
        blog_index = self.generate_blog_index(current_date)
        
        # 生成系列文章資料 - 使用掃描的HTML文件數據
        series_data = self.generate_series_json()
        
        # 生成最新文章資料 - 使用掃描的HTML文件數據
        latest_posts = self.generate_latest_posts(current_date)
        
        logger.info("所有JSON數據已重新生成")
        
        # 返回生成結果
        return {
            "blog_index": blog_index,
            "series_data": series_data,
            "latest_posts": latest_posts,
            "categories": self.categories,
            "tags": self.tags
        }
    
    def remove_post(self, post_url):
        """
        移除文章
        
        Args:
            post_url: 文章 URL
            
        Returns:
            bool: 是否移除成功
        """
        # 檢查文章是否存在
        for i, post in enumerate(self.blog_posts["posts"]):
            if post.get("url") == post_url:
                # 移除文章
                removed_post = self.blog_posts["posts"].pop(i)
                logger.info(f"移除文章: {removed_post.get('title', post_url)}")
                
                # 更新 JSON 資料
                write_json(self.blog_posts_file, self.blog_posts)
                self.generate_all_json()
                
                return True
        
        logger.warning(f"找不到要移除的文章: {post_url}")
        return False