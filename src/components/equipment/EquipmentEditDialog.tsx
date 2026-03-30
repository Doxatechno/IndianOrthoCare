import { Equipment, Customer } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editForm: Equipment | null;
  setEditForm: (e: Equipment | null) => void;
  customers: Customer[];
  onSave: () => Promise<void>;
}

export default function EquipmentEditDialog({ open, onOpenChange, editForm, setEditForm, customers, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader><DialogTitle className="font-display">Edit Equipment</DialogTitle></DialogHeader>
        {editForm && (
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Equipment Name</Label>
              <Input className="mt-1.5 rounded-xl" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Model Number</Label>
              <Input className="mt-1.5 rounded-xl" value={editForm.modelNumber} onChange={e => setEditForm({ ...editForm, modelNumber: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Serial Number</Label>
              <Input className="mt-1.5 rounded-xl" value={editForm.serialNumber} onChange={e => setEditForm({ ...editForm, serialNumber: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Customer</Label>
              <Select value={editForm.customerId} onValueChange={v => setEditForm({ ...editForm, customerId: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onSave} className="w-full mt-3 rounded-xl h-11 font-semibold">Save Changes</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
