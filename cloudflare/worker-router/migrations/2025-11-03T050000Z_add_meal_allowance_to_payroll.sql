-- Add meal allowance field to MonthlyPayroll table
-- 誤餐費：平日加班超過1.5小時則給90元

ALTER TABLE MonthlyPayroll ADD COLUMN meal_allowance_cents INTEGER NOT NULL DEFAULT 0;

-- meal_allowance_cents 是從該月工時表計算得出
-- 規則：平日（非週末、非國定假日）加班超過1.5小時的天數 × 90元

