-- Progreso de nodos del usuario (backup en nube — SQLite local es fuente de verdad)
CREATE TABLE IF NOT EXISTS node_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  nivel INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  last_check_date TIMESTAMPTZ,
  streak_current INTEGER NOT NULL DEFAULT 0,
  streak_max INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, node_id)
);

-- Historial diario del Nen por usuario
CREATE TABLE IF NOT EXISTS nen_history_cloud (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  intensificacion NUMERIC NOT NULL DEFAULT 0,
  manipulacion NUMERIC NOT NULL DEFAULT 0,
  emision NUMERIC NOT NULL DEFAULT 0,
  materializacion NUMERIC NOT NULL DEFAULT 0,
  transformacion NUMERIC NOT NULL DEFAULT 0,
  especializacion NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, fecha)
);

ALTER TABLE node_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE nen_history_cloud ENABLE ROW LEVEL SECURITY;

CREATE POLICY "node_progress_select_own" ON node_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "node_progress_insert_own" ON node_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "node_progress_update_own" ON node_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "node_progress_delete_own" ON node_progress
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "nen_history_cloud_select_own" ON nen_history_cloud
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "nen_history_cloud_insert_own" ON nen_history_cloud
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "nen_history_cloud_update_own" ON nen_history_cloud
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "nen_history_cloud_delete_own" ON nen_history_cloud
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_node_progress_user ON node_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_nen_history_cloud_user ON nen_history_cloud(user_id);
