import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Flame, Sun, Snowflake, CheckCircle } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: metrics } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<{ total: number; hot: number; warm: number; cold: number; converted: number }>("/dashboard"),
  });

  const { data: leadsResp } = useQuery({
    queryKey: ["leads", 1, "all", "all", ""],
    queryFn: () => api.get<{ data: any[] }>("/leads?limit=10"),
  });
  const leads = leadsResp?.data ?? [];

  return (
    <div className="overflow-y-auto custom-scroll flex-1 min-h-0 pb-2">
      <h2 className="text-2xl font-display font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="cursor-pointer" onClick={() => navigate("/leads")}>
          <MetricCard title="Total Leads" value={metrics?.total ?? 0} icon={Users} className="hover:border-primary/50 transition-colors" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/leads?status=hot")}>
          <MetricCard title="Hot Leads" value={metrics?.hot ?? 0} icon={Flame} iconClassName="bg-hot/10" className="hover:border-primary/50 transition-colors" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/leads?status=warm")}>
          <MetricCard title="Warm Leads" value={metrics?.warm ?? 0} icon={Sun} iconClassName="bg-warm/10" className="hover:border-primary/50 transition-colors" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/leads?status=cold")}>
          <MetricCard title="Cold Leads" value={metrics?.cold ?? 0} icon={Snowflake} iconClassName="bg-cold/10" className="hover:border-primary/50 transition-colors" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/leads?booking=booked")}>
          <MetricCard title="Converted" value={metrics?.converted ?? 0} icon={CheckCircle} iconClassName="bg-success/10" className="hover:border-primary/50 transition-colors" />
        </div>
      </div>
      <div className="bg-card rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-display font-semibold">Recent Leads</h3>
          <Link to="/leads" className="text-sm text-primary hover:underline">See all leads →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Trip Type</th>
                <th className="p-3 font-medium">Travel Date</th>
                <th className="p-3 font-medium">Property</th>
                <th className="p-3 font-medium">Score</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Booked</th>
              </tr>
            </thead>
            <tbody className="block max-h-80 overflow-y-auto" style={{ display: "table-row-group" }}>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="p-3"><Link to={`/leads/${lead.id}`} className="text-primary hover:underline font-medium">{lead.name || "Unknown"}</Link></td>
                  <td className="p-3 text-muted-foreground">{lead.phone_number}</td>
                  <td className="p-3">{lead.trip_type || "—"}</td>
                  <td className="p-3">{lead.travel_date || "—"}</td>
                  <td className="p-3">{lead.properties?.property_name || "—"}</td>
                  <td className="p-3 font-display font-bold">{lead.lead_score}</td>
                  <td className="p-3"><StatusBadge status={lead.lead_status} /></td>
                  <td className="p-3">{lead.booking_confirmed ? "✅" : "—"}</td>
                </tr>
              ))}
              {leads.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No leads yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
