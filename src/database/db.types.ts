export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface AppDatabase {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<T | null>;
  getAllAsync<T = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<T[]>;
  runAsync(sql: string, ...params: unknown[]): Promise<RunResult>;
}
