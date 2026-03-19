import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImageOff } from "lucide-react";

type PropertyForm = {
  property_name: string; location: string; state: string; nearest_city: string;
  nearest_airport: string; wildlife_sanctuary: string; description: string;
  ideal_for: string; price_range: string; booking_url: string;
  room_types: string; experiences_available: string; images: string;
};

const emptyForm: PropertyForm = {
  property_name: "", location: "", state: "", nearest_city: "", nearest_airport: "",
  wildlife_sanctuary: "", description: "", ideal_for: "", price_range: "", booking_url: "",
  room_types: "", experiences_available: "", images: "",
};

interface PagedResponse { data: any[]; total: number; page: number; limit: number; totalPages: number; }

function useDebounceValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function PropertiesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const debouncedSearch = useDebounceValue(search);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleState = (v: string) => { setStateFilter(v); setPage(1); };

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  if (stateFilter !== "all") params.set("state", stateFilter);

  const { data: paged } = useQuery({
    queryKey: ["properties", page, debouncedSearch, stateFilter],
    queryFn: () => api.get<PagedResponse>(`/properties?${params}`),
    placeholderData: (prev) => prev,
  });

  const properties  = paged?.data       ?? [];
  const total       = paged?.total      ?? 0;
  const totalPages  = paged?.totalPages ?? 1;
  const limit       = paged?.limit      ?? 20;

  const upsert = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        room_types: form.room_types ? form.room_types.split(",").map(s => s.trim()) : [],
        experiences_available: form.experiences_available ? form.experiences_available.split(",").map(s => s.trim()) : [],
        images: form.images ? form.images.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      return editId ? api.put(`/properties/${editId}`, payload) : api.post("/properties", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      toast.success(editId ? "Property updated" : "Property added");
      setOpen(false); setEditId(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/properties/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties"] }); toast.success("Property deleted"); },
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      property_name: p.property_name, location: p.location || "", state: p.state || "",
      nearest_city: p.nearest_city || "", nearest_airport: p.nearest_airport || "",
      wildlife_sanctuary: p.wildlife_sanctuary || "", description: p.description || "",
      ideal_for: p.ideal_for || "", price_range: p.price_range || "", booking_url: p.booking_url || "",
      room_types: (p.room_types || []).join(", "),
      experiences_available: (p.experiences_available || []).join(", "),
      images: (p.images || []).join(", "),
    });
    setOpen(true);
  };

  const set = (key: keyof PropertyForm, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Properties</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-2" />Add Property</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Property</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1"><Label>Property Name *</Label><Input value={form.property_name} onChange={e => set("property_name", e.target.value)} required /></div>
              <div className="space-y-1"><Label>Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} /></div>
              <div className="space-y-1"><Label>State</Label><Input value={form.state} onChange={e => set("state", e.target.value)} /></div>
              <div className="space-y-1"><Label>Nearest City</Label><Input value={form.nearest_city} onChange={e => set("nearest_city", e.target.value)} /></div>
              <div className="space-y-1"><Label>Nearest Airport</Label><Input value={form.nearest_airport} onChange={e => set("nearest_airport", e.target.value)} /></div>
              <div className="space-y-1"><Label>Wildlife Sanctuary</Label><Input value={form.wildlife_sanctuary} onChange={e => set("wildlife_sanctuary", e.target.value)} /></div>
              <div className="space-y-1"><Label>Ideal For</Label><Input value={form.ideal_for} onChange={e => set("ideal_for", e.target.value)} /></div>
              <div className="space-y-1"><Label>Price Range</Label><Input value={form.price_range} onChange={e => set("price_range", e.target.value)} /></div>
              <div className="space-y-1"><Label>Booking URL</Label><Input value={form.booking_url} onChange={e => set("booking_url", e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label>Room Types (comma-separated)</Label><Input value={form.room_types} onChange={e => set("room_types", e.target.value)} placeholder="Deluxe, Suite, Cottage" /></div>
              <div className="col-span-2 space-y-1"><Label>Experiences (comma-separated)</Label><Input value={form.experiences_available} onChange={e => set("experiences_available", e.target.value)} placeholder="Safari, Kayaking" /></div>
              <div className="col-span-2 space-y-1">
                <Label>Images <span className="text-muted-foreground text-xs">(comma-separated URLs)</span></Label>
                <Textarea value={form.images} onChange={e => set("images", e.target.value)} placeholder="https://images.unsplash.com/..." rows={2} />
                {form.images.trim() && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {form.images.split(",").map(s => s.trim()).filter(Boolean).map((url, i) => (
                      <img key={i} src={url} alt="" className="h-16 w-24 object-cover rounded-md border" onError={e => (e.currentTarget.style.display = "none")} />
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2"><Button type="submit" disabled={upsert.isPending} className="w-full">{editId ? "Update" : "Add"} Property</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="shrink-0 flex flex-wrap gap-3">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={stateFilter} onValueChange={handleState}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All States" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
            <SelectItem value="Maharashtra">Maharashtra</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table card — flex-1 so only this scrolls */}
      <div className="flex-1 min-h-0 bg-card rounded-xl border flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground sticky top-0 bg-card z-10">
                <th className="p-3 font-medium w-14"></th>
                <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Location</th>
                <th className="p-3 font-medium">State</th><th className="p-3 font-medium">Price Range</th>
                <th className="p-3 font-medium">Room Types</th><th className="p-3 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="p-2">
                    {(p.images?.[0] || null)
                      ? <img src={p.images[0]} alt="" className="h-10 w-14 object-cover rounded-md border" onError={e => (e.currentTarget.style.display = "none")} />
                      : <div className="h-10 w-14 rounded-md border bg-muted flex items-center justify-center"><ImageOff size={14} className="text-muted-foreground" /></div>}
                  </td>
                  <td className="p-3 font-medium">{p.property_name}</td>
                  <td className="p-3 text-muted-foreground">{p.location || "—"}</td>
                  <td className="p-3">{p.state || "—"}</td>
                  <td className="p-3">{p.price_range || "—"}</td>
                  <td className="p-3">{(p.room_types || []).join(", ") || "—"}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(p.id)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {properties.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No properties yet. Add your first resort!</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
      </div>
    </div>
  );
}
