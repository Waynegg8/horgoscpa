/**
 * categories-data.js - 霍爾果斯會計師事務所網站分類資料
 * 最後更新日期: 2025-05-16
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
  
  // 更新為實際數量
  initialStats: {
    video: {
      "tax": 5,
      "accounting": 3,
      "business": 2,
      "tutorial": 1
    },
    blog: {
      "tax": 45,
      "accounting": 1,
      "business": 10
    },
    faq: {
      "tax": 8,
      "accounting": 5,
      "business": 6,
      "service": 4
    }
  }
};

// 匯出資料，使其他檔案可以引用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = categoriesData;
}