import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  Customer,
  Equipment,
  InstallationTicket,
  TicketStatus,
  AMCContract,
  AMCStatus,
  PMSchedule,
  PMStatus,
  Technician,
} from '@/data/types';
import { supabase } from '@/integrations/supabase/client';
import { sb } from '@/integrations/supabase/untyped';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
type CustomerRow = Tables['customers']['Row'];
type EquipmentRow = Tables['equipment']['Row'];
type TicketRow = Tables['tickets']['Row'];
type AMCRow = Tables['amc_contracts']['Row'];
type PMRow = Tables['pm_schedules']['Row'];
type TechnicianRow = Tables['technicians']['Row'];

type CustomerInput = Omit<Customer, 'id' | 'createdAt'>;
type EquipmentInput = Pick<
  Equipment,
  'name' | 'modelNumber' | 'serialNumber' | 'customerId' | 'installationDate' | 'warrantyStartDate' | 'warrantyEndDate'
>;
type TicketInput = Pick<InstallationTicket, 'equipmentId' | 'location' | 'remarks'>;
type AMCInput = {
  equipmentId: string;
  startDate: string;
  endDate: string;
  price: number;
  coverage: AMCContract['coverage'];
  visitsPerYear: number;
  billing: AMCContract['billing'];
  /** Warranty end of the covered equipment, copied onto the contract row. */
  warrantyEndDate: string | null;
};
type TicketUpdate = Partial<Pick<InstallationTicket, 'assignedTechnician' | 'status' | 'completedDate'>>;
type PMUpdate = Partial<Pick<PMSchedule, 'assignedTechnician' | 'status'>>;
type TechnicianInput = Pick<Technician, 'name' | 'phone' | 'email' | 'specialization'>;
type TechnicianUpdate = Partial<Pick<Technician, 'name' | 'phone' | 'email' | 'specialization' | 'isActive'>>;

interface DataContextType {
  loading: boolean;
  /** Non-null when the last load from Supabase failed. */
  loadError: string | null;
  /** Re-fetch every table. Use instead of reloading the page. */
  refreshData: () => Promise<void>;
  /** Tables whose read hit the row cap, so the list on screen is incomplete. */
  truncated: string[];
  customers: Customer[];
  equipment: Equipment[];
  tickets: InstallationTicket[];
  amcContracts: AMCContract[];
  pmSchedules: PMSchedule[];
  technicians: Technician[];
  /**
   * Resolve a technician id (the value stored in `tickets.assigned_technician`
   * and `pm_schedules.assigned_technician`) to a display name.
   */
  technicianName: (id: string | null | undefined) => string;
  addCustomer: (input: CustomerInput) => Promise<void>;
  updateCustomer: (id: string, input: CustomerInput) => Promise<void>;
  addEquipment: (input: EquipmentInput) => Promise<void>;
  updateEquipment: (input: Equipment) => Promise<void>;
  addTicket: (input: TicketInput) => Promise<void>;
  updateTicket: (ticketId: string, patch: TicketUpdate) => Promise<void>;
  addAMCContract: (input: AMCInput) => Promise<void>;
  updateAMCStatus: (amcId: string, status: AMCStatus) => Promise<void>;
  /** Record the quoted price and move the contract to 'Quotation Sent' in one write. */
  setAMCQuotation: (amcId: string, price: number) => Promise<void>;
  updatePMSchedule: (pmId: string, patch: PMUpdate) => Promise<void>;
  addTechnician: (input: TechnicianInput) => Promise<void>;
  updateTechnician: (id: string, patch: TechnicianUpdate) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);


const today = () => new Date().toISOString().split('T')[0];

/**
 * Upper bound on rows fetched per table. The store loads whole tables, so
 * without a cap a growing installed base would eventually load and render
 * everything on every page view. When a cap is reached the UI says so rather
 * than quietly showing a truncated list as if it were complete.
 */
const MAX_ROWS_PER_TABLE = 2000;

/**
 * PostgREST answers an UPDATE whose rows RLS filtered out with 200 and an
 * empty body, so `error` is null and a denied write is indistinguishable from
 * a successful one - the UI would show a success toast and optimistically
 * render a state the database rejected. Ask for the affected rows back and
 * treat "none" as the failure it is.
 *
 * Only for updates targeting one known row. Cascading updates (e.g. renaming
 * a customer across their equipment) legitimately match zero rows.
 */
type UpdateQuery = { select: (columns: string) => Promise<{ data: unknown[] | null; error: unknown }> };

/**
 * Update one known row, refusing to overwrite a change someone else made in the
 * meantime. The caller passes the `row_version` it last saw; the update only
 * matches while the row still carries that version, and a trigger bumps the
 * version on every write.
 *
 * The version must be an integer, not `updated_at`. Postgres stores timestamptz
 * to microseconds but PostgREST serialises it to JSON at millisecond precision,
 * so a guard on the timestamp the client was given matches zero rows every
 * time - and since a filter miss comes back as 200 with an empty body, every
 * write looked like a concurrent-edit conflict. An integer round-trips exactly.
 *
 * Returns the row's new version, which the caller must store alongside its
 * optimistic state update. Without that, a second edit of the same record
 * before the next full reload would be guarded on the version the row had
 * before the first edit, and be refused as somebody else's change.
 */
const updateOneGuarded = async (
  table: string,
  id: string,
  patch: Record<string, unknown>,
  knownVersion: number | undefined,
  subject: string,
) => {
  let q = sb.from(table).update(patch).eq('id', id);
  if (knownVersion !== undefined && knownVersion !== null) q = q.eq('row_version', knownVersion);

  const { data, error } = await q.select('id, row_version');
  if (error) throw error;
  if (data && data.length > 0) {
    return (data[0] as { row_version?: number }).row_version;
  }

  // Nothing matched. Work out which of the two reasons it was, so the message is
  // actionable rather than a guess.
  if (knownVersion !== undefined && knownVersion !== null) {
    const { data: current } = await sb.from(table).select('row_version').eq('id', id).maybeSingle();
    if (current && current.row_version !== knownVersion) {
      throw new Error(
        `${subject} was changed by someone else while you were editing it. Reload to see the current version, then apply your change again.`,
      );
    }
  }
  throw new Error(
    `${subject} was not updated. You may not have permission to change it, or it no longer exists.`,
  );
};

const requireRowsUpdated = async (query: UpdateQuery, subject: string) => {
  const { data, error } = await query.select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      `${subject} was not updated. You may not have permission to change it, or it no longer exists.`,
    );
  }
  return data;
};

const toCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  name: row.name,
  contactPerson: row.contact_person,
  phone: row.phone,
  email: row.email,
  address: row.address,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  rowVersion: (row as { row_version?: number }).row_version,
});

const toEquipment = (row: EquipmentRow): Equipment => ({
  id: row.id,
  name: row.name,
  modelNumber: row.model_number,
  serialNumber: row.serial_number,
  customerId: row.customer_id,
  customerName: row.customer_name,
  installationDate: row.installation_date,
  warrantyStartDate: row.warranty_start_date,
  warrantyEndDate: row.warranty_end_date,
  updatedAt: row.updated_at,
  rowVersion: (row as { row_version?: number }).row_version,
});

const toTicket = (row: TicketRow): InstallationTicket => ({
  id: row.id,
  equipmentId: row.equipment_id,
  equipmentName: row.equipment_name,
  customerId: row.customer_id,
  customerName: row.customer_name,
  location: row.location,
  status: row.status,
  assignedTechnician: row.assigned_technician,
  remarks: row.remarks,
  issueType: row.issue_type,
  createdDate: row.created_date,
  completedDate: row.completed_date,
  updatedAt: row.updated_at,
  rowVersion: (row as { row_version?: number }).row_version,
});

const toAMC = (row: AMCRow): AMCContract => ({
  id: row.id,
  equipmentId: row.equipment_id,
  equipmentName: row.equipment_name,
  customerId: row.customer_id,
  customerName: row.customer_name,
  startDate: row.start_date,
  endDate: row.end_date,
  price: Number(row.price ?? 0),
  status: row.status,
  updatedAt: row.updated_at,
  rowVersion: (row as { row_version?: number }).row_version,
  coverage: (row as { coverage?: string }).coverage as AMCContract['coverage'] ?? 'AMC',
  visitsPerYear: (row as { visits_per_year?: number }).visits_per_year ?? 4,
  billing: (row as { billing?: string }).billing as AMCContract['billing'] ?? 'Annual',
  renewalDate: (row as { renewal_date?: string | null }).renewal_date ?? null,
});

const toPM = (row: PMRow): PMSchedule => ({
  id: row.id,
  amcId: row.amc_id,
  equipmentId: row.equipment_id,
  equipmentName: row.equipment_name,
  customerName: row.customer_name,
  pmNumber: row.pm_number,
  plannedDate: row.planned_date,
  status: row.status,
  assignedTechnician: row.assigned_technician,
  updatedAt: row.updated_at,
  rowVersion: (row as { row_version?: number }).row_version,
});

const toTechnician = (row: TechnicianRow): Technician => ({
  id: row.id,
  employeeCode: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  specialization: row.specialization,
  role: row.specialization?.includes('Head') ? 'Service Head' : row.specialization?.includes('Coordinator') ? 'Service Coordinator' : row.specialization?.includes('Sales') ? 'Sales and Service Engineer' : 'Service Engineer',
  reportingManager: '',
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  rowVersion: (row as { row_version?: number }).row_version,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<InstallationTicket[]>([]);
  const [amcContracts, setAmcContracts] = useState<AMCContract[]>([]);
  const [pmSchedules, setPMSchedules] = useState<PMSchedule[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const loadAllData = useCallback(async () => {
    const [customersRes, equipmentRes, ticketsRes, amcRes, pmRes, techRes] = await Promise.all([
      sb.from('customers').select('*').order('id', { ascending: false }).limit(MAX_ROWS_PER_TABLE),
      sb.from('equipment').select('*').order('id', { ascending: false }).limit(MAX_ROWS_PER_TABLE),
      sb.from('tickets').select('*').order('id', { ascending: false }).limit(MAX_ROWS_PER_TABLE),
      sb.from('amc_contracts').select('*').order('id', { ascending: false }).limit(MAX_ROWS_PER_TABLE),
      sb.from('pm_schedules').select('*').order('id', { ascending: false }).limit(MAX_ROWS_PER_TABLE),
      sb.from('technicians').select('*').order('name', { ascending: true }).limit(MAX_ROWS_PER_TABLE),
    ]);

    if (customersRes.error) throw customersRes.error;
    if (equipmentRes.error) throw equipmentRes.error;
    if (ticketsRes.error) throw ticketsRes.error;
    if (amcRes.error) throw amcRes.error;
    if (pmRes.error) throw pmRes.error;
    if (techRes.error) throw techRes.error;

    setCustomers((customersRes.data ?? []).map(toCustomer));
    setEquipment((equipmentRes.data ?? []).map(toEquipment));
    setTickets((ticketsRes.data ?? []).map(toTicket));
    setAmcContracts((amcRes.data ?? []).map(toAMC));
    setPMSchedules((pmRes.data ?? []).map(toPM));
    setTechnicians((techRes.data ?? []).map(toTechnician));

    // Tell the user plainly if any table was truncated, instead of presenting a
    // partial list as the whole picture.
    const capped = [
      ['customers', customersRes], ['equipment', equipmentRes], ['tickets', ticketsRes],
      ['AMC contracts', amcRes], ['PM schedules', pmRes], ['technicians', techRes],
    ].filter(([, res]) => ((res as { data?: unknown[] }).data?.length ?? 0) >= MAX_ROWS_PER_TABLE)
     .map(([name]) => name as string);
    setTruncated(capped);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadAllData();
        if (mounted) setLoadError(null);
      } catch (error) {
        // Never substitute fabricated data for a failed load - an empty table
        // with a visible error is honest, demo rows pretending to be real are not.
        console.error('Failed loading data from Supabase:', error);
        if (mounted) setLoadError(error instanceof Error ? error.message : String(error));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    // Reload data whenever auth state changes so RLS-protected tables
    // (tickets, pm_schedules, technicians) re-fetch with the new JWT.
    // INITIAL_SESSION is included because that is the event fired when an
    // existing session is restored on a page load, which init() above may
    // have raced.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED'
      ) {
        loadAllData()
          .then(() => { if (mounted) setLoadError(null); })
          .catch(err => {
            console.error('Reload after auth change failed:', err);
            if (mounted) setLoadError(err instanceof Error ? err.message : String(err));
          });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadAllData]);

  const addCustomer = useCallback(async (input: CustomerInput) => {
    // The id comes from the column default, not from max(local state) + 1.
    const { data, error } = await sb
      .from('customers')
      .insert({
        name: input.name,
        contact_person: input.contactPerson,
        phone: input.phone,
        email: input.email,
        address: input.address,
        created_at: today(),
      })
      .select()
      .single();
    if (error) throw error;

    setCustomers(prev => [toCustomer(data), ...prev]);
  }, []);

  const updateCustomer = useCallback(async (id: string, input: CustomerInput) => {
    // One transaction server-side. This used to be four separate round trips
    // orchestrated here, so a failure part-way left the denormalised copies in
    // equipment / tickets / amc_contracts / pm_schedules inconsistent with no
    // way to roll back.
    const { error } = await sb.rpc('rename_customer', {
      _customer_id: id,
      _name: input.name,
      _contact_person: input.contactPerson,
      _phone: input.phone,
      _email: input.email,
      _address: input.address,
    });
    if (error) throw error;

    // Re-read rather than mirror the cascade by hand. The rename touches rows in
    // four other tables and bumps their row_version; patching the cached copies
    // locally would leave each of them holding a stale version, and the next
    // edit of any of them would be refused as somebody else's change.
    await loadAllData();
  }, [loadAllData]);

  const addEquipment = useCallback(async (input: EquipmentInput) => {
    const customer = customers.find(c => c.id === input.customerId);

    const { data, error } = await sb
      .from('equipment')
      .insert({
        name: input.name,
        model_number: input.modelNumber,
        serial_number: input.serialNumber,
        customer_id: input.customerId,
        customer_name: customer?.name || '',
        installation_date: input.installationDate ?? null,
        warranty_start_date: input.warrantyStartDate ?? null,
        warranty_end_date: input.warrantyEndDate ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    setEquipment(prev => [toEquipment(data), ...prev]);
  }, [customers]);

  const updateEquipment = useCallback(async (input: Equipment) => {
    const customer = customers.find(c => c.id === input.customerId);
    const customerName = customer?.name || input.customerName;

    await updateOneGuarded(
      'equipment',
      input.id,
      {
        name: input.name,
        model_number: input.modelNumber,
        serial_number: input.serialNumber,
        customer_id: input.customerId,
        customer_name: customerName,
        installation_date: input.installationDate,
        warranty_start_date: input.warrantyStartDate,
        warranty_end_date: input.warrantyEndDate,
      },
      input.rowVersion,
      `Equipment ${input.id}`,
    );

    await Promise.all([
      sb
        .from('tickets')
        .update({ equipment_name: input.name, customer_id: input.customerId, customer_name: customerName })
        .eq('equipment_id', input.id),
      sb
        .from('amc_contracts')
        .update({ equipment_name: input.name, customer_id: input.customerId, customer_name: customerName })
        .eq('equipment_id', input.id),
      sb
        .from('pm_schedules')
        .update({ equipment_name: input.name, customer_name: customerName })
        .eq('equipment_id', input.id),
    ]);

    // Same reason as updateCustomer: the cascade above bumps row_version on
    // every ticket, contract and PM visit for this equipment, so the cache has
    // to come from the database rather than be patched in place.
    await loadAllData();
  }, [customers, loadAllData]);

  const addTicket = useCallback(async (input: TicketInput) => {
    const selectedEquipment = equipment.find(e => e.id === input.equipmentId);
    const selectedCustomer = customers.find(c => c.id === selectedEquipment?.customerId);

    const { data, error } = await sb
      .from('tickets')
      .insert({
        equipment_id: input.equipmentId,
        equipment_name: selectedEquipment?.name || '',
        customer_id: selectedEquipment?.customerId || '',
        customer_name: selectedCustomer?.name || '',
        location: input.location,
        status: 'Pending',
        assigned_technician: null,
        remarks: input.remarks,
        issue_type: null,
        created_date: today(),
        completed_date: null,
      })
      .select()
      .single();
    if (error) throw error;

    setTickets(prev => [toTicket(data), ...prev]);
  }, [customers, equipment]);

  const updateTicket = useCallback(async (ticketId: string, patch: TicketUpdate) => {
    const current = tickets.find(t => t.id === ticketId);
    if (!current) return;

    const dbPatch: Record<string, unknown> = {};
    if (patch.assignedTechnician !== undefined) dbPatch.assigned_technician = patch.assignedTechnician;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.completedDate !== undefined) {
      dbPatch.completed_date = patch.completedDate;
    } else if (patch.status === 'Completed' && !current.completedDate) {
      dbPatch.completed_date = today();
    }

    if (Object.keys(dbPatch).length === 0) return;

    const newVersion = await updateOneGuarded('tickets', ticketId, dbPatch, current.rowVersion, `Ticket ${ticketId}`);

    setTickets(prev =>
      prev.map(t => {
        if (t.id !== ticketId) return t;
        const completedDate = patch.completedDate !== undefined
          ? patch.completedDate
          : patch.status === 'Completed' && !t.completedDate
            ? today()
            : t.completedDate;
        return {
          ...t,
          ...patch,
          completedDate,
          rowVersion: newVersion,
        };
      }),
    );
  }, [tickets]);

  const addAMCContract = useCallback(async (input: AMCInput) => {
    const selectedEquipment = equipment.find(e => e.id === input.equipmentId);
    const selectedCustomer = customers.find(c => c.id === selectedEquipment?.customerId);

    const { data, error } = await sb
      .from('amc_contracts')
      .insert({
        equipment_id: input.equipmentId,
        equipment_name: selectedEquipment?.name || '',
        customer_id: selectedEquipment?.customerId || '',
        customer_name: selectedCustomer?.name || '',
        start_date: input.startDate,
        end_date: input.endDate,
        price: input.price,
        status: 'Quotation Sent',
        coverage: input.coverage,
        visits_per_year: input.visitsPerYear,
        billing: input.billing,
        // The renewal report needs a date to work from; the day after expiry is
        // what the business already uses by hand.
        renewal_date: input.endDate,
        // Part of the insert, not a follow-up UPDATE. The page used to patch
        // this in afterwards by re-querying for "the newest contract on this
        // equipment", which picked the wrong row once a second contract
        // existed, and left the freshly cached row a version behind the
        // database - so the very next edit of the contract was reported as a
        // concurrent-edit conflict.
        warranty_end_date: input.warrantyEndDate,
      })
      .select()
      .single();
    if (error) throw error;

    setAmcContracts(prev => [toAMC(data), ...prev]);
  }, [customers, equipment]);

  const updateAMCStatus = useCallback(async (amcId: string, status: AMCStatus) => {
    const currentAMC = amcContracts.find(a => a.id === amcId);
    const newVersion = await updateOneGuarded(
      'amc_contracts', amcId, { status }, currentAMC?.rowVersion, `Contract ${amcId}`);

    setAmcContracts(prev => prev.map(a => (a.id === amcId ? { ...a, status, rowVersion: newVersion } : a)));

    // Auto-generate 4 quarterly PM schedules when AMC payment is received
    if (status === 'Payment Received') {
      const amc = amcContracts.find(a => a.id === amcId);
      if (!amc) return;

      // Check if PMs already exist for this AMC
      const existingPMs = pmSchedules.filter(p => p.amcId === amcId);
      if (existingPMs.length > 0) return;

      const startDate = new Date(amc.startDate);
      const newPMs: PMSchedule[] = [];

      // Honour the contract's own visit frequency instead of assuming four a
      // year. A contract set to 2 visits now generates two visits six months
      // apart, 12 generates monthly, and so on.
      const visits = Math.min(Math.max(amc.visitsPerYear || 4, 1), 12);
      const monthsBetween = 12 / visits;

      for (let i = 0; i < visits; i++) {
        const plannedDate = new Date(startDate);
        plannedDate.setMonth(plannedDate.getMonth() + Math.round(i * monthsBetween));
        const pmId = `PM-${amcId.replace('AMC-', '')}-Q${i + 1}`;

        const pm: PMSchedule = {
          id: pmId,
          amcId: amcId,
          equipmentId: amc.equipmentId,
          equipmentName: amc.equipmentName,
          customerName: amc.customerName,
          pmNumber: i + 1,
          plannedDate: plannedDate.toISOString().split('T')[0],
          status: 'Pending',
          assignedTechnician: null,
        };
        newPMs.push(pm);
      }

      const pmRows = newPMs.map(p => ({
        id: p.id,
        amc_id: p.amcId,
        equipment_id: p.equipmentId,
        equipment_name: p.equipmentName,
        customer_name: p.customerName,
        pm_number: p.pmNumber,
        planned_date: p.plannedDate,
        status: p.status,
        assigned_technician: p.assignedTechnician,
      }));

      const { error: pmError } = await sb.from('pm_schedules').insert(pmRows);
      if (pmError) {
        console.error('Failed to auto-generate PM schedules:', pmError);
      } else {
        setPMSchedules(prev => [...newPMs, ...prev]);
      }
    }
  }, [amcContracts, pmSchedules]);

  const setAMCQuotation = useCallback(async (amcId: string, price: number) => {
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('The quoted price must be zero or more.');
    }
    // One guarded write for both fields. The quotation screen used to patch the
    // price with a raw, unguarded update and then call updateAMCStatus: the
    // price write bumped row_version, so the status write that followed was
    // guarded on a version that no longer existed and was reported to the user
    // as a concurrent edit by somebody else.
    const current = amcContracts.find(a => a.id === amcId);
    const newVersion = await updateOneGuarded(
      'amc_contracts',
      amcId,
      { price, status: 'Quotation Sent' },
      current?.rowVersion,
      `Contract ${amcId}`,
    );
    setAmcContracts(prev =>
      prev.map(a => (a.id === amcId ? { ...a, price, status: 'Quotation Sent', rowVersion: newVersion } : a)),
    );
  }, [amcContracts]);

  const updatePMSchedule = useCallback(async (pmId: string, patch: PMUpdate) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.assignedTechnician !== undefined) dbPatch.assigned_technician = patch.assignedTechnician;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (Object.keys(dbPatch).length === 0) return;

    const currentPM = pmSchedules.find(p => p.id === pmId);
    const newVersion = await updateOneGuarded(
      'pm_schedules', pmId, dbPatch, currentPM?.rowVersion, `PM schedule ${pmId}`);

    setPMSchedules(prev => prev.map(p => (p.id === pmId ? { ...p, ...patch, rowVersion: newVersion } : p)));

    // Auto-create a ticket when a technician is assigned to a PM schedule.
    // Use a deterministic ticket ID derived from the PM ID (e.g. TK-PM-030-Q1)
    // so that rapid auto-assignment loops can't collide on a shared sequence,
    // and re-assigning the same PM upserts the same ticket instead of duplicating it.
    if (patch.assignedTechnician && patch.status === 'Assigned') {
      const pm = pmSchedules.find(p => p.id === pmId);
      if (!pm) return;

      const equip = equipment.find(e => e.id === pm.equipmentId);
      const customer = customers.find(c => c.id === equip?.customerId);

      const ticketId = `TK-${pm.id}`;
      const newTicket: InstallationTicket = {
        id: ticketId,
        equipmentId: pm.equipmentId,
        equipmentName: pm.equipmentName,
        customerId: equip?.customerId || '',
        customerName: pm.customerName,
        location: customer?.address || '',
        status: 'Assigned',
        assignedTechnician: patch.assignedTechnician,
        remarks: `PM ${pm.pmNumber} - Preventive Maintenance`,
        issueType: 'Preventive Maintenance',
        createdDate: today(),
        completedDate: null,
      };

      const { error: ticketError } = await sb.from('tickets').upsert({
        id: newTicket.id,
        equipment_id: newTicket.equipmentId,
        equipment_name: newTicket.equipmentName,
        customer_id: newTicket.customerId,
        customer_name: newTicket.customerName,
        location: newTicket.location,
        status: newTicket.status,
        assigned_technician: newTicket.assignedTechnician,
        remarks: newTicket.remarks,
        issue_type: newTicket.issueType,
        created_date: newTicket.createdDate,
        completed_date: newTicket.completedDate,
      }, { onConflict: 'id' });

      if (ticketError) {
        console.error('Failed to auto-create ticket for PM:', ticketError);
      } else {
        setTickets(prev => {
          const existing = prev.find(t => t.id === ticketId);
          if (existing) {
            return prev.map(t => (t.id === ticketId ? { ...t, ...newTicket } : t));
          }
          return [newTicket, ...prev];
        });
      }
    }
  }, [pmSchedules, equipment, customers]);

  const addTechnician = useCallback(async (input: TechnicianInput) => {
    const { data, error } = await sb
      .from('technicians')
      .insert({
        name: input.name,
        phone: input.phone,
        email: input.email,
        specialization: input.specialization,
        is_active: true,
        created_at: today(),
      })
      .select()
      .single();
    if (error) throw error;

    setTechnicians(prev =>
      [...prev, toTechnician(data)].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, []);

  const updateTechnician = useCallback(async (id: string, patch: TechnicianUpdate) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.email !== undefined) dbPatch.email = patch.email;
    if (patch.specialization !== undefined) dbPatch.specialization = patch.specialization;
    if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;
    if (Object.keys(dbPatch).length === 0) return;

    const currentTech = technicians.find(t => t.id === id);
    const newVersion = await updateOneGuarded(
      'technicians', id, dbPatch, currentTech?.rowVersion, `Technician ${id}`);

    setTechnicians(prev => prev.map(t => (t.id === id ? { ...t, ...patch, rowVersion: newVersion } : t)));
  }, [technicians]);

  const refreshData = useCallback(async () => {
    try {
      await loadAllData();
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [loadAllData]);

  const technicianNames = useMemo(
    () => new Map(technicians.map(t => [t.id, t.name])),
    [technicians],
  );

  const technicianName = useCallback(
    (id: string | null | undefined) => (id ? technicianNames.get(id) ?? id : ''),
    [technicianNames],
  );

  const value = useMemo(
    () => ({
      loading,
      loadError,
      truncated,
      refreshData,
      customers,
      equipment,
      tickets,
      amcContracts,
      pmSchedules,
      technicians,
      technicianName,
      addCustomer,
      updateCustomer,
      addEquipment,
      updateEquipment,
      addTicket,
      updateTicket,
      addAMCContract,
      updateAMCStatus,
      setAMCQuotation,
      updatePMSchedule,
      addTechnician,
      updateTechnician,
    }),
    [
      loading,
      loadError,
      truncated,
      refreshData,
      customers,
      equipment,
      tickets,
      amcContracts,
      pmSchedules,
      technicians,
      technicianName,
      addCustomer,
      updateCustomer,
      addEquipment,
      updateEquipment,
      addTicket,
      updateTicket,
      addAMCContract,
      updateAMCStatus,
      setAMCQuotation,
      updatePMSchedule,
      addTechnician,
      updateTechnician,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
