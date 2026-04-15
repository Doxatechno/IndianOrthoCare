import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  customers as seedCustomers,
  equipment as seedEquipment,
  tickets as seedTickets,
  amcContracts as seedAMCContracts,
  pmSchedules as seedPMSchedules,
  technicians as seedTechnicians,
  Customer,
  Equipment,
  InstallationTicket,
  TicketStatus,
  AMCContract,
  AMCStatus,
  PMSchedule,
  PMStatus,
  Technician,
} from '@/data/mockData';
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
  customers: Customer[];
  equipment: Equipment[];
  tickets: InstallationTicket[];
  amcContracts: AMCContract[];
  pmSchedules: PMSchedule[];
  technicians: Technician[];
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

const nextId = (ids: string[], prefix: string) => {
  const max = ids.reduce((acc, id) => {
    const n = Number(id.replace(prefix, ''));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<InstallationTicket[]>([]);
  const [amcContracts, setAmcContracts] = useState<AMCContract[]>([]);
  const [pmSchedules, setPMSchedules] = useState<PMSchedule[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const seedIfEmpty = useCallback(async () => {
    const { count, error } = await sb.from('customers').select('*', { count: 'exact', head: true });
    if (error) throw error;
    if ((count ?? 0) > 0) return;

    const customerRows = seedCustomers.map(c => ({
      id: c.id,
      name: c.name,
      contact_person: c.contactPerson,
      phone: c.phone,
      email: c.email,
      address: c.address,
      created_at: c.createdAt,
    }));
    const equipmentRows = seedEquipment.map(e => ({
      id: e.id,
      name: e.name,
      model_number: e.modelNumber,
      serial_number: e.serialNumber,
      customer_id: e.customerId,
      customer_name: e.customerName,
      installation_date: e.installationDate,
      warranty_start_date: e.warrantyStartDate,
      warranty_end_date: e.warrantyEndDate,
    }));
    const ticketRows = seedTickets.map(t => ({
      id: t.id,
      equipment_id: t.equipmentId,
      equipment_name: t.equipmentName,
      customer_id: t.customerId,
      customer_name: t.customerName,
      location: t.location,
      status: t.status,
      assigned_technician: t.assignedTechnician,
      remarks: t.remarks,
      issue_type: t.issueType,
      created_date: t.createdDate,
      completed_date: t.completedDate,
    }));
    const amcRows = seedAMCContracts.map(a => ({
      id: a.id,
      equipment_id: a.equipmentId,
      equipment_name: a.equipmentName,
      customer_id: a.customerId,
      customer_name: a.customerName,
      start_date: a.startDate,
      end_date: a.endDate,
      price: a.price,
      status: a.status,
    }));
    const pmRows = seedPMSchedules.map(p => ({
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

    const insertCustomers = await sb.from('customers').insert(customerRows);
    if (insertCustomers.error) throw insertCustomers.error;
    const insertEquipment = await sb.from('equipment').insert(equipmentRows);
    if (insertEquipment.error) throw insertEquipment.error;
    const insertTickets = await sb.from('tickets').insert(ticketRows);
    if (insertTickets.error) throw insertTickets.error;
    const insertAMC = await sb.from('amc_contracts').insert(amcRows);
    if (insertAMC.error) throw insertAMC.error;
    const insertPM = await sb.from('pm_schedules').insert(pmRows);
    if (insertPM.error) throw insertPM.error;
  }, []);

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
        await seedIfEmpty();
        await loadAllData();
      } catch (error) {
        console.error('Failed loading Supabase data, falling back to seed data:', error);
        if (!mounted) return;
        setCustomers(seedCustomers);
        setEquipment(seedEquipment);
        setTickets(seedTickets);
        setAmcContracts(seedAMCContracts);
        setPMSchedules(seedPMSchedules);
        setTechnicians(seedTechnicians);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [loadAllData, seedIfEmpty]);

  const addCustomer = useCallback(async (input: CustomerInput) => {
    const newCustomer: Customer = {
      id: nextId(customers.map(c => c.id), 'C'),
      ...input,
      createdAt: today(),
    };

    const { error } = await sb.from('customers').insert({
      id: newCustomer.id,
      name: newCustomer.name,
      contact_person: newCustomer.contactPerson,
      phone: newCustomer.phone,
      email: newCustomer.email,
      address: newCustomer.address,
      created_at: newCustomer.createdAt,
    });
    if (error) throw error;

    setCustomers(prev => [newCustomer, ...prev]);
  }, [customers]);

  const updateCustomer = useCallback(async (id: string, input: CustomerInput) => {
    const { error } = await sb
      .from('customers')
      .update({
        name: input.name,
        contact_person: input.contactPerson,
        phone: input.phone,
        email: input.email,
        address: input.address,
      })
      .eq('id', id);
    if (error) throw error;

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
    const newEquipment: Equipment = {
      id: nextId(equipment.map(e => e.id), 'E'),
      name: input.name,
      modelNumber: input.modelNumber,
      serialNumber: input.serialNumber,
      customerId: input.customerId,
      customerName: customer?.name || '',
      installationDate: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
    };

    const { error } = await sb.from('equipment').insert({
      id: newEquipment.id,
      name: newEquipment.name,
      model_number: newEquipment.modelNumber,
      serial_number: newEquipment.serialNumber,
      customer_id: newEquipment.customerId,
      customer_name: newEquipment.customerName,
      installation_date: newEquipment.installationDate,
      warranty_start_date: newEquipment.warrantyStartDate,
      warranty_end_date: newEquipment.warrantyEndDate,
    });
    if (error) throw error;

    setEquipment(prev => [newEquipment, ...prev]);
  }, [customers, equipment]);

  const updateEquipment = useCallback(async (input: Equipment) => {
    const customer = customers.find(c => c.id === input.customerId);
    const customerName = customer?.name || input.customerName;

    const { error } = await sb
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
      .eq('id', input.id);
    if (error) throw error;

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

    const newTicket: InstallationTicket = {
      id: nextId(tickets.map(t => t.id), 'TK-'),
      equipmentId: input.equipmentId,
      equipmentName: selectedEquipment?.name || '',
      customerId: selectedEquipment?.customerId || '',
      customerName: selectedCustomer?.name || '',
      location: input.location,
      status: 'Pending',
      assignedTechnician: null,
      remarks: input.remarks,
      issueType: null,
      createdDate: today(),
      completedDate: null,
    };

    const { error } = await sb.from('tickets').insert({
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
    });
    if (error) throw error;

    setTickets(prev => [newTicket, ...prev]);
  }, [customers, equipment, tickets]);

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

    const { error } = await sb.from('tickets').update(dbPatch).eq('id', ticketId);
    if (error) throw error;

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

    const newAMC: AMCContract = {
      id: nextId(amcContracts.map(a => a.id), 'AMC-'),
      equipmentId: input.equipmentId,
      equipmentName: selectedEquipment?.name || '',
      customerId: selectedEquipment?.customerId || '',
      customerName: selectedCustomer?.name || '',
      startDate: input.startDate,
      endDate: input.endDate,
      price: input.price,
      status: 'Quotation Sent',
    };

    const { error } = await sb.from('amc_contracts').insert({
      id: newAMC.id,
      equipment_id: newAMC.equipmentId,
      equipment_name: newAMC.equipmentName,
      customer_id: newAMC.customerId,
      customer_name: newAMC.customerName,
      start_date: newAMC.startDate,
      end_date: newAMC.endDate,
      price: newAMC.price,
      status: newAMC.status,
    });
    if (error) throw error;

    setAmcContracts(prev => [newAMC, ...prev]);
  }, [amcContracts, customers, equipment]);

  const updateAMCStatus = useCallback(async (amcId: string, status: AMCStatus) => {
    const { error } = await sb.from('amc_contracts').update({ status }).eq('id', amcId);
    if (error) throw error;

    setAmcContracts(prev => prev.map(a => (a.id === amcId ? { ...a, status } : a)));

    // Auto-generate 4 quarterly PM schedules when AMC becomes Active
    if (status === 'Active') {
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

    const { error } = await sb.from('pm_schedules').update(dbPatch).eq('id', pmId);
    if (error) throw error;

    setPMSchedules(prev => prev.map(p => (p.id === pmId ? { ...p, ...patch } : p)));
  }, []);

  const addTechnician = useCallback(async (input: TechnicianInput) => {
    const newTech: Technician = {
      id: nextId(technicians.map(t => t.id), 'TECH-'),
      name: input.name,
      phone: input.phone,
      email: input.email,
      specialization: input.specialization,
      isActive: true,
      createdAt: today(),
    };

    const { error } = await sb.from('technicians').insert({
      id: newTech.id,
      name: newTech.name,
      phone: newTech.phone,
      email: newTech.email,
      specialization: newTech.specialization,
      is_active: newTech.isActive,
      created_at: newTech.createdAt,
    });
    if (error) throw error;

    setTechnicians(prev => [...prev, newTech].sort((a, b) => a.name.localeCompare(b.name)));
  }, [technicians]);

  const updateTechnician = useCallback(async (id: string, patch: TechnicianUpdate) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.email !== undefined) dbPatch.email = patch.email;
    if (patch.specialization !== undefined) dbPatch.specialization = patch.specialization;
    if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;
    if (Object.keys(dbPatch).length === 0) return;

    const { error } = await sb.from('technicians').update(dbPatch).eq('id', id);
    if (error) throw error;

    setTechnicians(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const value = useMemo(
    () => ({
      loading,
      customers,
      equipment,
      tickets,
      amcContracts,
      pmSchedules,
      technicians,
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
      customers,
      equipment,
      tickets,
      amcContracts,
      pmSchedules,
      technicians,
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
