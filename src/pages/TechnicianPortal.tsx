import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, ClipboardList, CalendarCheck, 
  MapPin, Clock, CheckCircle2, AlertCircle, User, LogOut,
  ChevronRight, Stethoscope, Activity, Shield
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type TabType = 'tickets' | 'pm' | 'activity';

const statusGradients: Record<string, string> = {
  Pending: 'from-amber-400 to-orange-400',
  Assigned: 'from-blue-400 to-indigo-500',
  'In Progress': 'from-violet-400 to-purple-500',
  Completed: 'from-emerald-400 to-teal-500',
  'Issue Reported': 'from-rose-400 to-red-500',
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
  const { technicianId, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [detailTicket, setDetailTicket] = useState<string | null>(null);
  const [detailPM, setDetailPM] = useState<string | null>(null);

  const selectedTech = technicians.find(t => t.id === technicianId);

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/technician-login');
  };

  if (!selectedTech) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(160deg, hsl(270, 60%, 55%) 0%, hsl(250, 65%, 40%) 50%, hsl(240, 55%, 30%) 100%)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <AlertCircle size={28} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">No Technician Profile</h1>
          <p className="text-sm text-white/60">Your account is not linked to a technician profile.</p>
          <button onClick={handleSignOut} className="px-6 py-3 rounded-2xl bg-white/15 backdrop-blur text-white text-sm font-semibold hover:bg-white/25 transition-all flex items-center gap-2 mx-auto">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, hsl(270, 60%, 55%) 0%, hsl(250, 65%, 40%) 50%, hsl(240, 55%, 30%) 100%)' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-5 relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-[-40px] right-[-30px] w-36 h-36 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(280, 70%, 65%), hsl(260, 60%, 50%))' }}>
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">MedServ Pro</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium">Technician Portal</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-all active:scale-95">
            <LogOut size={16} className="text-white/70" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl p-4 backdrop-blur-lg border border-white/10" style={{ background: 'linear-gradient(135deg, hsla(280, 60%, 60%, 0.4), hsla(260, 50%, 45%, 0.3))' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(170, 70%, 50%), hsl(160, 65%, 45%))' }}>
              {selectedTech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{selectedTech.name}</p>
              <p className="text-xs text-white/50 truncate">{selectedTech.specialization}</p>
            </div>
          </div>
          
          {/* Mini Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl p-2.5 bg-white/10 text-center">
              <p className="text-lg font-bold text-white">{openTickets.length}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider font-medium">Tickets</p>
            </div>
            <div className="rounded-xl p-2.5 bg-white/10 text-center">
              <p className="text-lg font-bold text-white">{pendingPMs.length}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider font-medium">PM Due</p>
            </div>
            <div className="rounded-xl p-2.5 bg-white/10 text-center">
              <p className="text-lg font-bold text-white">{completedTickets.length + completedPMs.length}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider font-medium">Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - White card */}
      <div className="bg-white rounded-t-[28px] min-h-[60vh] px-5 pt-6 pb-8 shadow-2xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'tickets'
                ? 'text-white shadow-lg'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-150'
            }`}
            style={activeTab === 'tickets' ? { background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' } : {}}
          >
            <span className="flex items-center justify-center gap-1.5">
              <ClipboardList size={14} /> Tickets ({myTickets.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pm')}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'pm'
                ? 'text-white shadow-lg'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-150'
            }`}
            style={activeTab === 'pm' ? { background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' } : {}}
          >
            <span className="flex items-center justify-center gap-1.5">
              <CalendarCheck size={14} /> PM ({myPMs.length})
            </span>
          </button>
        </div>

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-3">
            {openTickets.length === 0 && completedTickets.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <ClipboardList size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">No tickets assigned</p>
              </div>
            )}
            {openTickets.map(ticket => {
              const StatusIcon = statusIcons[ticket.status] || Clock;
              const gradient = statusGradients[ticket.status] || 'from-gray-400 to-gray-500';
              return (
                <button
                  key={ticket.id}
                  onClick={() => setDetailTicket(ticket.id)}
                  className="w-full text-left p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <StatusIcon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{ticket.equipmentName}</p>
                          <p className="text-xs text-gray-400 truncate">{ticket.customerName}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1"><MapPin size={10} /> {ticket.location || 'N/A'}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {ticket.createdDate}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {completedTickets.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.15em] pt-3 px-1">Completed</p>
                {completedTickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => setDetailTicket(ticket.id)}
                    className="w-full text-left p-3.5 rounded-2xl bg-gray-50 border border-gray-100/50 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} className="text-white" />
                      </div>
                      <p className="text-sm text-gray-500 truncate flex-1">{ticket.equipmentName}</p>
                      <span className="text-[10px] text-emerald-500 font-bold">Done</span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* PM Tab */}
        {activeTab === 'pm' && (
          <div className="space-y-3">
            {pendingPMs.length === 0 && completedPMs.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <CalendarCheck size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">No PM schedules assigned</p>
              </div>
            )}
            {pendingPMs.map(pm => {
              const gradient = statusGradients[pm.status] || 'from-blue-400 to-indigo-500';
              return (
                <button
                  key={pm.id}
                  onClick={() => setDetailPM(pm.id)}
                  className="w-full text-left p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Shield size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{pm.equipmentName}</p>
                          <p className="text-xs text-gray-400 truncate">{pm.customerName}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' }}>
                          PM #{pm.pmNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1"><CalendarCheck size={10} /> {pm.plannedDate}</span>
                        <span className={`font-semibold ${pm.status === 'Pending' ? 'text-amber-500' : 'text-blue-500'}`}>{pm.status}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {completedPMs.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.15em] pt-3 px-1">Completed</p>
                {completedPMs.map(pm => (
                  <button
                    key={pm.id}
                    onClick={() => setDetailPM(pm.id)}
                    className="w-full text-left p-3.5 rounded-2xl bg-gray-50 border border-gray-100/50 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} className="text-white" />
                      </div>
                      <p className="text-sm text-gray-500 truncate flex-1">{pm.equipmentName} - PM #{pm.pmNumber}</p>
                      <span className="text-[10px] text-emerald-500 font-bold">Done</span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {[...myTickets, ...myPMs].length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Activity size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">No recent activity</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.15em] px-1">All Assigned Work</p>
                {[
                  ...myTickets.map(t => ({ type: 'ticket' as const, id: t.id, name: t.equipmentName, customer: t.customerName, status: t.status, date: t.createdDate })),
                  ...myPMs.map(p => ({ type: 'pm' as const, id: p.id, name: p.equipmentName, customer: p.customerName, status: p.status, date: p.plannedDate })),
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => {
                  const gradient = statusGradients[item.status] || 'from-gray-400 to-gray-500';
                  const StatusIcon = statusIcons[item.status] || Clock;
                  return (
                    <button
                      key={item.id}
                      onClick={() => item.type === 'ticket' ? setDetailTicket(item.id) : setDetailPM(item.id)}
                      className="w-full text-left p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                          <StatusIcon size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                              <p className="text-xs text-gray-400 truncate">{item.customer}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
                              {item.type === 'ticket' ? 'Ticket' : 'PM'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1"><Clock size={10} /> {item.date}</span>
                            <span className={`font-semibold ${item.status === 'Completed' ? 'text-emerald-500' : item.status === 'Pending' ? 'text-amber-500' : 'text-blue-500'}`}>{item.status}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-around shadow-2xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tickets' ? '' : 'opacity-40'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'tickets' ? 'shadow-md' : ''}`}
            style={activeTab === 'tickets' ? { background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' } : {}}>
            <ClipboardList size={18} className={activeTab === 'tickets' ? 'text-white' : 'text-gray-400'} />
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${activeTab === 'tickets' ? 'text-purple-600' : 'text-gray-400'}`}>Tickets</span>
        </button>
        <button
          onClick={() => setActiveTab('pm')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'pm' ? '' : 'opacity-40'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'pm' ? 'shadow-md' : ''}`}
            style={activeTab === 'pm' ? { background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' } : {}}>
            <CalendarCheck size={18} className={activeTab === 'pm' ? 'text-white' : 'text-gray-400'} />
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${activeTab === 'pm' ? 'text-purple-600' : 'text-gray-400'}`}>PM</span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'activity' ? '' : 'opacity-40'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'activity' ? 'shadow-md' : ''}`}
            style={activeTab === 'activity' ? { background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' } : {}}>
            <Activity size={18} className={activeTab === 'activity' ? 'text-white' : 'text-gray-400'} />
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${activeTab === 'activity' ? 'text-purple-600' : 'text-gray-400'}`}>Activity</span>
        </button>
        <button onClick={handleSignOut} className="flex flex-col items-center gap-1 opacity-40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <LogOut size={18} className="text-gray-400" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Logout</span>
        </button>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!detailTicket} onOpenChange={() => setDetailTicket(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl max-h-[85vh] overflow-y-auto border-0 shadow-2xl p-0">
          <div className="p-5 rounded-t-3xl text-white" style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' }}>
            <DialogHeader>
              <DialogTitle className="font-display text-base text-white">{currentTicket?.id}</DialogTitle>
            </DialogHeader>
            <p className="text-white/60 text-xs mt-1">{currentTicket?.equipmentName}</p>
          </div>
          {currentTicket && (
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <DetailRow icon={<Wrench size={14} />} label="Equipment" value={currentTicket.equipmentName} color="from-pink-400 to-rose-500" />
                <DetailRow icon={<User size={14} />} label="Customer" value={currentTicket.customerName} color="from-blue-400 to-indigo-500" />
                <DetailRow icon={<MapPin size={14} />} label="Location" value={currentTicket.location || 'N/A'} color="from-amber-400 to-orange-500" />
                <DetailRow icon={<Activity size={14} />} label="Issue Type" value={currentTicket.issueType || 'N/A'} color="from-violet-400 to-purple-500" />
                <DetailRow icon={<Clock size={14} />} label="Created" value={currentTicket.createdDate} color="from-cyan-400 to-blue-500" />
              </div>
              {currentTicket.remarks && (
                <div className="rounded-2xl bg-gray-50 p-3.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Remarks</p>
                  <p className="text-xs text-gray-600">{currentTicket.remarks}</p>
                </div>
              )}
              <div className="pt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Assigned', 'In Progress', 'Completed', 'Issue Reported'].map(status => (
                    <button
                      key={status}
                      className={`py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
                        currentTicket.status === status
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                      }`}
                      style={currentTicket.status === status ? { background: 'linear-gradient(135deg, hsl(170, 70%, 50%), hsl(160, 65%, 45%))' } : {}}
                      onClick={() => handleTicketStatus(currentTicket.id, status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PM Detail Dialog */}
      <Dialog open={!!detailPM} onOpenChange={() => setDetailPM(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl max-h-[85vh] overflow-y-auto border-0 shadow-2xl p-0">
          <div className="p-5 rounded-t-3xl text-white" style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' }}>
            <DialogHeader>
              <DialogTitle className="font-display text-base text-white">PM #{currentPM?.pmNumber}</DialogTitle>
            </DialogHeader>
            <p className="text-white/60 text-xs mt-1">{currentPM?.equipmentName}</p>
          </div>
          {currentPM && (
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <DetailRow icon={<Wrench size={14} />} label="Equipment" value={currentPM.equipmentName} color="from-pink-400 to-rose-500" />
                <DetailRow icon={<User size={14} />} label="Customer" value={currentPM.customerName} color="from-blue-400 to-indigo-500" />
                <DetailRow icon={<CalendarCheck size={14} />} label="Planned Date" value={currentPM.plannedDate} color="from-amber-400 to-orange-500" />
              </div>
              <div className="pt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Pending', 'Assigned', 'Completed'].map(status => (
                    <button
                      key={status}
                      className={`py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
                        currentPM.status === status
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                      }`}
                      style={currentPM.status === status ? { background: 'linear-gradient(135deg, hsl(170, 70%, 50%), hsl(160, 65%, 45%))' } : {}}
                      onClick={() => handlePMStatus(currentPM.id, status)}
                    >
                      {status}
                    </button>
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

function DetailRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
        <span className="text-white">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
        <p className="text-xs font-semibold text-gray-700 truncate">{value}</p>
      </div>
    </div>
  );
}
