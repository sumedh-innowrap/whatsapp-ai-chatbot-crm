import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onPage }: Props) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={16} />
        </Button>
        <span className="px-2 font-medium text-foreground">{page} / {totalPages}</span>
        <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
