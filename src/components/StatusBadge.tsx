import { cn } from "@/lib/utils";

type Status = "hot" | "warm" | "cold";

const statusStyles: Record<Status, string> = {
  hot: "bg-hot/10 text-hot border-hot/20",
  warm: "bg-warm/10 text-warm border-warm/20",
  cold: "bg-cold/10 text-cold border-cold/20",
};

export default function StatusBadge({ status }: { status: Status | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize", statusStyles[status])}>
      {status}
    </span>
  );
}
