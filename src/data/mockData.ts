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
  { id: 'C001', name: 'Omandurar Government Estate, Chennai', contactPerson: 'Dr. Rajesh Kumar', phone: '+91 98765 43210', email: 'admin@omandurar.gov.in', address: 'Omandurar Government Estate, Chennai', createdAt: '2015-01-01' },
  { id: 'C002', name: 'Thanjavur Medical College & Hospital', contactPerson: 'Dr. Priya Sharma', phone: '+91 87654 32109', email: 'admin@thanjavurmc.gov.in', address: 'Thanjavur Medical College, Thanjavur', createdAt: '2015-01-01' },
  { id: 'C003', name: 'Government Royapettah Hospital', contactPerson: 'Dr. Sanjay Patel', phone: '+91 76543 21098', email: 'admin@royapettah.gov.in', address: 'Government Royapettah Hospital, Chennai', createdAt: '2015-03-01' },
  { id: 'C004', name: 'Rajiv Gandhi Govt. General Hospital-Chennai', contactPerson: 'Dr. Anitha Rao', phone: '+91 65432 10987', email: 'admin@rgggh.gov.in', address: 'Rajiv Gandhi Govt. General Hospital, Chennai', createdAt: '2015-04-01' },
  { id: 'C005', name: 'Government Headquarters Hospital- Kancheepuram', contactPerson: 'Dr. Vikram Singh', phone: '+91 54321 09876', email: 'admin@kanchihq.gov.in', address: 'Govt. HQ Hospital, Kancheepuram', createdAt: '2017-05-01' },
  { id: 'C006', name: 'Rajiv Gandhi Govt. General Hospital, Chennai', contactPerson: 'Dr. Meena Kumari', phone: '+91 43210 98765', email: 'admin@rgggh2.gov.in', address: 'Rajiv Gandhi Govt. General Hospital, Chennai', createdAt: '2021-10-01' },
  { id: 'C007', name: 'Government Head Quarters Hospital, Pollachi', contactPerson: 'Dr. Suresh Babu', phone: '+91 32109 87654', email: 'admin@pollachihq.gov.in', address: 'Govt. HQ Hospital, Pollachi', createdAt: '2021-06-01' },
];

export const equipment: Equipment[] = [
  { id: 'E001', name: '20ltr. High Flow Insufflator', modelNumber: '0620-030-020E', serialNumber: '1502CE0086', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2015-02-20', warrantyStartDate: '2015-02-20', warrantyEndDate: null },
  { id: 'E002', name: '1288HD Camera Console', modelNumber: '1288-010-000i', serialNumber: '15A025964', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2015-02-20', warrantyStartDate: '2015-02-20', warrantyEndDate: null },
  { id: 'E003', name: '1288HD Camera Head', modelNumber: '1288-210-105i', serialNumber: '14J009234', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2015-02-20', warrantyStartDate: '2015-02-20', warrantyEndDate: null },
  { id: 'E004', name: '24mm Coupler', modelNumber: '1188-020-122', serialNumber: '14106097103', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2015-02-20', warrantyStartDate: '2015-02-20', warrantyEndDate: null },
  { id: 'E005', name: 'L9000 LED Light Source', modelNumber: '0220-210-000i', serialNumber: '12D016264', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2015-02-20', warrantyStartDate: '2015-02-20', warrantyEndDate: null },
  { id: 'E006', name: '26" Visionpro LED Monitor', modelNumber: '0240-031-020', serialNumber: 'VPD264G0012', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2015-02-20', warrantyStartDate: '2015-02-20', warrantyEndDate: null },
  { id: 'E007', name: 'Power supply for 26" LED Monitor', modelNumber: '0240-031-004', serialNumber: 'K140601311', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2015-02-20', warrantyStartDate: '2015-02-20', warrantyEndDate: null },
  { id: 'E008', name: 'Stryker Sonopet Universal HP HU25', modelNumber: '5450-820-000', serialNumber: '1411200174', customerId: 'C002', customerName: 'Thanjavur Medical College & Hospital', installationDate: '2015-02-05', warrantyStartDate: '2015-02-05', warrantyEndDate: null },
  { id: 'E009', name: 'Stryker Console 230V Includes Foot Pedal and IV Pole', modelNumber: '5450-852-000', serialNumber: '1414600884', customerId: 'C002', customerName: 'Thanjavur Medical College & Hospital', installationDate: '2015-02-05', warrantyStartDate: '2015-02-05', warrantyEndDate: null },
  { id: 'E010', name: 'Stryker System6 Dual Trigger Rotary Handpiece', modelNumber: '6205-000-000', serialNumber: '1503703063', customerId: 'C003', customerName: 'Government Royapettah Hospital', installationDate: '2015-05-27', warrantyStartDate: '2015-05-27', warrantyEndDate: null },
  { id: 'E011', name: 'Stryker System6 Sagittal Saw', modelNumber: '6208-000-000', serialNumber: '1504102513', customerId: 'C003', customerName: 'Government Royapettah Hospital', installationDate: '2015-05-27', warrantyStartDate: '2015-05-27', warrantyEndDate: null },
  { id: 'E012', name: 'Stryker System6/CD3 Battery Charger', modelNumber: '6110-120-000', serialNumber: '1427100223', customerId: 'C003', customerName: 'Government Royapettah Hospital', installationDate: '2015-05-27', warrantyStartDate: '2015-05-27', warrantyEndDate: null },
  { id: 'E013', name: 'Stryker 1188 HD 3 Chip Camera Console', modelNumber: '1188-010-000', serialNumber: '15G010184', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2016-06-04', warrantyStartDate: '2016-06-04', warrantyEndDate: null },
  { id: 'E014', name: 'Stryker 1188 HD 3 Chip Camera Head', modelNumber: '1188-210-105', serialNumber: '15G058704', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2016-06-04', warrantyStartDate: '2016-06-04', warrantyEndDate: null },
  { id: 'E015', name: 'Stryker 24mm Coupler', modelNumber: '1188-020-122', serialNumber: '15106446103', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', installationDate: '2016-06-04', warrantyStartDate: '2016-06-04', warrantyEndDate: null },
  { id: 'E016', name: 'CMOS HD 3 Chip Endoscopic Camera Console', modelNumber: '1488-010-000I', serialNumber: '15B024644', customerId: 'C004', customerName: 'Rajiv Gandhi Govt. General Hospital-Chennai', installationDate: '2015-04-11', warrantyStartDate: '2015-04-11', warrantyEndDate: null },
  { id: 'E017', name: 'CMOS HD 3 Chip Endoscopic Camera Head, C-Mount', modelNumber: '1488-210-105I', serialNumber: '15B043454', customerId: 'C004', customerName: 'Rajiv Gandhi Govt. General Hospital-Chennai', installationDate: '2015-04-11', warrantyStartDate: '2015-04-11', warrantyEndDate: null },
  { id: 'E018', name: '400 Watts LED Light Source', modelNumber: '0220-210-000i', serialNumber: '15B038944', customerId: 'C004', customerName: 'Rajiv Gandhi Govt. General Hospital-Chennai', installationDate: '2015-04-11', warrantyStartDate: '2015-04-11', warrantyEndDate: null },
  { id: 'E019', name: '26" LED Display International Kit', modelNumber: '0240-031-020I', serialNumber: 'VPD265A0393', customerId: 'C004', customerName: 'Rajiv Gandhi Govt. General Hospital-Chennai', installationDate: '2015-04-11', warrantyStartDate: '2015-04-11', warrantyEndDate: null },
  { id: 'E020', name: 'Power supply for 26" LED Monitor', modelNumber: '0240-031-004', serialNumber: 'K141100018', customerId: 'C004', customerName: 'Rajiv Gandhi Govt. General Hospital-Chennai', installationDate: '2015-04-11', warrantyStartDate: '2015-04-11', warrantyEndDate: null },
  { id: 'E021', name: 'High Flow 45 Ltr. Insufflator with Multi Speciality Settings', modelNumber: '0620-040-610', serialNumber: '1503CE0218', customerId: 'C004', customerName: 'Rajiv Gandhi Govt. General Hospital-Chennai', installationDate: '2015-04-11', warrantyStartDate: '2015-04-11', warrantyEndDate: null },
  { id: 'E022', name: 'Stryker SysG Battery Charger', modelNumber: '7310-120-000', serialNumber: '1633301435', customerId: 'C005', customerName: 'Government Headquarters Hospital- Kancheepuram', installationDate: '2017-05-24', warrantyStartDate: '2017-05-24', warrantyEndDate: null },
  { id: 'E023', name: 'Stryker SysG Rotary Drill Handpiece', modelNumber: '7305-001-000', serialNumber: '1633300295', customerId: 'C005', customerName: 'Government Headquarters Hospital- Kancheepuram', installationDate: '2017-05-24', warrantyStartDate: '2017-05-24', warrantyEndDate: null },
  { id: 'E024', name: 'Stryker SysG Sagittal Saw', modelNumber: '7308-001-000', serialNumber: '1701200035', customerId: 'C005', customerName: 'Government Headquarters Hospital- Kancheepuram', installationDate: '2017-05-24', warrantyStartDate: '2017-05-24', warrantyEndDate: null },
  { id: 'E025', name: 'Stryker 1588 Camera Console', modelNumber: '1588-010-000i', serialNumber: '21F521684', customerId: 'C006', customerName: 'Rajiv Gandhi Govt. General Hospital, Chennai', installationDate: '2021-11-17', warrantyStartDate: '2021-11-17', warrantyEndDate: null },
  { id: 'E026', name: 'Stryker 1588 AIM Camera Head', modelNumber: '1588-210-105i', serialNumber: '21D522264', customerId: 'C006', customerName: 'Rajiv Gandhi Govt. General Hospital, Chennai', installationDate: '2021-11-17', warrantyStartDate: '2021-11-17', warrantyEndDate: null },
  { id: 'E027', name: 'Stryker Precision LED Light Source 400W', modelNumber: '0220-220-300i', serialNumber: '21A526114', customerId: 'C006', customerName: 'Rajiv Gandhi Govt. General Hospital, Chennai', installationDate: '2021-11-17', warrantyStartDate: '2021-11-17', warrantyEndDate: null },
  { id: 'E028', name: 'Stryker 5mm 30 deg AIM Telescope', modelNumber: '0502-537-030', serialNumber: '808575', customerId: 'C006', customerName: 'Rajiv Gandhi Govt. General Hospital, Chennai', installationDate: '2021-11-17', warrantyStartDate: '2021-11-17', warrantyEndDate: null },
  { id: 'E029', name: 'Stryker Universal Battery Charger', modelNumber: '7110-120-000', serialNumber: '2109708393', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E030', name: 'Stryker System 8 Dual Trigger Rotary Handpiece (Upgraded)', modelNumber: '8205-000-000', serialNumber: '2111218523', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E031', name: 'Stryker Jacobs Chuck with Key', modelNumber: '6203-131-000', serialNumber: '21061', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E032', name: 'Stryker System 8 Wire Collet 0.7-1.8mm', modelNumber: '8203-026-000', serialNumber: '2031810333', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E033', name: 'Stryker Small Synthes Quick Connect', modelNumber: '6203-110-000', serialNumber: '20301', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E034', name: 'Stryker Synthes Reaming Attachment (Large)', modelNumber: '6203-210-000', serialNumber: '20090', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E035', name: 'Stryker Universal Battery Charger', modelNumber: '7110-120-000', serialNumber: '2109607973', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E036', name: 'Stryker System 8 Dual Trigger Rotary Handpiece (Upgraded)', modelNumber: '8205-000-000', serialNumber: '2111218513', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E037', name: 'Stryker Jacobs Chuck with Key', modelNumber: '6203-131-000', serialNumber: '21061', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E038', name: 'Stryker System 8 Wire Collet 0.7-1.8mm', modelNumber: '8203-026-000', serialNumber: '2033519023', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E039', name: 'Stryker Small Synthes Quick Connect', modelNumber: '6203-110-000', serialNumber: '20301', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E040', name: 'Stryker Synthes Reaming Attachment (Large)', modelNumber: '6203-210-000', serialNumber: '20090', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E041', name: 'Stryker Universal Battery Charger', modelNumber: '7110-120-000', serialNumber: '2109204853', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E042', name: 'Stryker System 8 Dual Trigger Rotary Handpiece (Upgraded)', modelNumber: '8205-000-000', serialNumber: '2111218473', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E043', name: 'Stryker Jacobs Chuck with Key', modelNumber: '6203-131-000', serialNumber: '21055', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E044', name: 'Stryker System 8 Wire Collet 0.7-1.8mm', modelNumber: '8203-026-000', serialNumber: '2033519073', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E045', name: 'Stryker Small Synthes Quick Connect', modelNumber: '6203-110-000', serialNumber: '20289', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E046', name: 'Stryker Synthes Reaming Attachment (Large)', modelNumber: '6203-210-000', serialNumber: '20090', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E047', name: 'Stryker Universal Battery Charger', modelNumber: '7110-120-000', serialNumber: '2109204813', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E048', name: 'Stryker System 8 Dual Trigger Rotary Handpiece (Upgraded)', modelNumber: '8205-000-000', serialNumber: '2111218333', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E049', name: 'Stryker Jacobs Chuck with Key', modelNumber: '6203-131-000', serialNumber: '21061', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E050', name: 'Stryker System 8 Wire Collet 0.7-1.8mm', modelNumber: '8203-026-000', serialNumber: '2032200133', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E051', name: 'Stryker Small Synthes Quick Connect', modelNumber: '6203-110-000', serialNumber: '20289', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
  { id: 'E052', name: 'Stryker Synthes Reaming Attachment (Large)', modelNumber: '6203-210-000', serialNumber: '20090', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', installationDate: '2021-07-20', warrantyStartDate: '2021-07-20', warrantyEndDate: null },
];

export const tickets: InstallationTicket[] = [
  { id: 'TK-001', equipmentId: 'E001', equipmentName: '20ltr. High Flow Insufflator', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', location: 'OT Block, 2nd Floor', status: 'Completed', assignedTechnician: 'Amit Verma', remarks: 'Installation completed successfully', issueType: null, createdDate: '2015-02-15', completedDate: '2015-02-20' },
  { id: 'TK-002', equipmentId: 'E025', equipmentName: 'Stryker 1588 Camera Console', customerId: 'C006', customerName: 'Rajiv Gandhi Govt. General Hospital, Chennai', location: 'Endoscopy Suite', status: 'Assigned', assignedTechnician: 'Ravi Krishnan', remarks: '', issueType: null, createdDate: '2021-11-10', completedDate: null },
  { id: 'TK-003', equipmentId: 'E029', equipmentName: 'Stryker Universal Battery Charger', customerId: 'C007', customerName: 'Government Head Quarters Hospital, Pollachi', location: 'OT Ward', status: 'Issue Reported', assignedTechnician: 'Suresh Nair', remarks: 'Site preparation incomplete', issueType: 'Site not ready', createdDate: '2021-07-15', completedDate: null },
  { id: 'TK-004', equipmentId: 'E010', equipmentName: 'Stryker System6 Dual Trigger Rotary Handpiece', customerId: 'C003', customerName: 'Government Royapettah Hospital', location: 'Ortho OT, Ground Floor', status: 'Completed', assignedTechnician: 'Amit Verma', remarks: 'Calibration done', issueType: null, createdDate: '2015-05-20', completedDate: '2015-05-27' },
  { id: 'TK-005', equipmentId: 'E016', equipmentName: 'CMOS HD 3 Chip Endoscopic Camera Console', customerId: 'C004', customerName: 'Rajiv Gandhi Govt. General Hospital-Chennai', location: 'Endoscopy Room 3', status: 'In Progress', assignedTechnician: 'Ravi Krishnan', remarks: 'Awaiting accessories', issueType: null, createdDate: '2015-04-05', completedDate: null },
];

export const amcContracts: AMCContract[] = [
  { id: 'AMC-001', equipmentId: 'E002', equipmentName: '1288HD Camera Console', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', startDate: '2025-02-01', endDate: '2026-02-01', price: 120000, status: 'Active' },
  { id: 'AMC-002', equipmentId: 'E013', equipmentName: 'Stryker 1188 HD 3 Chip Camera Console', customerId: 'C001', customerName: 'Omandurar Government Estate, Chennai', startDate: '2025-03-15', endDate: '2026-03-15', price: 250000, status: 'Paid' },
  { id: 'AMC-003', equipmentId: 'E008', equipmentName: 'Stryker Sonopet Universal HP HU25', customerId: 'C002', customerName: 'Thanjavur Medical College & Hospital', startDate: '2025-04-10', endDate: '2026-04-10', price: 45000, status: 'Quotation Sent' },
  { id: 'AMC-004', equipmentId: 'E025', equipmentName: 'Stryker 1588 Camera Console', customerId: 'C006', customerName: 'Rajiv Gandhi Govt. General Hospital, Chennai', startDate: '2025-06-01', endDate: '2026-06-01', price: 35000, status: 'Approved' },
];

export const pmSchedules: PMSchedule[] = [
  { id: 'PM-001', amcId: 'AMC-001', equipmentId: 'E002', equipmentName: '1288HD Camera Console', customerName: 'Omandurar Government Estate, Chennai', pmNumber: 1, plannedDate: '2025-05-01', status: 'Completed', assignedTechnician: 'Amit Verma' },
  { id: 'PM-002', amcId: 'AMC-001', equipmentId: 'E002', equipmentName: '1288HD Camera Console', customerName: 'Omandurar Government Estate, Chennai', pmNumber: 2, plannedDate: '2025-08-01', status: 'Assigned', assignedTechnician: 'Amit Verma' },
  { id: 'PM-003', amcId: 'AMC-001', equipmentId: 'E002', equipmentName: '1288HD Camera Console', customerName: 'Omandurar Government Estate, Chennai', pmNumber: 3, plannedDate: '2025-11-01', status: 'Pending', assignedTechnician: null },
  { id: 'PM-004', amcId: 'AMC-001', equipmentId: 'E002', equipmentName: '1288HD Camera Console', customerName: 'Omandurar Government Estate, Chennai', pmNumber: 4, plannedDate: '2026-02-01', status: 'Pending', assignedTechnician: null },
  { id: 'PM-005', amcId: 'AMC-002', equipmentId: 'E013', equipmentName: 'Stryker 1188 HD 3 Chip Camera Console', customerName: 'Omandurar Government Estate, Chennai', pmNumber: 1, plannedDate: '2025-06-15', status: 'Pending', assignedTechnician: null },
  { id: 'PM-006', amcId: 'AMC-002', equipmentId: 'E013', equipmentName: 'Stryker 1188 HD 3 Chip Camera Console', customerName: 'Omandurar Government Estate, Chennai', pmNumber: 2, plannedDate: '2025-09-15', status: 'Pending', assignedTechnician: null },
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
  { id: 'TECH-001', name: 'Amit Verma', phone: '+91 98765 11111', email: 'amit@medserv.com', specialization: 'Endoscopy Equipment', isActive: true, createdAt: '2024-01-01' },
  { id: 'TECH-002', name: 'Ravi Krishnan', phone: '+91 98765 22222', email: 'ravi@medserv.com', specialization: 'Imaging Systems', isActive: true, createdAt: '2024-01-01' },
  { id: 'TECH-003', name: 'Suresh Nair', phone: '+91 98765 33333', email: 'suresh@medserv.com', specialization: 'Power Tools & Drills', isActive: true, createdAt: '2024-01-01' },
  { id: 'TECH-004', name: 'Deepak Joshi', phone: '+91 98765 44444', email: 'deepak@medserv.com', specialization: 'Lab Instruments', isActive: true, createdAt: '2024-01-01' },
  { id: 'TECH-005', name: 'Manoj Tiwari', phone: '+91 98765 55555', email: 'manoj@medserv.com', specialization: 'General Maintenance', isActive: true, createdAt: '2024-01-01' },
];

export const issueTypes = ['Power not available', 'Site not ready', 'Accessories missing', 'Other'];
