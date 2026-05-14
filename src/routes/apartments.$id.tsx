import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/apartments/$id")({
  component: ApartmentDetail,
});

const teal = "oklch(0.78 0.13 195)";

function ApartmentDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const { data: apt, isLoading } = useQuery({
    queryKey: ["apartment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apartments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookedRanges } = useQuery({
    queryKey: ["apartment-booked", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_apartment_booked_ranges", { _apartment_id: id });
      if (error) throw error;
      return (data ?? []) as { check_in: string; check_out: string }[];
    },
  });

  const onBook = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("Connectez-vous pour réserver");
      navigate({ to: "/auth" });
      return;
    }
    if (!apt) return;
    const fd = new FormData(e.currentTarget);
    const checkIn = String(fd.get("checkIn") ?? "");
    const checkOut = String(fd.get("checkOut") ?? "");
    const guests = Number(fd.get("guests") ?? 1);

    if (!checkIn || !checkOut) return toast.error("Choisissez les dates");
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return toast.error("Date de départ invalide");
    if (guests > apt.capacity) return toast.error(`Max ${apt.capacity} voyageurs`);

    setBusy(true);
    const { error } = await supabase.from("bookings").insert({
      apartment_id: apt.id,
      client_id: user.id,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      total_price: Number(apt.price_per_night) * nights,
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Réservation enregistrée !");
    navigate({ to: "/my-bookings" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-5xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/apartments" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24">
        {isLoading && <p>Chargement…</p>}
        {!isLoading && !apt && (
          <p className="text-center text-muted-foreground">Appartement introuvable</p>
        )}
        {apt && (
          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <div>
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-white/5 mb-6">
                {apt.image_url ? (
                  <img src={apt.image_url} alt={apt.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">Pas d'image</div>
                )}
              </div>
              <h1 className="text-3xl font-bold">{apt.title}</h1>
              <p className="text-muted-foreground flex items-center gap-1 mt-2">
                <MapPin className="h-4 w-4" /> {apt.city}{apt.address ? ` · ${apt.address}` : ""}
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> Jusqu'à {apt.capacity} voyageurs
              </div>
              {apt.description && (
                <p className="mt-6 leading-relaxed text-foreground/90 whitespace-pre-line">{apt.description}</p>
              )}
            </div>

            <aside className="rounded-xl border border-white/15 p-5 h-fit lg:sticky lg:top-6">
              <div className="mb-4">
                <span className="text-3xl font-extrabold" style={{ color: teal }}>
                  {Number(apt.price_per_night).toFixed(0)}€
                </span>
                <span className="text-muted-foreground"> /nuit</span>
              </div>
              <form onSubmit={onBook} className="space-y-3">
                <Field label="Arrivée"><input name="checkIn" type="date" min={new Date().toISOString().slice(0,10)} required className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm" /></Field>
                <Field label="Départ"><input name="checkOut" type="date" min={new Date().toISOString().slice(0,10)} required className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm" /></Field>
                <Field label="Voyageurs">
                  <input name="guests" type="number" defaultValue={1} min={1} max={apt.capacity} required className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm" />
                </Field>
                <button
                  disabled={busy}
                  className="w-full rounded-md py-2.5 font-semibold disabled:opacity-50"
                  style={{ background: teal, color: "oklch(0.15 0.02 200)" }}
                >
                  {busy ? "…" : user ? "Réserver" : "Se connecter pour réserver"}
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Le paiement Stripe sera ajouté à l'étape suivante.
                </p>
              </form>
            </aside>
          </div>
        )}
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
