import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function useDebounceValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface LeadListResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function LeadsPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatus]   = useState(searchParams.get("status") || "all");
  const [bookingFilter, setBooking] = useState(searchParams.get("booking") || "all");
  const [search, setSearch]         = useState("");
  const debouncedSearch             = useDebounceValue(search);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const qc = useQueryClient();

  // Reset to page 1 when filters change
  const handleStatus  = (v: string) => { setStatus(v);  setPage(1); };
  const handleBooking = (v: string) => { setBooking(v); setPage(1); };
  const handleSearch  = (v: string) => { setSearch(v);  setPage(1); };

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (bookingFilter !== "all") params.set("booking", bookingFilter);
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

  const deleteLead = useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data, isFetching } = useQuery({
    queryKey: ["leads", page, statusFilter, bookingFilter, debouncedSearch],
    queryFn: () => api.get<LeadListResponse>(`/leads?${params}`),
    placeholderData: (prev) => prev,
  });

  const leads      = data?.data      ?? [];
  const total      = data?.total     ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const limit      = data?.limit     ?? 20;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Leads</h2>
        {isFetching && <span className="text-xs text-muted-foreground">Refreshing...</span>}
      </div>

      <div className="shrink-0 flex flex-wrap gap-3">
        <Input
          placeholder="Search name or phone..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={handleStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bookingFilter} onValueChange={handleBooking}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="not_booked">Not Booked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table card — flex-1 so only this scrolls, page stays static */}
      <div className="flex-1 min-h-0 bg-card rounded-xl border flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground sticky top-0 bg-card z-10">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Trip Type</th>
                <th className="p-3 font-medium">Travel Date</th>
                <th className="p-3 font-medium">Property</th>
                <th className="p-3 font-medium">Score</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Booked</th>
                <th className="p-3 font-medium">Last Updated</th>
                <th className="p-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="p-3">
                    <Link to={`/leads/${lead.id}`} className="text-primary hover:underline font-medium">
                      {lead.name || "Unknown"}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{lead.phone_number}</td>
                  <td className="p-3">{lead.trip_type || "—"}</td>
                  <td className="p-3">{lead.travel_date || "—"}</td>
                  <td className="p-3">{lead.properties?.property_name || "—"}</td>
                  <td className="p-3 font-display font-bold">{lead.lead_score ?? 0}</td>
                  <td className="p-3"><StatusBadge status={lead.lead_status} /></td>
                  <td className="p-3">{lead.booking_confirmed ? "✅" : "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {lead.updated_at ? format(new Date(lead.updated_at), "MMM d, HH:mm") : "—"}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.preventDefault(); setDeleteTarget({ id: lead.id, name: lead.name || "Unknown" }); }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No leads found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lead, all conversation history, and collected intent data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteTarget && deleteLead.mutate(deleteTarget.id)}
            >
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
