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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ImageOff } from "lucide-react";

interface PagedResponse { data: any[]; total: number; page: number; limit: number; totalPages: number; }

type Variant = {
  _key: string; // local-only key for React
  variant_name: string;
  price: string;
  currency: string;
  group_size_min: string;
  group_size_max: string;
  duration_minutes: string;
  includes: string;
  is_available: boolean;
};

type ExpForm = {
  experience_name: string;
  property_id: string;
  category: string;
  description: string;
  duration: string;
  availability: string;
  images: string;
};

const emptyForm: ExpForm = {
  experience_name: "", property_id: "", category: "", description: "", duration: "", availability: "", images: "",
};

const emptyVariant = (): Variant => ({
  _key: crypto.randomUUID(),
  variant_name: "", price: "", currency: "INR",
  group_size_min: "1", group_size_max: "1",
  duration_minutes: "", includes: "", is_available: true,
});

const AVAILABILITY_OPTIONS = ["Year-round", "Oct–June", "Oct–May", "Oct–March", "Nov–May"];
const CATEGORY_OPTIONS = [
  { value: "safari",    label: "Safari" },
  { value: "adventure", label: "Adventure" },
  { value: "cultural",  label: "Cultural" },
  { value: "dining",    label: "Dining" },
  { value: "wellness",  label: "Wellness" },
  { value: "other",     label: "Other" },
];
const CATEGORY_COLORS: Record<string, string> = {
  safari: "bg-amber-100 text-amber-800",
  adventure: "bg-green-100 text-green-800",
  cultural: "bg-purple-100 text-purple-800",
  dining: "bg-rose-100 text-rose-800",
  wellness: "bg-blue-100 text-blue-800",
  other: "bg-gray-100 text-gray-700",
};

function useDebounceValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function variantToDoc(v: Variant) {
  return {
    variant_name: v.variant_name,
    price: Number(v.price) || 0,
    currency: v.currency || "INR",
    group_size_min: Number(v.group_size_min) || 1,
    group_size_max: Number(v.group_size_max) || 1,
    duration_minutes: v.duration_minutes ? Number(v.duration_minutes) : null,
    includes: v.includes.split(",").map(s => s.trim()).filter(Boolean),
    is_available: v.is_available,
  };
}

function docToVariant(d: any): Variant {
  return {
    _key: crypto.randomUUID(),
    variant_name: d.variant_name || "",
    price: String(d.price ?? ""),
    currency: d.currency || "INR",
    group_size_min: String(d.group_size_min ?? "1"),
    group_size_max: String(d.group_size_max ?? "1"),
    duration_minutes: d.duration_minutes != null ? String(d.duration_minutes) : "",
    includes: (d.includes || []).join(", "),
    is_available: d.is_available ?? true,
  };
}

function VariantRow({ v, onChange, onDelete }: { v: Variant; onChange: (v: Variant) => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const set = (key: keyof Variant, val: any) => onChange({ ...v, [key]: val });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
        <span className="flex-1 text-sm font-medium truncate">{v.variant_name || <span className="text-muted-foreground italic">New variant</span>}</span>
        {v.price && <span className="text-sm text-muted-foreground">₹{Number(v.price).toLocaleString("en-IN")}</span>}
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(x => !x)}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}><Trash2 size={13} className="text-destructive" /></Button>
      </div>
      {expanded && (
        <div className="p-3 space-y-3 bg-background">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Variant Name *</Label>
              <Input value={v.variant_name} onChange={e => set("variant_name", e.target.value)} placeholder="e.g. Private Jeep (up to 4)" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price (₹) *</Label>
              <Input type="number" min="0" value={v.price} onChange={e => set("price", e.target.value)} placeholder="4500" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Min Group Size</Label>
              <Input type="number" min="1" value={v.group_size_min} onChange={e => set("group_size_min", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Group Size</Label>
              <Input type="number" min="1" value={v.group_size_max} onChange={e => set("group_size_max", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration (min)</Label>
              <Input type="number" min="0" value={v.duration_minutes} onChange={e => set("duration_minutes", e.target.value)} placeholder="120" className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Includes <span className="text-muted-foreground">(comma-separated)</span></Label>
            <Input value={v.includes} onChange={e => set("includes", e.target.value)} placeholder="Naturalist guide, Entry permit, Refreshments" className="h-8 text-sm" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={v.is_available} onChange={e => set("is_available", e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-xs font-medium">Available</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default function ExperiencesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpForm>(emptyForm);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const debouncedSearch = useDebounceValue(search);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  if (propertyFilter !== "all") params.set("property_id", propertyFilter);
  if (availabilityFilter !== "all") params.set("availability", availabilityFilter);
  if (categoryFilter !== "all") params.set("category", categoryFilter);

  const { data: paged } = useQuery({
    queryKey: ["experiences", page, debouncedSearch, propertyFilter, availabilityFilter, categoryFilter],
    queryFn: () => api.get<PagedResponse>(`/experiences?${params}`),
    placeholderData: (prev) => prev,
  });

  const experiences = paged?.data       ?? [];
  const total       = paged?.total      ?? 0;
  const totalPages  = paged?.totalPages ?? 1;
  const limit       = paged?.limit      ?? 20;

  const { data: propPaged } = useQuery({
    queryKey: ["properties-all"],
    queryFn: () => api.get<PagedResponse>("/properties?limit=100"),
  });
  const properties = propPaged?.data ?? [];

  const upsert = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        property_id: form.property_id || null,
        category: form.category || null,
        variants: variants.map(variantToDoc),
        images: form.images ? form.images.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      return editId ? api.put(`/experiences/${editId}`, payload) : api.post("/experiences", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiences"] });
      toast.success(editId ? "Experience updated" : "Experience added");
      setOpen(false); setEditId(null); setForm(emptyForm); setVariants([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/experiences/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["experiences"] }); toast.success("Experience deleted"); },
  });

  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({
      experience_name: e.experience_name,
      property_id: e.property_id || "",
      category: e.category || "",
      description: e.description || "",
      duration: e.duration || "",
      availability: e.availability || "",
      images: (e.images || []).join(", "),
    });
    setVariants((e.variants || []).map(docToVariant));
    setOpen(true);
  };

  const closeDialog = () => { setOpen(false); setEditId(null); setForm(emptyForm); setVariants([]); };

  const set = (key: keyof ExpForm, val: string) => setForm(f => ({ ...f, [key]: val }));

  const priceRange = (exp: any) => {
    const vs: any[] = exp.variants || [];
    if (vs.length === 0) return exp.price || "—";
    const prices = vs.map((v: any) => v.price).filter((p: any) => typeof p === "number");
    if (prices.length === 0) return "—";
    const mn = Math.min(...prices), mx = Math.max(...prices);
    return mn === mx ? `₹${mn.toLocaleString("en-IN")}` : `₹${mn.toLocaleString("en-IN")}–${mx.toLocaleString("en-IN")}`;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Experiences</h2>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(v); }}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-2" />Add Experience</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Experience</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4 pb-2">

              <div className="space-y-1">
                <Label>Experience Name *</Label>
                <Input value={form.experience_name} onChange={e => set("experience_name", e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Property</Label>
                  <Select value={form.property_id} onValueChange={v => set("property_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category || "none"} onValueChange={v => set("category", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Duration</Label>
                  <Input value={form.duration} onChange={e => set("duration", e.target.value)} placeholder="3 hours" />
                </div>
                <div className="space-y-1">
                  <Label>Availability</Label>
                  <Select value={form.availability || "custom"} onValueChange={v => set("availability", v === "custom" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select or type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom…</SelectItem>
                      {AVAILABILITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(!AVAILABILITY_OPTIONS.includes(form.availability) && form.availability !== "") && (
                    <Input value={form.availability} onChange={e => set("availability", e.target.value)} placeholder="e.g. Oct–June" className="mt-1" />
                  )}
                </div>
              </div>

              {/* Variants */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pricing Variants</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setVariants(vs => [...vs, emptyVariant()])}>
                    <Plus size={13} className="mr-1" />Add Variant
                  </Button>
                </div>
                {variants.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 text-center border border-dashed rounded-lg">No variants yet — add at least one with pricing</p>
                )}
                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <VariantRow
                      key={v._key}
                      v={v}
                      onChange={(updated) => setVariants(vs => vs.map((x, j) => j === i ? updated : x))}
                      onDelete={() => setVariants(vs => vs.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
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

              <Button type="submit" disabled={upsert.isPending} className="w-full">{editId ? "Update" : "Add"} Experience</Button>
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
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={v => { setAvailabilityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Availability" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Availability</SelectItem>
            {AVAILABILITY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Property</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Duration</th>
                <th className="p-3 font-medium">Pricing</th>
                <th className="p-3 font-medium">Availability</th>
                <th className="p-3 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {experiences.map((exp: any) => (
                <tr key={exp.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="p-2">
                    {(exp.images?.[0] || null)
                      ? <img src={exp.images[0]} alt="" className="h-10 w-14 object-cover rounded-md border" onError={e => (e.currentTarget.style.display = "none")} />
                      : <div className="h-10 w-14 rounded-md border bg-muted flex items-center justify-center"><ImageOff size={14} className="text-muted-foreground" /></div>}
                  </td>
                  <td className="p-3 font-medium">{exp.experience_name}</td>
                  <td className="p-3 text-muted-foreground">{exp.properties?.property_name || "—"}</td>
                  <td className="p-3">
                    {exp.category
                      ? <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.other}`}>{exp.category}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">{exp.duration || "—"}</td>
                  <td className="p-3">
                    <div className="font-medium">{priceRange(exp)}</div>
                    {(exp.variants?.length > 0) && (
                      <div className="text-xs text-muted-foreground">{exp.variants.length} variant{exp.variants.length > 1 ? "s" : ""}</div>
                    )}
                  </td>
                  <td className="p-3">{exp.availability || "—"}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(exp)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(exp.id)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {experiences.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No experiences yet</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
      </div>
    </div>
  );
}
