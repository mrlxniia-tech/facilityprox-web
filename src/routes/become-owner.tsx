import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Home, CheckCircle2, Clock, XCircle } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/become-owner")({
  component: BecomeOwnerPage,
  head: () => ({ meta: [{ title: "Devenir propriétaire — FacilityProx" }] }),
});

const teal = "oklch(0.78 0.13 195)";

function BecomeOwnerPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: req, refetch } = useQuery({
    enabled: !!user,
    queryKey: ["owner-request", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("owner_requests").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("owner_requests").insert({
      user_id: user!.id,
      message: String(fd.get("message") ?? "").trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Demande envoyée");
    refetch();
  };

  const isOwner = roles.includes("owner") || roles.includes("admin");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-2xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-24">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Home className="h-6 w-6" style={{ color: teal }} /> Devenir propriétaire
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Soumettez votre demande pour pouvoir publier vos appartements. Un administrateur l'examinera.
        </p>

        {isOwner ? (
          <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-5 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            <div>
              <p className="font-bold">Vous êtes déjà propriétaire</p>
              <Link to="/owner" className="text-sm underline">Accéder à mon espace</Link>
            </div>
          </div>
        ) : req ? (
          <RequestStatus status={req.status} message={req.message} />
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-white/15 p-5">
            <label className="block">
              <div className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground">Présentez-vous (optionnel)</div>
              <textarea
                name="message"
                rows={5}
                maxLength={1000}
                placeholder="Combien d'appartements ? Où ? Depuis quand louez-vous ?…"
                className="w-full rounded-md bg-white/5 border border-white/15 p-3 text-sm"
              />
            </label>
            <button disabled={busy} className="w-full rounded-md py-2.5 font-semibold disabled:opacity-50" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>
              {busy ? "…" : "Envoyer ma demande"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function RequestStatus({ status, message }: { status: string; message: string | null }) {
  const cfg = {
    pending: { icon: <Clock className="h-6 w-6 text-yellow-400" />, label: "En attente d'examen", border: "border-yellow-500/40", bg: "bg-yellow-500/5" },
    approved: { icon: <CheckCircle2 className="h-6 w-6 text-green-400" />, label: "Demande approuvée", border: "border-green-500/40", bg: "bg-green-500/5" },
    rejected: { icon: <XCircle className="h-6 w-6 text-red-400" />, label: "Demande refusée", border: "border-red-500/40", bg: "bg-red-500/5" },
  }[status] ?? { icon: null, label: status, border: "border-white/20", bg: "" };
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5`}>
      <div className="flex items-center gap-3 mb-2">{cfg.icon}<p className="font-bold">{cfg.label}</p></div>
      {message && <p className="text-sm text-muted-foreground italic">"{message}"</p>}
    </div>
  );
}
