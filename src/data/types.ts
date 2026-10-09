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

export type AMCStatus = 'Quotation Sent' | 'PO Released' | 'Invoice Generated' | 'Payment Received';

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

// Helper: add years to a date string

export type TechnicianRole = 'Service Head' | 'Service Coordinator' | 'Service Engineer' | 'Sales and Service Engineer';

export interface Technician {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  role: TechnicianRole;
  reportingManager: string;
  isActive: boolean;
  createdAt: string;
}
