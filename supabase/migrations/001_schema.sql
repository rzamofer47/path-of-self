-- Path of Self — Supabase schema (Fase 3)
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- Perfil de juego vinculado a auth.users
CREATE TABLE IF NOT EXISTS profiles (
  auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile TEXT NOT NULL DEFAULT 'adult',
  xp_gain_modifier REAL NOT NULL DEFAULT 1.0,
  decay_speed_modifier REAL NOT NULL DEFAULT 1.0,
  retention_shield BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  selected_skin TEXT NOT NULL DEFAULT 'rpg',
  tree_view_mode TEXT NOT NULL DEFAULT 'advanced',
  practice_frequency TEXT,
  focus_preference TEXT,
  retention_concern BOOLEAN,
  goal_type TEXT,
  practice_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  practice_reminder_hour INTEGER NOT NULL DEFAULT 9,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nodes (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('intellectual', 'physical')),
  layer TEXT NOT NULL DEFAULT 'custom' CHECK (layer IN ('custom', 'guide')),
  macro_area TEXT NOT NULL,
  xp REAL NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  pos_x REAL NOT NULL DEFAULT 0,
  pos_y REAL NOT NULL DEFAULT 0,
  last_practice_at TIMESTAMPTZ,
  weekly_xp_sessions INTEGER NOT NULL DEFAULT 0,
  week_start_at TIMESTAMPTZ,
  guide_url TEXT,
  parent_id BIGINT REFERENCES nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS history_logs (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id BIGINT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('xp_gain', 'decay', 'create')),
  amount REAL NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nodes_auth_id ON nodes(auth_id);
CREATE INDEX IF NOT EXISTS idx_history_auth_id ON history_logs(auth_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth_id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "nodes_select_own" ON nodes FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "nodes_insert_own" ON nodes FOR INSERT WITH CHECK (auth_id = auth.uid());
CREATE POLICY "nodes_update_own" ON nodes FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "nodes_delete_own" ON nodes FOR DELETE USING (auth_id = auth.uid());

CREATE POLICY "history_select_own" ON history_logs FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "history_insert_own" ON history_logs FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Habilitar auth anónimo en: Authentication → Providers → Anonymous sign-ins
