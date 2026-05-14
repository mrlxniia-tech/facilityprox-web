import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Shield, Home, User as UserIcon } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Administration — FacilityProx" }] }),
});

const teal = "oklch(0.78 0.13 195)";
type Role = "admin" | "owner" | "client";
const ALL_ROLES: Role[] = ["client", "owner", "admin"];

function AdminPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate({ to: "/auth" });
    if (!roles.includes("admin")) {
      toast.error("Accès admin requis");
      navigate({ to: "/" });
    }
  }, [loading, user, roles, navigate]);

  const { data, isLoading } = useQuery({
    enabled: roles.includes("admin"),
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: allRoles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const map = new Map<string, Role[]>();
      (allRoles ?? []).forEach((r) => {
        const list = map.get(r.user_id) ?? [];
        list.push(r.role as Role);
        map.set(r.user_id, list);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
  });

  const toggleRole = async (userId: string, role: Role, has: boolean) => {
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-5xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><Shield className="h-6 w-6" style={{ color: teal }} /> Administration</h1>
        <p className="text-sm text-muted-foreground mb-6">Gérez les rôles des utilisateurs de la plateforme.</p>

        {isLoading && <p>Chargement…</p>}

        <div className="space-y-2">
          {data?.map((u) => (
            <div key={u.id} className="rounded-xl border border-white/15 p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  <UserIcon className="h-4 w-4" /> {u.full_name || "Sans nom"}
                </div>
                <div className="text-xs text-muted-foreground truncate">{u.id}</div>
                {u.phone && <div className="text-xs text-muted-foreground">{u.phone}</div>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {ALL_ROLES.map((r) => {
                  const has = u.roles.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRole(u.id, r, has)}
                      className="text-xs rounded px-3 py-1.5 font-semibold border transition"
                      style={has
                        ? { background: teal, color: "oklch(0.15 0.02 200)", borderColor: teal }
                        : { borderColor: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.7)" }}
                    >
                      {r === "admin" && <Shield className="inline h-3 w-3 mr-1" />}
                      {r === "owner" && <Home className="inline h-3 w-3 mr-1" />}
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm">
          <p className="font-bold mb-1">⚠️ Premier administrateur</p>
          <p className="text-muted-foreground">
            Pour créer le tout premier admin, contactez le support ou utilisez l'éditeur SQL : <code className="bg-white/10 px-1 rounded">INSERT INTO user_roles (user_id, role) VALUES ('VOTRE_USER_ID', 'admin');</code>
          </p>
        </div>
      </main>
    </div>
  );
}
