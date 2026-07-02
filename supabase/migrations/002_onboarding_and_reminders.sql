-- Migración 002: respuestas del test + recordatorios de práctica
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS practice_frequency TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS focus_preference TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS retention_concern BOOLEAN;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS practice_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS practice_reminder_hour INTEGER NOT NULL DEFAULT 9;
