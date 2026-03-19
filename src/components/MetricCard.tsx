import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
}

export default function MetricCard({ title, value, icon: Icon, className, iconClassName }: MetricCardProps) {
  return (
    <div className={cn("bg-card rounded-xl border p-6 flex items-start justify-between", className)}>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-display font-bold mt-1">{value}</p>
      </div>
      <div className={cn("p-3 rounded-lg bg-primary/10", iconClassName)}>
        <Icon size={22} className="text-primary" />
      </div>
    </div>
  );
}
