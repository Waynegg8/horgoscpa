/**
 * 驗證工具函數
 * 提供統一的數據驗證方法
 */

import { ValidationError } from '../middleware/error.middleware.js';

/**
 * 驗證規則定義
 */
export const VALIDATION_RULES = {
  // 用戶名
  username: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: '用戶名必須是 3-50 個字符，只能包含字母、數字和下劃線'
  },
  
  // 密碼
  password: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    message: '密碼必須至少 8 個字符，包含大小寫字母和數字'
  },
  
  // Email
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '請輸入有效的電子郵件地址'
  },
  
  // 台灣電話
  phone: {
    pattern: /^09\d{8}$|^(0\d{1,3})\d{6,8}$/,
    message: '請輸入有效的台灣電話號碼'
  },
  
  // 統一編號
  taxId: {
    pattern: /^\d{8}$/,
    validator: validateTaiwanTaxId,
    message: '請輸入有效的統一編號'
  }
};

/**
 * 驗證台灣統一編號
 */
function validateTaiwanTaxId(taxId) {
  if (!/^\d{8}$/.test(taxId)) {
    return false;
  }
  
  const logic = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    const n = parseInt(taxId[i]) * logic[i];
    sum += Math.floor(n / 10) + (n % 10);
  }
  
  return sum % 10 === 0 || (taxId[6] === '7' && (sum + 1) % 10 === 0);
}

/**
 * 驗證器類
 */
export class Validator {
  constructor(data) {
    this.data = data;
    this.errors = {};
  }

  /**
   * 驗證必填欄位
   */
  required(field, message = null) {
    if (!this.data[field] || this.data[field] === '') {
      this.errors[field] = message || `欄位 ${field} 為必填`;
    }
    return this;
  }

  /**
   * 驗證字符串長度
   */
  length(field, min, max, message = null) {
    const value = this.data[field];
    if (value && (value.length < min || value.length > max)) {
      this.errors[field] = message || `欄位 ${field} 長度必須在 ${min}-${max} 之間`;
    }
    return this;
  }

  /**
   * 驗證正則表達式
   */
  pattern(field, pattern, message = null) {
    const value = this.data[field];
    if (value && !pattern.test(value)) {
      this.errors[field] = message || `欄位 ${field} 格式不正確`;
    }
    return this;
  }

  /**
   * 驗證數字範圍
   */
  range(field, min, max, message = null) {
    const value = this.data[field];
    if (value !== undefined && (value < min || value > max)) {
      this.errors[field] = message || `欄位 ${field} 必須在 ${min}-${max} 之間`;
    }
    return this;
  }

  /**
   * 驗證枚舉值
   */
  enum(field, allowedValues, message = null) {
    const value = this.data[field];
    if (value && !allowedValues.includes(value)) {
      this.errors[field] = message || `欄位 ${field} 必須是以下值之一：${allowedValues.join(', ')}`;
    }
    return this;
  }

  /**
   * 自定義驗證
   */
  custom(field, validator, message) {
    const value = this.data[field];
    if (value && !validator(value)) {
      this.errors[field] = message || `欄位 ${field} 驗證失敗`;
    }
    return this;
  }

  /**
   * 驗證 Email
   */
  email(field, message = null) {
    return this.pattern(field, VALIDATION_RULES.email.pattern, message || VALIDATION_RULES.email.message);
  }

  /**
   * 驗證台灣電話
   */
  taiwanPhone(field, message = null) {
    return this.pattern(field, VALIDATION_RULES.phone.pattern, message || VALIDATION_RULES.phone.message);
  }

  /**
   * 驗證統一編號
   */
  taiwanTaxId(field, message = null) {
    return this.custom(field, validateTaiwanTaxId, message || VALIDATION_RULES.taxId.message);
  }

  /**
   * 檢查是否有錯誤
   */
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }

  /**
   * 獲取錯誤
   */
  getErrors() {
    return this.errors;
  }

  /**
   * 抛出驗證錯誤
   */
  throwIfFailed() {
    if (this.hasErrors()) {
      throw new ValidationError('數據驗證失敗', this.errors);
    }
  }

  /**
   * 獲取驗證結果
   */
  getResult() {
    return {
      valid: !this.hasErrors(),
      errors: this.errors,
      data: this.data
    };
  }
}

/**
 * 創建驗證器
 * @param {Object} data - 要驗證的數據
 * @returns {Validator}
 */
export function validate(data) {
  return new Validator(data);
}

/**
 * 快速驗證（拋出錯誤）
 * @param {Object} data - 要驗證的數據
 * @param {Function} rules - 驗證規則函數
 */
export function validateOrThrow(data, rules) {
  const validator = new Validator(data);
  rules(validator);
  validator.throwIfFailed();
  return data;
}

export default {
  Validator,
  validate,
  validateOrThrow,
  VALIDATION_RULES,
  validateTaiwanTaxId
};

