import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { 
  Wrench, ClipboardList, CalendarCheck, ChevronRight, 
  MapPin, Clock, CheckCircle2, AlertCircle, User, Phone
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabType = 'tickets' | 'pm';

const statusColors: Record<string, string> = {
  Pending: 'bg-warning/15 text-warning border-warning/20',
  Assigned: 'bg-primary/15 text-primary border-primary/20',
  'In Progress': 'bg-accent/15 text-accent border-accent/20',
  Completed: 'bg-success/15 text-success border-success/20',
  'Issue Reported': 'bg-destructive/15 text-destructive border-destructive/20',
};

const statusIcons: Record<string, typeof Clock> = {
  Pending: Clock,
  Assigned: User,
  'In Progress': AlertCircle,
  Completed: CheckCircle2,
  'Issue Reported': AlertCircle,
};

export default function TechnicianPortal() {
  const { technicians, tickets, pmSchedules, updateTicket, updatePMSchedule } = useData();
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [detailTicket, setDetailTicket] = useState<string | null>(null);
  const [detailPM, setDetailPM] = useState<string | null>(null);

  const activeTechnicians = useMemo(() => technicians.filter(t => t.isActive), [technicians]);

  const selectedTech = technicians.find(t => t.id === selectedTechId);

  const myTickets = useMemo(
    () => tickets.filter(t => t.assignedTechnician === selectedTech?.name),
    [tickets, selectedTech]
  );

  const myPMs = useMemo(
    () => pmSchedules.filter(p => p.assignedTechnician === selectedTech?.name),
    [pmSchedules, selectedTech]
  );

  const openTickets = myTickets.filter(t => t.status !== 'Completed');
  const completedTickets = myTickets.filter(t => t.status === 'Completed');
  const pendingPMs = myPMs.filter(p => p.status !== 'Completed');
  const completedPMs = myPMs.filter(p => p.status === 'Completed');

  const currentTicket = tickets.find(t => t.id === detailTicket);
  const currentPM = pmSchedules.find(p => p.id === detailPM);

  const handleTicketStatus = async (ticketId: string, status: string) => {
    await updateTicket(ticketId, { status: status as any });
  };

  const handlePMStatus = async (pmId: string, status: string) => {
    await updatePMSchedule(pmId, { status: status as any });
  };

  if (!selectedTechId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wrench size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">Technician Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Select your profile to view assignments</p>
          </div>
          <div className="space-y-3">
            {activeTechnicians.map(tech => (
              <button
                key={tech.id}
                onClick={() => setSelectedTechId(tech.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{tech.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{tech.specialization}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </button>
            ))}
            {activeTechnicians.length === 0 && (
              <p className="text-sm text-muted-foreground py-8">No active technicians found</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* Technician Header */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Wrench size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{selectedTech?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{selectedTech?.specialization}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground shrink-0"
          onClick={() => setSelectedTechId('')}
        >
          Switch
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={14} className="text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Open Tickets</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{openTickets.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck size={14} className="text-accent" />
            <span className="text-xs font-medium text-muted-foreground">Pending PMs</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingPMs.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabType)}>
        <TabsList className="w-full grid grid-cols-2 h-11 rounded-xl">
          <TabsTrigger value="tickets" className="rounded-lg text-xs font-semibold gap-1.5">
            <ClipboardList size={14} /> Tickets ({myTickets.length})
          </TabsTrigger>
          <TabsTrigger value="pm" className="rounded-lg text-xs font-semibold gap-1.5">
            <CalendarCheck size={14} /> PM ({myPMs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-3 space-y-2.5">
          {openTickets.length === 0 && completedTickets.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No tickets assigned</div>
          )}
          {openTickets.map(ticket => {
            const StatusIcon = statusIcons[ticket.status] || Clock;
            return (
              <button
                key={ticket.id}
                onClick={() => setDetailTicket(ticket.id)}
                className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ticket.equipmentName}</p>
                    <p className="text-xs text-muted-foreground truncate">{ticket.customerName}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[ticket.status] || ''}`}>
                    <StatusIcon size={10} />
                    {ticket.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={10} /> {ticket.location || 'N/A'}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {ticket.createdDate}</span>
                </div>
              </button>
            );
          })}
          {completedTickets.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-2 px-1">Completed</p>
              {completedTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setDetailTicket(ticket.id)}
                  className="w-full text-left p-3 rounded-xl bg-muted/50 border border-border/50 opacity-70 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate">{ticket.equipmentName}</p>
                    <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Done
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="pm" className="mt-3 space-y-2.5">
          {pendingPMs.length === 0 && completedPMs.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No PM schedules assigned</div>
          )}
          {pendingPMs.map(pm => (
            <button
              key={pm.id}
              onClick={() => setDetailPM(pm.id)}
              className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-accent/20 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{pm.equipmentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{pm.customerName}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[pm.status] || ''}`}>
                  PM #{pm.pmNumber}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarCheck size={10} /> {pm.plannedDate}</span>
                <span className={`font-medium ${pm.status === 'Pending' ? 'text-warning' : 'text-primary'}`}>{pm.status}</span>
              </div>
            </button>
          ))}
          {completedPMs.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-2 px-1">Completed</p>
              {completedPMs.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setDetailPM(pm.id)}
                  className="w-full text-left p-3 rounded-xl bg-muted/50 border border-border/50 opacity-70 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate">{pm.equipmentName} - PM #{pm.pmNumber}</p>
                    <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Done
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!detailTicket} onOpenChange={() => setDetailTicket(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base">{currentTicket?.id}</DialogTitle>
          </DialogHeader>
          {currentTicket && (
            <div className="space-y-4 pt-1">
              <div className="space-y-2.5">
                <InfoRow label="Equipment" value={currentTicket.equipmentName} />
                <InfoRow label="Customer" value={currentTicket.customerName} />
                <InfoRow label="Location" value={currentTicket.location || 'N/A'} />
                <InfoRow label="Issue Type" value={currentTicket.issueType || 'N/A'} />
                <InfoRow label="Created" value={currentTicket.createdDate} />
                <InfoRow label="Remarks" value={currentTicket.remarks || 'None'} />
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Assigned', 'In Progress', 'Completed', 'Issue Reported'].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={currentTicket.status === status ? 'default' : 'outline'}
                      className="text-xs rounded-xl h-9"
                      onClick={() => handleTicketStatus(currentTicket.id, status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PM Detail Dialog */}
      <Dialog open={!!detailPM} onOpenChange={() => setDetailPM(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base">PM #{currentPM?.pmNumber}</DialogTitle>
          </DialogHeader>
          {currentPM && (
            <div className="space-y-4 pt-1">
              <div className="space-y-2.5">
                <InfoRow label="Equipment" value={currentPM.equipmentName} />
                <InfoRow label="Customer" value={currentPM.customerName} />
                <InfoRow label="Planned Date" value={currentPM.plannedDate} />
                <InfoRow label="Status" value={currentPM.status} />
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Pending', 'Assigned', 'Completed'].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={currentPM.status === status ? 'default' : 'outline'}
                      className="text-xs rounded-xl h-9"
                      onClick={() => handlePMStatus(currentPM.id, status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
