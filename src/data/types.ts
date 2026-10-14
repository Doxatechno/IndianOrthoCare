export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  /** Last-modified stamp, for display. */
  updatedAt?: string;
  /**
   * Version token, bumped by a trigger on every update. Used to detect a
   * concurrent edit before overwriting. An integer because it has to survive a
   * JSON round-trip exactly - updated_at does not, it loses microseconds.
   */
  rowVersion?: number;
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
  /** Last-modified stamp, for display. */
  updatedAt?: string;
  /**
   * Version token, bumped by a trigger on every update. Used to detect a
   * concurrent edit before overwriting. An integer because it has to survive a
   * JSON round-trip exactly - updated_at does not, it loses microseconds.
   */
  rowVersion?: number;
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
  /** Last-modified stamp, for display. */
  updatedAt?: string;
  /**
   * Version token, bumped by a trigger on every update. Used to detect a
   * concurrent edit before overwriting. An integer because it has to survive a
   * JSON round-trip exactly - updated_at does not, it loses microseconds.
   */
  rowVersion?: number;
}

export type CoverageType = 'AMC' | 'CMC' | 'CAMC';
export type BillingFrequency = 'Annual' | 'Half-Yearly' | 'Quarterly' | 'Monthly';

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
  /** Last-modified stamp, for display. */
  updatedAt?: string;
  /**
   * Version token, bumped by a trigger on every update. Used to detect a
   * concurrent edit before overwriting. An integer because it has to survive a
   * JSON round-trip exactly - updated_at does not, it loses microseconds.
   */
  rowVersion?: number;
  coverage: CoverageType;
  visitsPerYear: number;
  billing: BillingFrequency;
  renewalDate: string | null;
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
  /** Last-modified stamp, for display. */
  updatedAt?: string;
  /**
   * Version token, bumped by a trigger on every update. Used to detect a
   * concurrent edit before overwriting. An integer because it has to survive a
   * JSON round-trip exactly - updated_at does not, it loses microseconds.
   */
  rowVersion?: number;
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
  /** Last-modified stamp, for display. */
  updatedAt?: string;
  /**
   * Version token, bumped by a trigger on every update. Used to detect a
   * concurrent edit before overwriting. An integer because it has to survive a
   * JSON round-trip exactly - updated_at does not, it loses microseconds.
   */
  rowVersion?: number;
}
