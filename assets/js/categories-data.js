/**
 * categories-data.js - 霍爾果斯會計師事務所網站分類資料
 * 最後更新日期: 2025-05-15
 * 集中管理網站所有分類資料，便於維護和更新
 */

// 網站分類資料中央管理
const categoriesData = {
  // 影片分類
  videoCategories: [
    { id: "all", name: "全部影片" },
    { id: "tax", name: "稅務相關" },
    { id: "accounting", name: "會計記帳" },
    { id: "business", name: "企業經營" },
    { id: "tutorial", name: "操作教學" }
  ],
  
  // 部落格分類
  blogCategories: [
    { id: "all", name: "全部文章" },
    { id: "tax", name: "稅務相關" },
    { id: "accounting", name: "會計記帳" },
    { id: "business", name: "企業經營" },
    { id: "investment", name: "投資理財" },
    { id: "international", name: "跨境稅務" }
  ],
  
  // FAQ分類
  faqCategories: [
    { id: "all", name: "全部問題" },
    { id: "tax", name: "稅務相關" },
    { id: "accounting", name: "會計記帳" },
    { id: "business", name: "企業登記" },
    { id: "service", name: "服務流程" }
  ],
  
  // 初始統計資料（實際數量會由JavaScript動態計算）
  initialStats: {
    video: {
      "tax": 2,
      "accounting": 1,
      "business": 0,
      "tutorial": 1
    },
    blog: {
      "tax": 5,
      "accounting": 4,
      "business": 3,
      "investment": 2,
      "international": 1
    },
    faq: {
      "tax": 3,
      "accounting": 3,
      "business": 2,
      "service": 2
    }
  }
};

// 匯出資料，使其他檔案可以引用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = categoriesData;
}