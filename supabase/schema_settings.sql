-- Recreate app_settings table with key-value structure and is_active flag
DROP TABLE IF EXISTS app_settings;

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read settings
CREATE POLICY "Everyone can read settings" ON app_settings
    FOR SELECT USING (true);

-- Policy: Admins can update settings
CREATE POLICY "Admins can update settings" ON app_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert initial values
INSERT INTO app_settings (key, value, is_active)
VALUES 
    ('zain_cash', '07800000000', true),
    ('fast_pay', '07500000000', true)
ON CONFLICT (key) DO NOTHING;
