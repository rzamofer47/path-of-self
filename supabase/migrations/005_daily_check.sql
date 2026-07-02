-- Campos de check diario + acciones de historial usadas por la app
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS daily_verified_at TIMESTAMPTZ;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS session_quality TEXT;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS session_quality_history TEXT;

ALTER TABLE history_logs DROP CONSTRAINT IF EXISTS history_logs_action_check;
ALTER TABLE history_logs ADD CONSTRAINT history_logs_action_check
  CHECK (action IN ('xp_gain', 'decay', 'create', 'daily_check', 'banish', 'reactivate'));
