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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, ImageOff } from "lucide-react";

interface PagedResponse { data: any[]; total: number; page: number; limit: number; totalPages: number; }

type RoomForm = {
  resort_name: string;
  property_id: string;
  location: string;
  room_name: string;
  room_type: string;
  description: string;
  price_per_night: string;
  max_guests: string;
  room_count: string;
  meals_included: string;
  view: string;
  bed_type: string;
  currency: string;
  is_refundable: boolean;
  is_available: boolean;
  amenities: string;
  suitable_for: string;
  experience_tags: string;
  image_url: string;
  images: string;
};

const emptyForm: RoomForm = {
  resort_name: "", property_id: "", location: "", room_name: "", room_type: "Cottage",
  description: "", price_per_night: "", max_guests: "", room_count: "", meals_included: "",
  view: "", bed_type: "", currency: "INR", is_refundable: true, is_available: true,
  amenities: "", suitable_for: "", experience_tags: "", image_url: "", images: "",
};

const ROOM_TYPES = ["Cottage", "Suite", "Villa", "Deluxe", "Tent Suite", "Dormitory"];
const MEAL_OPTIONS = [
  { value: "EP", label: "EP — No meals" },
  { value: "CP", label: "CP — Breakfast only" },
  { value: "MAP", label: "MAP — Breakfast + Dinner" },
  { value: "AP", label: "AP — All meals" },
];
const BED_TYPES = ["Single", "Twin", "Double", "King", "Bunk"];
const MEAL_LABELS: Record<string, string> = { EP: "No meals", CP: "Breakfast", MAP: "B+D", AP: "All meals" };

function useDebounceValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function RoomsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const debouncedSearch = useDebounceValue(search);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  if (propertyFilter !== "all") params.set("property_id", propertyFilter);
  if (roomTypeFilter !== "all") params.set("room_type", roomTypeFilter);

  const { data: paged } = useQuery({
    queryKey: ["rooms", page, debouncedSearch, propertyFilter, roomTypeFilter],
    queryFn: () => api.get<PagedResponse>(`/rooms?${params}`),
    placeholderData: (prev) => prev,
  });

  const rooms = paged?.data ?? [];
  const total = paged?.total ?? 0;
  const totalPages = paged?.totalPages ?? 1;
  const limit = paged?.limit ?? 20;

  const { data: propPaged } = useQuery({
    queryKey: ["properties-all"],
    queryFn: () => api.get<PagedResponse>("/properties?limit=100"),
  });
  const properties = propPaged?.data ?? [];

  const set = (key: keyof RoomForm, val: any) => setForm(f => ({ ...f, [key]: val }));

  // When property is selected, auto-fill resort_name and location
  const handlePropertySelect = (propId: string) => {
    const prop = properties.find((p: any) => p.id === propId);
    set("property_id", propId);
    if (prop) {
      setForm(f => ({ ...f, property_id: propId, resort_name: prop.property_name, location: prop.location || f.location }));
    }
  };

  const buildPayload = () => ({
    resort_name: form.resort_name,
    property_id: form.property_id || null,
    location: form.location,
    room_name: form.room_name,
    room_type: form.room_type,
    description: form.description,
    price_per_night: Number(form.price_per_night) || 0,
    max_guests: Number(form.max_guests) || 1,
    room_count: form.room_count ? Number(form.room_count) : null,
    meals_included: form.meals_included || null,
    view: form.view || null,
    bed_type: form.bed_type || null,
    currency: form.currency || "INR",
    is_refundable: form.is_refundable,
    is_available: form.is_available,
    amenities: form.amenities.split(",").map(s => s.trim()).filter(Boolean),
    suitable_for: form.suitable_for.split(",").map(s => s.trim()).filter(Boolean),
    experience_tags: form.experience_tags.split(",").map(s => s.trim()).filter(Boolean),
    image_url: form.image_url || null,
    images: form.images ? form.images.split(",").map(s => s.trim()).filter(Boolean) : [],
  });

  const upsert = useMutation({
    mutationFn: () => editId ? api.put(`/rooms/${editId}`, buildPayload()) : api.post("/rooms", buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      toast.success(editId ? "Room updated" : "Room added");
      setOpen(false); setEditId(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rooms"] }); toast.success("Room deleted"); },
  });

  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      resort_name: r.resort_name || "",
      property_id: r.property_id || "",
      location: r.location || "",
      room_name: r.room_name || "",
      room_type: r.room_type || "Cottage",
      description: r.description || "",
      price_per_night: String(r.price_per_night || ""),
      max_guests: String(r.max_guests || ""),
      room_count: r.room_count != null ? String(r.room_count) : "",
      meals_included: r.meals_included || "",
      view: r.view || "",
      bed_type: r.bed_type || "",
      currency: r.currency || "INR",
      is_refundable: r.is_refundable ?? true,
      is_available: r.is_available ?? true,
      amenities: (r.amenities || []).join(", "),
      suitable_for: (r.suitable_for || []).join(", "),
      experience_tags: (r.experience_tags || []).join(", "),
      image_url: r.image_url || "",
      images: (r.images || []).join(", "),
    });
    setOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Rooms</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-2" />Add Room</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Room</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4 pb-2">

              {/* Property & Resort */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Property</Label>
                  <Select value={form.property_id} onValueChange={handlePropertySelect}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Resort Name *</Label>
                  <Input value={form.resort_name} onChange={e => set("resort_name", e.target.value)} required />
                </div>
              </div>

              {/* Room Name & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Room Name *</Label>
                  <Input value={form.room_name} onChange={e => set("room_name", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Room Type *</Label>
                  <Select value={form.room_type} onValueChange={v => set("room_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROOM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Pench, Seoni District, Madhya Pradesh" />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={e => set("description", e.target.value)} required rows={3} />
              </div>

              {/* Price, Max Guests, Room Count */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Price/Night (₹) *</Label>
                  <Input type="number" min="0" value={form.price_per_night} onChange={e => set("price_per_night", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Max Guests *</Label>
                  <Input type="number" min="1" value={form.max_guests} onChange={e => set("max_guests", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Room Count</Label>
                  <Input type="number" min="1" value={form.room_count} onChange={e => set("room_count", e.target.value)} placeholder="e.g. 6" />
                </div>
              </div>

              {/* Meals, Bed Type, View */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Meals Included</Label>
                  <Select value={form.meals_included || "none"} onValueChange={v => set("meals_included", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / EP</SelectItem>
                      {MEAL_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Bed Type</Label>
                  <Select value={form.bed_type || "none"} onValueChange={v => set("bed_type", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {BED_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>View</Label>
                  <Input value={form.view} onChange={e => set("view", e.target.value)} placeholder="e.g. Forest view" />
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-1">
                <Label>Amenities <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                <Input value={form.amenities} onChange={e => set("amenities", e.target.value)} placeholder="AC, Private pool, Butler service" />
              </div>

              {/* Suitable For + Experience Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Suitable For <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                  <Input value={form.suitable_for} onChange={e => set("suitable_for", e.target.value)} placeholder="couple, solo, group" />
                </div>
                <div className="space-y-1">
                  <Label>Experience Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                  <Input value={form.experience_tags} onChange={e => set("experience_tags", e.target.value)} placeholder="wildlife, safari, romantic" />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.is_available} onChange={e => set("is_available", e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-medium">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.is_refundable} onChange={e => set("is_refundable", e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-medium">Refundable</span>
                </label>
              </div>

              {/* Images */}
              <div className="space-y-1">
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

              <Button type="submit" disabled={upsert.isPending} className="w-full">{editId ? "Update" : "Add"} Room</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="shrink-0 flex flex-wrap gap-3">
        <Input placeholder="Search by name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={propertyFilter} onValueChange={v => { setPropertyFilter(v); setPage(1); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Properties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roomTypeFilter} onValueChange={v => { setRoomTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ROOM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-card rounded-xl border flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground sticky top-0 bg-card z-10">
                <th className="p-3 font-medium w-14"></th>
                <th className="p-3 font-medium">Room</th>
                <th className="p-3 font-medium">Property</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Price/night</th>
                <th className="p-3 font-medium">Guests</th>
                <th className="p-3 font-medium">Meals</th>
                <th className="p-3 font-medium">View</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="p-2">
                    {(r.images?.[0] || r.image_url || null)
                      ? <img src={r.images?.[0] || r.image_url} alt="" className="h-10 w-14 object-cover rounded-md border" onError={e => (e.currentTarget.style.display = "none")} />
                      : <div className="h-10 w-14 rounded-md border bg-muted flex items-center justify-center"><ImageOff size={14} className="text-muted-foreground" /></div>}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.room_name}</div>
                    {r.bed_type && <div className="text-xs text-muted-foreground">{r.bed_type} bed{r.room_count ? ` · ${r.room_count} rooms` : ""}</div>}
                  </td>
                  <td className="p-3 text-muted-foreground">{r.properties?.property_name || r.resort_name || "—"}</td>
                  <td className="p-3"><Badge variant="outline">{r.room_type}</Badge></td>
                  <td className="p-3 font-medium">₹{r.price_per_night?.toLocaleString("en-IN")}</td>
                  <td className="p-3">{r.max_guests}</td>
                  <td className="p-3 text-muted-foreground">{r.meals_included ? MEAL_LABELS[r.meals_included] || r.meals_included : "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.view || "—"}</td>
                  <td className="p-3">
                    {r.is_available
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={13} />Available</span>
                      : <span className="flex items-center gap-1 text-muted-foreground text-xs"><XCircle size={13} />Unavailable</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(r.id)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No rooms yet</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
      </div>
    </div>
  );
}
