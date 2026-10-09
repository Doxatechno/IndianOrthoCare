export interface SyncSalesOrdersResult {
  ok: boolean;
  synced?: number;
  ms?: number;
  error?: string;
}

/** Pull the message out of a thrown value without resorting to `any`. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}
