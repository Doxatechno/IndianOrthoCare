import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusType = string;

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Completed': { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', dot: 'bg-success' },
  'Active': { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', dot: 'bg-success' },
  'Paid': { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', dot: 'bg-success' },
  'In Progress': { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20', dot: 'bg-info' },
  'Assigned': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', dot: 'bg-primary' },
  'Pending': { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', dot: 'bg-warning' },
  'Quotation Sent': { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', dot: 'bg-warning' },
  'PO Released': { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20', dot: 'bg-accent' },
  'Invoice Generated': { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20', dot: 'bg-info' },
  'Payment Received': { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', dot: 'bg-success' },
  'Issue Reported': { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20', dot: 'bg-destructive' },
};

const defaultConfig = { bg: 'bg-secondary', text: 'text-secondary-foreground', border: 'border-border', dot: 'bg-muted-foreground' };

export default function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status] || defaultConfig;
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] font-semibold gap-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-sm',
        config.bg, config.text, config.border
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      {status}
    </Badge>
  );
}
