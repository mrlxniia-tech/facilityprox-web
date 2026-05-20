import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Shield, Home, User as UserIcon, Check, X, Mail, Trash2, UserPlus } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { adminCreateUser } from "@/lib/admin-users.functions";

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

  const { data: messages } = useQuery({
    enabled: roles.includes("admin"),
    queryKey: ["admin-contact-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const toggleRead = async (id: string, is_read: boolean) => {
    const { error } = await supabase.from("contact_messages").update({ is_read: !is_read }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-contact-messages"] });
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    qc.invalidateQueries({ queryKey: ["admin-contact-messages"] });
  };

  const pendingReqs = requests?.filter((r) => r.status === "pending") ?? [];
  const unreadCount = messages?.filter((m) => !m.is_read).length ?? 0;

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

        <CreateUserCard onCreated={() => qc.invalidateQueries({ queryKey: ["admin-users"] })} />

        <UserRoleSection id="admins" title="Administrateurs" icon={<Shield className="h-5 w-5" style={{ color: teal }} />} role="admin" users={users} loading={isLoading} toggleRole={toggleRole} />
        <UserRoleSection id="owners" title="Propriétaires" icon={<Home className="h-5 w-5" style={{ color: teal }} />} role="owner" users={users} loading={isLoading} toggleRole={toggleRole} />
        <UserRoleSection id="clients" title="Clients" icon={<UserIcon className="h-5 w-5" style={{ color: teal }} />} role="client" users={users} loading={isLoading} toggleRole={toggleRole} clientsFallback />


        <section>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5" style={{ color: teal }} /> Messages reçus
            {unreadCount > 0 && <span className="text-xs rounded-full px-2 py-0.5" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>{unreadCount} non lus</span>}
          </h2>
          {(!messages || messages.length === 0) && <p className="text-sm text-muted-foreground">Aucun message.</p>}
          <div className="space-y-2">
            {messages?.map((m) => (
              <div key={m.id} className={`rounded-xl border p-4 ${m.is_read ? "border-white/10 bg-white/[0.01]" : "border-white/25 bg-white/[0.04]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-bold flex items-center gap-2">
                      {!m.is_read && <span className="inline-block h-2 w-2 rounded-full" style={{ background: teal }} />}
                      {m.name}
                    </div>
                    <a href={`mailto:${m.email}`} className="text-xs text-muted-foreground hover:underline">{m.email}</a>
                    {m.subject && <div className="text-xs mt-0.5">Sujet : <span className="font-semibold">{m.subject}</span></div>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                    <button onClick={() => toggleRead(m.id, m.is_read)} className="rounded px-2 py-1 border border-white/20 hover:bg-white/5">
                      {m.is_read ? "Marquer non lu" : "Marquer lu"}
                    </button>
                    <button onClick={() => deleteMessage(m.id)} className="rounded p-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{m.message}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}

type UserRow = { id: string; full_name: string | null; phone: string | null; created_at: string; roles: Role[] };

function UserRoleSection({
  id, title, icon, role, users, loading, toggleRole, clientsFallback,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  role: Role;
  users: UserRow[] | undefined;
  loading: boolean;
  toggleRole: (uid: string, r: Role, has: boolean) => void;
  clientsFallback?: boolean;
}) {
  const list = (users ?? []).filter((u) =>
    clientsFallback
      ? !u.roles.includes("admin") && !u.roles.includes("owner")
      : u.roles.includes(role),
  );
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2">{icon} {title} <span className="text-sm text-muted-foreground">({list.length})</span></h2>
      {loading && <p>Chargement…</p>}
      {!loading && list.length === 0 && <p className="text-sm text-muted-foreground">Aucun compte.</p>}
      <div className="space-y-2">
        {list.map((u) => (
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
  );
}

function CreateUserCard({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(adminCreateUser);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<Role>("owner");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await create({
        data: {
          email: String(fd.get("email")).trim(),
          password: String(fd.get("password")),
          fullName: String(fd.get("fullName")).trim(),
          role,
        },
      });
      toast.success("Compte créé");
      (e.target as HTMLFormElement).reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/15 p-5 bg-white/[0.02]">
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><UserPlus className="h-5 w-5" style={{ color: teal }} /> Créer un compte</h2>
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground">Nom complet</div>
          <input name="fullName" required maxLength={120} className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground">Email</div>
          <input name="email" type="email" required maxLength={255} className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground">Mot de passe (6+ caractères)</div>
          <input name="password" type="text" required minLength={6} maxLength={72} className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground">Rôle</div>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm">
            <option value="client">Client</option>
            <option value="owner">Propriétaire</option>
            <option value="admin">Administrateur</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button disabled={busy} className="rounded-md px-5 py-2.5 font-semibold disabled:opacity-50" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>
            {busy ? "…" : "Créer le compte"}
          </button>
        </div>
      </form>
    </section>
  );
}
