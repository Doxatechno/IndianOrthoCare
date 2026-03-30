export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface Equipment {
  id: string;
  name: string;
  modelNumber: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  installationDate: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
}

export type TicketStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Completed' | 'Issue Reported';

export interface InstallationTicket {
  id: string;
  equipmentId: string;
  equipmentName: string;
  customerId: string;
  customerName: string;
  location: string;
  status: TicketStatus;
  assignedTechnician: string | null;
  remarks: string;
  issueType: string | null;
  createdDate: string;
  completedDate: string | null;
}

export type AMCStatus = 'Quotation Sent' | 'Approved' | 'Payment Pending' | 'Paid' | 'Active';

export interface AMCContract {
  id: string;
  equipmentId: string;
  equipmentName: string;
  customerId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  price: number;
  status: AMCStatus;
}

export type PMStatus = 'Pending' | 'Assigned' | 'Completed';

export interface PMSchedule {
  id: string;
  amcId: string;
  equipmentId: string;
  equipmentName: string;
  customerName: string;
  pmNumber: number;
  plannedDate: string;
  status: PMStatus;
  assignedTechnician: string | null;
}

export const customers: Customer[] = [
  { id: 'C001', name: 'City General Hospital', contactPerson: 'Dr. Rajesh Kumar', phone: '+91 98765 43210', email: 'admin@citygeneral.com', address: '42 MG Road, Mumbai 400001', createdAt: '2024-01-15' },
  { id: 'C002', name: 'LifeCare Diagnostics', contactPerson: 'Ms. Priya Sharma', phone: '+91 87654 32109', email: 'priya@lifecare.in', address: '18 Anna Salai, Chennai 600002', createdAt: '2024-02-20' },
  { id: 'C003', name: 'Apollo Path Lab', contactPerson: 'Mr. Sanjay Patel', phone: '+91 76543 21098', email: 'sanjay@apollopath.com', address: '55 Park Street, Kolkata 700016', createdAt: '2024-03-10' },
  { id: 'C004', name: 'MedStar Hospital', contactPerson: 'Dr. Anitha Rao', phone: '+91 65432 10987', email: 'anitha@medstar.org', address: '101 Jubilee Hills, Hyderabad 500033', createdAt: '2024-04-05' },
  { id: 'C005', name: 'Unity Healthcare', contactPerson: 'Mr. Vikram Singh', phone: '+91 54321 09876', email: 'vikram@unityhc.com', address: '7 Sector 18, Noida 201301', createdAt: '2024-05-12' },
];

export const equipment: Equipment[] = [
  { id: 'E001', name: 'X-Ray Machine', modelNumber: 'XR-5000', serialNumber: 'SN-XR-2024-001', customerId: 'C001', customerName: 'City General Hospital', installationDate: '2024-02-01', warrantyStartDate: '2024-02-01', warrantyEndDate: '2025-02-01' },
  { id: 'E002', name: 'CT Scanner', modelNumber: 'CT-PRO-128', serialNumber: 'SN-CT-2024-002', customerId: 'C001', customerName: 'City General Hospital', installationDate: '2024-03-15', warrantyStartDate: '2024-03-15', warrantyEndDate: '2025-03-15' },
  { id: 'E003', name: 'Blood Analyzer', modelNumber: 'BA-3000', serialNumber: 'SN-BA-2024-003', customerId: 'C002', customerName: 'LifeCare Diagnostics', installationDate: '2024-04-10', warrantyStartDate: '2024-04-10', warrantyEndDate: '2025-04-10' },
  { id: 'E004', name: 'Ultrasound Machine', modelNumber: 'US-ELITE', serialNumber: 'SN-US-2024-004', customerId: 'C003', customerName: 'Apollo Path Lab', installationDate: null, warrantyStartDate: null, warrantyEndDate: null },
  { id: 'E005', name: 'ECG Monitor', modelNumber: 'ECG-12L', serialNumber: 'SN-ECG-2024-005', customerId: 'C004', customerName: 'MedStar Hospital', installationDate: '2024-06-01', warrantyStartDate: '2024-06-01', warrantyEndDate: '2025-06-01' },
  { id: 'E006', name: 'Ventilator', modelNumber: 'VT-ICU-PRO', serialNumber: 'SN-VT-2024-006', customerId: 'C005', customerName: 'Unity Healthcare', installationDate: null, warrantyStartDate: null, warrantyEndDate: null },
];

export const tickets: InstallationTicket[] = [
  { id: 'TK-001', equipmentId: 'E001', equipmentName: 'X-Ray Machine', customerId: 'C001', customerName: 'City General Hospital', location: 'Radiology Dept, 2nd Floor', status: 'Completed', assignedTechnician: 'Amit Verma', remarks: 'Installation completed successfully', issueType: null, createdDate: '2024-01-20', completedDate: '2024-02-01' },
  { id: 'TK-002', equipmentId: 'E004', equipmentName: 'Ultrasound Machine', customerId: 'C003', customerName: 'Apollo Path Lab', location: 'Imaging Center, Ground Floor', status: 'Assigned', assignedTechnician: 'Ravi Krishnan', remarks: '', issueType: null, createdDate: '2024-06-15', completedDate: null },
  { id: 'TK-003', equipmentId: 'E006', equipmentName: 'Ventilator', customerId: 'C005', customerName: 'Unity Healthcare', location: 'ICU Ward', status: 'Issue Reported', assignedTechnician: 'Suresh Nair', remarks: 'Site preparation incomplete', issueType: 'Site not ready', createdDate: '2024-07-01', completedDate: null },
  { id: 'TK-004', equipmentId: 'E002', equipmentName: 'CT Scanner', customerId: 'C001', customerName: 'City General Hospital', location: 'CT Suite, Basement', status: 'Completed', assignedTechnician: 'Amit Verma', remarks: 'Calibration done', issueType: null, createdDate: '2024-02-28', completedDate: '2024-03-15' },
  { id: 'TK-005', equipmentId: 'E003', equipmentName: 'Blood Analyzer', customerId: 'C002', customerName: 'LifeCare Diagnostics', location: 'Lab Room 3', status: 'In Progress', assignedTechnician: 'Ravi Krishnan', remarks: 'Awaiting reagent kit', issueType: null, createdDate: '2024-08-10', completedDate: null },
];

export const amcContracts: AMCContract[] = [
  { id: 'AMC-001', equipmentId: 'E001', equipmentName: 'X-Ray Machine', customerId: 'C001', customerName: 'City General Hospital', startDate: '2025-02-01', endDate: '2026-02-01', price: 120000, status: 'Active' },
  { id: 'AMC-002', equipmentId: 'E002', equipmentName: 'CT Scanner', customerId: 'C001', customerName: 'City General Hospital', startDate: '2025-03-15', endDate: '2026-03-15', price: 250000, status: 'Paid' },
  { id: 'AMC-003', equipmentId: 'E003', equipmentName: 'Blood Analyzer', customerId: 'C002', customerName: 'LifeCare Diagnostics', startDate: '2025-04-10', endDate: '2026-04-10', price: 45000, status: 'Quotation Sent' },
  { id: 'AMC-004', equipmentId: 'E005', equipmentName: 'ECG Monitor', customerId: 'C004', customerName: 'MedStar Hospital', startDate: '2025-06-01', endDate: '2026-06-01', price: 35000, status: 'Approved' },
];

export const pmSchedules: PMSchedule[] = [
  { id: 'PM-001', amcId: 'AMC-001', equipmentId: 'E001', equipmentName: 'X-Ray Machine', customerName: 'City General Hospital', pmNumber: 1, plannedDate: '2025-05-01', status: 'Completed', assignedTechnician: 'Amit Verma' },
  { id: 'PM-002', amcId: 'AMC-001', equipmentId: 'E001', equipmentName: 'X-Ray Machine', customerName: 'City General Hospital', pmNumber: 2, plannedDate: '2025-08-01', status: 'Assigned', assignedTechnician: 'Amit Verma' },
  { id: 'PM-003', amcId: 'AMC-001', equipmentId: 'E001', equipmentName: 'X-Ray Machine', customerName: 'City General Hospital', pmNumber: 3, plannedDate: '2025-11-01', status: 'Pending', assignedTechnician: null },
  { id: 'PM-004', amcId: 'AMC-001', equipmentId: 'E001', equipmentName: 'X-Ray Machine', customerName: 'City General Hospital', pmNumber: 4, plannedDate: '2026-02-01', status: 'Pending', assignedTechnician: null },
  { id: 'PM-005', amcId: 'AMC-002', equipmentId: 'E002', equipmentName: 'CT Scanner', customerName: 'City General Hospital', pmNumber: 1, plannedDate: '2025-06-15', status: 'Pending', assignedTechnician: null },
  { id: 'PM-006', amcId: 'AMC-002', equipmentId: 'E002', equipmentName: 'CT Scanner', customerName: 'City General Hospital', pmNumber: 2, plannedDate: '2025-09-15', status: 'Pending', assignedTechnician: null },
];

export interface Technician {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  isActive: boolean;
  createdAt: string;
}

export const technicians: Technician[] = [
  { id: 'TECH-001', name: 'Amit Verma', phone: '+91 98765 11111', email: 'amit@medserv.com', specialization: 'Radiology Equipment', isActive: true, createdAt: '2024-01-01' },
  { id: 'TECH-002', name: 'Ravi Krishnan', phone: '+91 98765 22222', email: 'ravi@medserv.com', specialization: 'Imaging Systems', isActive: true, createdAt: '2024-01-01' },
  { id: 'TECH-003', name: 'Suresh Nair', phone: '+91 98765 33333', email: 'suresh@medserv.com', specialization: 'ICU Equipment', isActive: true, createdAt: '2024-01-01' },
  { id: 'TECH-004', name: 'Deepak Joshi', phone: '+91 98765 44444', email: 'deepak@medserv.com', specialization: 'Lab Instruments', isActive: true, createdAt: '2024-01-01' },
  { id: 'TECH-005', name: 'Manoj Tiwari', phone: '+91 98765 55555', email: 'manoj@medserv.com', specialization: 'General Maintenance', isActive: true, createdAt: '2024-01-01' },
];

export const issueTypes = ['Power not available', 'Site not ready', 'Accessories missing', 'Other'];
