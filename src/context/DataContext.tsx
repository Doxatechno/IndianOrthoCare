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

type CustomerInput = Omit<Customer, 'id' | 'createdAt'>;
type EquipmentInput = Pick<Equipment, 'name' | 'modelNumber' | 'serialNumber' | 'customerId'>;
type TicketInput = Pick<InstallationTicket, 'equipmentId' | 'location' | 'remarks'>;
type AMCInput = { equipmentId: string; startDate: string; endDate: string; price: number };
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
  updatePMSchedule: (pmId: string, patch: PMUpdate) => Promise<void>;
  addTechnician: (input: TechnicianInput) => Promise<void>;
  updateTechnician: (id: string, patch: TechnicianUpdate) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const sb = supabase as any;

const today = () => new Date().toISOString().split('T')[0];

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
const requireRowsUpdated = async (query: any, subject: string) => {
  const { data, error } = await query.select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      `${subject} was not updated. You may not have permission to change it, or it no longer exists.`,
    );
  }
  return data;
};

const toCustomer = (row: any): Customer => ({
  id: row.id,
  name: row.name,
  contactPerson: row.contact_person,
  phone: row.phone,
  email: row.email,
  address: row.address,
  createdAt: row.created_at,
});

const toEquipment = (row: any): Equipment => ({
  id: row.id,
  name: row.name,
  modelNumber: row.model_number,
  serialNumber: row.serial_number,
  customerId: row.customer_id,
  customerName: row.customer_name,
  installationDate: row.installation_date,
  warrantyStartDate: row.warranty_start_date,
  warrantyEndDate: row.warranty_end_date,
});

const toTicket = (row: any): InstallationTicket => ({
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
});

const toAMC = (row: any): AMCContract => ({
  id: row.id,
  equipmentId: row.equipment_id,
  equipmentName: row.equipment_name,
  customerId: row.customer_id,
  customerName: row.customer_name,
  startDate: row.start_date,
  endDate: row.end_date,
  price: Number(row.price ?? 0),
  status: row.status,
});

const toPM = (row: any): PMSchedule => ({
  id: row.id,
  amcId: row.amc_id,
  equipmentId: row.equipment_id,
  equipmentName: row.equipment_name,
  customerName: row.customer_name,
  pmNumber: row.pm_number,
  plannedDate: row.planned_date,
  status: row.status,
  assignedTechnician: row.assigned_technician,
});

const toTechnician = (row: any): Technician => ({
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
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<InstallationTicket[]>([]);
  const [amcContracts, setAmcContracts] = useState<AMCContract[]>([]);
  const [pmSchedules, setPMSchedules] = useState<PMSchedule[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const loadAllData = useCallback(async () => {
    const [customersRes, equipmentRes, ticketsRes, amcRes, pmRes, techRes] = await Promise.all([
      sb.from('customers').select('*').order('id', { ascending: false }),
      sb.from('equipment').select('*').order('id', { ascending: false }),
      sb.from('tickets').select('*').order('id', { ascending: false }),
      sb.from('amc_contracts').select('*').order('id', { ascending: false }),
      sb.from('pm_schedules').select('*').order('id', { ascending: false }),
      sb.from('technicians').select('*').order('name', { ascending: true }),
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
    await requireRowsUpdated(
      sb
        .from('customers')
        .update({
          name: input.name,
          contact_person: input.contactPerson,
          phone: input.phone,
          email: input.email,
          address: input.address,
        })
        .eq('id', id),
      `Customer ${id}`,
    );

    await Promise.all([
      sb.from('equipment').update({ customer_name: input.name }).eq('customer_id', id),
      sb.from('tickets').update({ customer_name: input.name }).eq('customer_id', id),
      sb.from('amc_contracts').update({ customer_name: input.name }).eq('customer_id', id),
    ]);

    const relatedEquipmentIds = equipment.filter(e => e.customerId === id).map(e => e.id);
    if (relatedEquipmentIds.length > 0) {
      await sb.from('pm_schedules').update({ customer_name: input.name }).in('equipment_id', relatedEquipmentIds);
    }

    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, ...input } : c)));
    setEquipment(prev => prev.map(e => (e.customerId === id ? { ...e, customerName: input.name } : e)));
    setTickets(prev => prev.map(t => (t.customerId === id ? { ...t, customerName: input.name } : t)));
    setAmcContracts(prev => prev.map(a => (a.customerId === id ? { ...a, customerName: input.name } : a)));
    setPMSchedules(prev => prev.map(p => (relatedEquipmentIds.includes(p.equipmentId) ? { ...p, customerName: input.name } : p)));
  }, [equipment]);

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
        installation_date: null,
        warranty_start_date: null,
        warranty_end_date: null,
      })
      .select()
      .single();
    if (error) throw error;

    setEquipment(prev => [toEquipment(data), ...prev]);
  }, [customers]);

  const updateEquipment = useCallback(async (input: Equipment) => {
    const customer = customers.find(c => c.id === input.customerId);
    const customerName = customer?.name || input.customerName;

    await requireRowsUpdated(
      sb
        .from('equipment')
        .update({
          name: input.name,
          model_number: input.modelNumber,
          serial_number: input.serialNumber,
          customer_id: input.customerId,
          customer_name: customerName,
          installation_date: input.installationDate,
          warranty_start_date: input.warrantyStartDate,
          warranty_end_date: input.warrantyEndDate,
        })
        .eq('id', input.id),
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

    setEquipment(prev => prev.map(e => (e.id === input.id ? { ...input, customerName } : e)));
    setTickets(prev => prev.map(t => (t.equipmentId === input.id ? { ...t, equipmentName: input.name, customerId: input.customerId, customerName } : t)));
    setAmcContracts(prev => prev.map(a => (a.equipmentId === input.id ? { ...a, equipmentName: input.name, customerId: input.customerId, customerName } : a)));
    setPMSchedules(prev => prev.map(p => (p.equipmentId === input.id ? { ...p, equipmentName: input.name, customerName } : p)));
  }, [customers]);

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

    await requireRowsUpdated(
      sb.from('tickets').update(dbPatch).eq('id', ticketId),
      `Ticket ${ticketId}`,
    );

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
      })
      .select()
      .single();
    if (error) throw error;

    setAmcContracts(prev => [toAMC(data), ...prev]);
  }, [customers, equipment]);

  const updateAMCStatus = useCallback(async (amcId: string, status: AMCStatus) => {
    await requireRowsUpdated(
      sb.from('amc_contracts').update({ status }).eq('id', amcId),
      `Contract ${amcId}`,
    );

    setAmcContracts(prev => prev.map(a => (a.id === amcId ? { ...a, status } : a)));

    // Auto-generate 4 quarterly PM schedules when AMC payment is received
    if (status === 'Payment Received') {
      const amc = amcContracts.find(a => a.id === amcId);
      if (!amc) return;

      // Check if PMs already exist for this AMC
      const existingPMs = pmSchedules.filter(p => p.amcId === amcId);
      if (existingPMs.length > 0) return;

      const startDate = new Date(amc.startDate);
      const newPMs: PMSchedule[] = [];

      for (let i = 0; i < 4; i++) {
        const plannedDate = new Date(startDate);
        plannedDate.setMonth(plannedDate.getMonth() + (i * 3));
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

  const updatePMSchedule = useCallback(async (pmId: string, patch: PMUpdate) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.assignedTechnician !== undefined) dbPatch.assigned_technician = patch.assignedTechnician;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (Object.keys(dbPatch).length === 0) return;

    await requireRowsUpdated(
      sb.from('pm_schedules').update(dbPatch).eq('id', pmId),
      `PM schedule ${pmId}`,
    );

    setPMSchedules(prev => prev.map(p => (p.id === pmId ? { ...p, ...patch } : p)));

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

    await requireRowsUpdated(
      sb.from('technicians').update(dbPatch).eq('id', id),
      `Technician ${id}`,
    );

    setTechnicians(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

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
      updatePMSchedule,
      addTechnician,
      updateTechnician,
    }),
    [
      loading,
      loadError,
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
