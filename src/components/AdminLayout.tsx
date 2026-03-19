import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, BedDouble, Sparkles, Users, LogOut } from "lucide-react";
import { clearAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/properties", icon: Building2, label: "Properties" },
  { to: "/rooms", icon: BedDouble, label: "Rooms" },
  { to: "/experiences", icon: Sparkles, label: "Experiences" },
  { to: "/leads", icon: Users, label: "Leads" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-sidebar flex flex-col shrink-0 h-screen">
        <div className="p-6 shrink-0">
          <h1 className="font-display text-xl font-bold text-sidebar-primary-foreground tracking-tight">
            <span className="text-sidebar-primary">Tathastu</span>
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Resort Lead Management</p>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scroll">
          {navItems.map((item) => {
            const active = location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}>
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 shrink-0 border-t border-sidebar-border">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      {/* overflow-hidden — each page controls its own scroll regions */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col p-8">
          <div className="flex-1 min-h-0 flex flex-col max-w-7xl mx-auto w-full animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
