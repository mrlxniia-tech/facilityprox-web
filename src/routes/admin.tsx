import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Shield, Home, User as UserIcon, Check, X } from "lucide-react";
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
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!roles.includes("admin")) {
      toast.error("Accès admin requis");
      navigate({ to: "/" });
    }
  }, [loading, user, roles, navigate]);

  const { data: requests } = useQuery({
    enabled: roles.includes("admin"),
    queryKey: ["admin-owner-requests"],
    queryFn: async () => {
      const [{ data: reqs }, { data: profiles }] = await Promise.all([
        supabase.from("owner_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name"),
      ]);
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return (reqs ?? []).map((r) => ({ ...r, full_name: pmap.get(r.user_id) ?? "Sans nom" }));
    },
  });

  const decideRequest = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("owner_requests")
      .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approuvée" : "Refusée");
    qc.invalidateQueries({ queryKey: ["admin-owner-requests"] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const { data: users, isLoading } = useQuery({
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

  const pendingReqs = requests?.filter((r) => r.status === "pending") ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-5xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 space-y-10">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><Shield className="h-6 w-6" style={{ color: teal }} /> Administration</h1>
          <p className="text-sm text-muted-foreground">Demandes propriétaire et gestion des rôles.</p>
        </div>

        <section>
          <h2 className="text-xl font-bold mb-3">Demandes propriétaire {pendingReqs.length > 0 && <span className="text-sm rounded-full px-2 py-0.5 ml-2" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>{pendingReqs.length}</span>}</h2>
          {(!requests || requests.length === 0) && <p className="text-sm text-muted-foreground">Aucune demande.</p>}
          <div className="space-y-2">
            {requests?.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/15 p-4 flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{r.full_name}</div>
                  {r.message && <p className="text-sm text-muted-foreground italic mt-1">"{r.message}"</p>}
                  <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <button onClick={() => decideRequest(r.id, "approved")} className="flex items-center gap-1 text-xs rounded px-3 py-1.5 font-semibold" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>
                      <Check className="h-3 w-3" /> Approuver
                    </button>
                    <button onClick={() => decideRequest(r.id, "rejected")} className="flex items-center gap-1 text-xs rounded px-3 py-1.5 border border-red-500/40 text-red-400">
                      <X className="h-3 w-3" /> Refuser
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs rounded-full px-3 py-1 ${r.status === "approved" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    {r.status === "approved" ? "Approuvée" : "Refusée"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Utilisateurs & rôles</h2>
          {isLoading && <p>Chargement…</p>}
          <div className="space-y-2">
            {users?.map((u) => (
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
        </section>

        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm">
          <p className="font-bold mb-1">⚠️ Premier administrateur</p>
          <p className="text-muted-foreground">
            Pour créer le tout premier admin : <code className="bg-white/10 px-1 rounded">INSERT INTO user_roles (user_id, role) VALUES ('VOTRE_USER_ID', 'admin');</code>
          </p>
        </div>
      </main>
    </div>
  );
}
