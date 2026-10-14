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
  // supabase-js rejects with a plain PostgrestError ({ code, message, details,
  // hint }), which is not an Error instance. Reading only `instanceof Error`
  // meant every database error fell through to the generic fallback and the
  // real reason never reached the user.
  if (err && typeof err === 'object') {
    const o = err as { message?: unknown; details?: unknown; hint?: unknown };
    for (const field of [o.message, o.details, o.hint]) {
      if (typeof field === 'string' && field) return field;
    }
  }
  return fallback;
}

/**
 * Postgres raises constraint violations with messages that name the constraint
 * rather than the problem ("duplicate key value violates unique constraint
 * customers_name_unique_ci"). Translate the ones the UI can actually provoke
 * into something an operator can act on, and leave anything else untouched.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  customers_name_unique_ci: 'A customer with this name already exists. Check the customer list before adding a new one.',
  equipment_serial_unique_ci: 'This serial number is already registered against another equipment record.',
  amc_price_non_negative: 'The contract value cannot be negative.',
  amc_dates_ordered: 'The contract end date cannot be before its start date.',
  equipment_warranty_dates_ordered: 'The warranty end date cannot be before the warranty start date.',
  pm_number_positive: 'The PM visit number must be greater than zero.',
  customers_name_not_blank: 'Enter a customer name.',
  equipment_name_not_blank: 'Enter an equipment name.',
  technicians_name_not_blank: 'Enter the technician\'s name.',
  tickets_assigned_technician_fkey: 'That technician no longer exists. Pick another.',
  pm_schedules_assigned_technician_fkey: 'That technician no longer exists. Pick another.',
  equipment_customer_id_fkey: 'This customer still has equipment registered against them, so it cannot be removed.',
  tickets_equipment_id_fkey: 'This equipment still has service tickets against it, so it cannot be removed.',
};

/** Map a thrown value to a message worth showing, resolving constraint names. */
export function friendlyError(err: unknown, fallback = 'Something went wrong'): string {
  const raw = errorMessage(err, fallback);
  for (const [constraint, message] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (raw.includes(constraint)) return message;
  }
  return raw;
}
