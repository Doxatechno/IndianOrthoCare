import { supabase } from './client';

/**
 * An untyped handle on the Supabase client.
 *
 * The generated types in ./types.ts predate the column defaults and the two
 * QR functions added in migrations 20261009122000 / 20261009123000 - for
 * example customers.Insert still marks `id` as required, and the RPCs are not
 * in the schema at all. Run `supabase gen types typescript` and remove this
 * module once they are current; the row mappers in DataContext are already
 * typed off the generated Row types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sb = supabase as any;
