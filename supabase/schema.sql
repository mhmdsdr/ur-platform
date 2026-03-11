-- 1. إنشاء جدول المهام إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  reward NUMERIC(15, 2) DEFAULT 3.00,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. تفعيل الحماية (RLS) للجدول ليكون آمناً
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 3. السماح لأي شخص برؤية المهام (قراءة فقط)
CREATE POLICY "Everyone can view tasks" ON tasks 
FOR SELECT USING (true);

-- 4. (اختياري) إضافة مهمة تجريبية للتجربة
INSERT INTO tasks (title, description, reward) 
VALUES ('مهمة تجريبية', 'قم بمتابعة حسابنا وارفق لقطة شاشة', 3.00)
ON CONFLICT DO NOTHING;