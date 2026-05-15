import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Mon profil — FacilityProx" }] }),
});

const teal = "oklch(0.78 0.13 195)";

function ProfilePage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: profile, refetch } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  const [busy, setBusy] = useState(false);

  const onInfo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: String(fd.get("full_name") ?? "").trim() || null,
        phone: String(fd.get("phone") ?? "").trim() || null,
      })
      .eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
    refetch();
  };

  const onPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pwd = String(fd.get("password") ?? "");
    if (pwd.length < 8) return toast.error("Mot de passe : 8 caractères minimum");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe modifié");
    e.currentTarget.reset();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-2xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-24 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><UserIcon className="h-6 w-6" style={{ color: teal }} /> Mon profil</h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {roles.map((r) => (
              <span key={r} className="text-xs rounded-full px-2 py-0.5 border border-white/20">{r}</span>
            ))}
          </div>
        </div>

        <form onSubmit={onInfo} className="space-y-3 rounded-xl border border-white/15 p-5">
          <h2 className="font-bold mb-2">Informations</h2>
          <Field label="Nom complet">
            <input name="full_name" defaultValue={profile?.full_name ?? ""} maxLength={120} className="inp" />
          </Field>
          <Field label="Téléphone">
            <input name="phone" type="tel" defaultValue={profile?.phone ?? ""} maxLength={30} className="inp" />
          </Field>
          <button disabled={busy} className="rounded-md px-4 py-2 font-semibold disabled:opacity-50" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>
            Enregistrer
          </button>
        </form>

        <form onSubmit={onPassword} className="space-y-3 rounded-xl border border-white/15 p-5">
          <h2 className="font-bold mb-2">Mot de passe</h2>
          <Field label="Nouveau mot de passe">
            <input name="password" type="password" minLength={8} required className="inp" />
          </Field>
          <button disabled={busy} className="rounded-md px-4 py-2 font-semibold disabled:opacity-50" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>
            Mettre à jour
          </button>
        </form>

        {!roles.includes("owner") && !roles.includes("admin") && (
          <Link to="/become-owner" className="block rounded-xl border border-white/15 p-5 hover:bg-white/5">
            <h2 className="font-bold">Devenir propriétaire</h2>
            <p className="text-sm text-muted-foreground mt-1">Mettez vos appartements en location sur FacilityProx.</p>
          </Link>
        )}

        <style>{`.inp{width:100%;border-radius:.375rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);padding:.5rem .75rem;font-size:.875rem;color:inherit}`}</style>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
