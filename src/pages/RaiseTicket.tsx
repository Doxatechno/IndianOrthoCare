import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { sb } from '@/integrations/supabase/untyped';
import { Wrench, CheckCircle2, AlertCircle, Send } from 'lucide-react';

interface EquipmentInfo {
  id: string;
  name: string;
  model_number: string;
  serial_number: string;
  customer_id: string;
  customer_name: string;
}

const issueTypes = ['Breakdown', 'PM', 'Calibration', 'Installation', 'Inspection', 'Training', 'Software Update', 'Parts Replace', 'Emergency', 'Annual Service', 'Other'];

export default function RaiseTicket() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const [equipment, setEquipment] = useState<EquipmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ location: '', issueType: '', remarks: '', contactName: '', contactPhone: '' });

  useEffect(() => {
    if (!equipmentId) return;
    (async () => {
      // Anonymous visitors cannot read the equipment table (it would expose the
      // whole installed base). This function returns only the fields this form
      // renders, for one equipment id.
      const { data, error } = await sb
        .rpc('get_equipment_for_qr', { _equipment_id: equipmentId })
        .maybeSingle();
      if (error || !data) {
        if (error) console.error('Failed to load equipment for QR:', error);
        setNotFound(true);
      } else {
        setEquipment(data);
      }
      setLoading(false);
    })();
  }, [equipmentId]);

  const handleSubmit = async () => {
    if (!equipment || !form.issueType || !form.remarks) return;
    setSubmitting(true);
    try {
      // The ticket is created server-side: it allocates the id (the old
      // client-side max+1 always resolved to TK-001 here, because anon cannot
      // read the tickets table) and fixes status and assignment itself, so a
      // caller cannot submit pre-assigned or pre-completed work.
      const { error } = await sb.rpc('create_ticket_from_qr', {
        _equipment_id: equipment.id,
        _issue_type: form.issueType,
        _remarks: form.remarks,
        _location: form.location || null,
        _contact_name: form.contactName || null,
        _contact_phone: form.contactPhone || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, hsl(270, 60%, 55%) 0%, hsl(250, 65%, 40%) 50%, hsl(240, 55%, 30%) 100%)' }}>
        <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(160deg, hsl(270, 60%, 55%) 0%, hsl(250, 65%, 40%) 50%, hsl(240, 55%, 30%) 100%)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <AlertCircle size={28} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">Equipment Not Found</h1>
          <p className="text-sm text-white/60">The scanned QR code does not match any registered equipment.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(160deg, hsl(270, 60%, 55%) 0%, hsl(250, 65%, 40%) 50%, hsl(240, 55%, 30%) 100%)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 backdrop-blur flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-lg font-bold text-white">Ticket Submitted!</h1>
          <p className="text-sm text-white/60">Your service request for <strong className="text-white/80">{equipment?.name}</strong> has been submitted. Our team will get back to you soon.</p>
          <button onClick={() => { setSubmitted(false); setForm({ location: '', issueType: '', remarks: '', contactName: '', contactPhone: '' }); }} className="px-6 py-3 rounded-2xl bg-white/15 backdrop-blur text-white text-sm font-semibold hover:bg-white/25 transition-all">
            Raise Another Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, hsl(270, 60%, 55%) 0%, hsl(250, 65%, 40%) 50%, hsl(240, 55%, 30%) 100%)' }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(280, 70%, 65%), hsl(260, 60%, 50%))' }}>
            <Wrench size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Doxa CareX</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium">Service Request</p>
          </div>
        </div>

        {/* Equipment Info Card */}
        <div className="rounded-2xl p-4 backdrop-blur-lg border border-white/10" style={{ background: 'linear-gradient(135deg, hsla(280, 60%, 60%, 0.4), hsla(260, 50%, 45%, 0.3))' }}>
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-2">Equipment Details</p>
          <p className="text-sm font-bold text-white">{equipment?.name}</p>
          <p className="text-xs text-white/60 mt-1">{equipment?.model_number} · {equipment?.serial_number}</p>
          <p className="text-xs text-white/50 mt-1">{equipment?.customer_name}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-t-[28px] min-h-[60vh] px-5 pt-6 pb-8 shadow-2xl">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Raise a Service Ticket</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Your Name</label>
            <input
              className="w-full mt-1.5 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
              placeholder="Enter your name"
              value={form.contactName}
              onChange={e => setForm({ ...form, contactName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Phone Number</label>
            <input
              className="w-full mt-1.5 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
              placeholder="Enter your phone number"
              value={form.contactPhone}
              onChange={e => setForm({ ...form, contactPhone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Location / Department</label>
            <input
              className="w-full mt-1.5 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
              placeholder="e.g. ICU, Ward B, Radiology"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Issue Type *</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {issueTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, issueType: type })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.issueType === type
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  style={form.issueType === type ? { background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' } : {}}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Description *</label>
            <textarea
              className="w-full mt-1.5 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all min-h-[100px] resize-none"
              placeholder="Describe the issue in detail..."
              value={form.remarks}
              onChange={e => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.issueType || !form.remarks}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold shadow-lg disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(250, 60%, 45%))' }}
          >
            <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
