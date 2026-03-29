import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusType = string;

const statusStyles: Record<string, string> = {
  'Completed': 'bg-success/10 text-success border-success/20',
  'Active': 'bg-success/10 text-success border-success/20',
  'Paid': 'bg-success/10 text-success border-success/20',
  'In Progress': 'bg-info/10 text-info border-info/20',
  'Assigned': 'bg-info/10 text-info border-info/20',
  'Pending': 'bg-warning/10 text-warning border-warning/20',
  'Quotation Sent': 'bg-warning/10 text-warning border-warning/20',
  'Payment Pending': 'bg-warning/10 text-warning border-warning/20',
  'Approved': 'bg-accent/10 text-accent border-accent/20',
  'Issue Reported': 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function StatusBadge({ status }: { status: StatusType }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', statusStyles[status] || 'bg-secondary text-secondary-foreground border-border')}>
      {status}
    </Badge>
  );
}
