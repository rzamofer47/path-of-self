-- Permite borrar historial propio (reinicio total en la nube)
CREATE POLICY "history_delete_own" ON history_logs
  FOR DELETE USING (auth_id = auth.uid());
