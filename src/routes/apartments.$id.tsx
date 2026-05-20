import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Users, Star, Trash2 } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { BookingCalendar } from "@/components/BookingCalendar";
import { OPTION_LABEL } from "@/lib/apartment-options";

export const Route = createFileRoute("/apartments/$id")({
  component: ApartmentDetail,
});

type Review = {
  id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

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

              <ReviewsSection apartmentId={apt.id} />
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
              {bookedRanges && bookedRanges.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground mb-2">PÉRIODES DÉJÀ RÉSERVÉES</p>
                  <ul className="space-y-1 text-xs">
                    {bookedRanges.map((r, i) => (
                      <li key={i} className="text-muted-foreground">
                        {new Date(r.check_in).toLocaleDateString("fr-FR")} → {new Date(r.check_out).toLocaleDateString("fr-FR")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? "fill-current" : ""}
            color={n <= value ? teal : "oklch(0.5 0.02 200)"}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ apartmentId }: { apartmentId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ["reviews", apartmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("apartment_id", apartmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });

  const { data: canReview } = useQuery({
    enabled: !!user,
    queryKey: ["can-review", apartmentId, user?.id],
    queryFn: async () => {
      const [{ data: bookings }, { data: existing }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id")
          .eq("apartment_id", apartmentId)
          .eq("client_id", user!.id)
          .neq("status", "cancelled")
          .limit(1),
        supabase
          .from("reviews")
          .select("id")
          .eq("apartment_id", apartmentId)
          .eq("client_id", user!.id)
          .maybeSingle(),
      ]);
      return { hasBooking: (bookings?.length ?? 0) > 0, hasReview: !!existing };
    },
  });

  const avg = reviews && reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return toast.error("Connectez-vous");
    const fd = new FormData(e.currentTarget);
    const comment = String(fd.get("comment") ?? "").trim() || null;
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      apartment_id: apartmentId,
      client_id: user.id,
      rating,
      comment,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Avis publié, merci !");
    qc.invalidateQueries({ queryKey: ["reviews", apartmentId] });
    qc.invalidateQueries({ queryKey: ["can-review", apartmentId, user.id] });
    (e.target as HTMLFormElement).reset();
    setRating(5);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Supprimer votre avis ?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Avis supprimé");
    qc.invalidateQueries({ queryKey: ["reviews", apartmentId] });
    qc.invalidateQueries({ queryKey: ["can-review", apartmentId, user?.id] });
  };

  return (
    <section className="mt-10 pt-8 border-t border-white/10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold">Avis des voyageurs</h2>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={Math.round(avg)} />
            <span className="text-sm text-muted-foreground">
              {avg.toFixed(1)} · {reviews.length} avis
            </span>
          </div>
        )}
      </div>

      {user && canReview?.hasBooking && !canReview.hasReview && (
        <form onSubmit={onSubmit} className="rounded-xl border border-white/15 p-4 mb-6 bg-white/[0.02]">
          <p className="text-sm font-semibold mb-2">Laissez votre avis</p>
          <div className="mb-3"><Stars value={rating} onChange={setRating} size={22} /></div>
          <textarea
            name="comment"
            maxLength={1000}
            rows={3}
            placeholder="Comment s'est passé votre séjour ?"
            className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm mb-3"
          />
          <button
            disabled={busy}
            className="rounded-md px-4 py-2 font-semibold text-sm disabled:opacity-50"
            style={{ background: teal, color: "oklch(0.15 0.02 200)" }}
          >
            {busy ? "…" : "Publier"}
          </button>
        </form>
      )}

      {user && !canReview?.hasBooking && (
        <p className="text-sm text-muted-foreground italic mb-6">
          Seuls les voyageurs ayant réservé peuvent laisser un avis.
        </p>
      )}

      <div className="space-y-4">
        {reviews?.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun avis pour le moment.</p>
        )}
        {reviews?.map((r) => (
          <div key={r.id} className="rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <Stars value={r.rating} />
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
                {user?.id === r.client_id && (
                  <button onClick={() => onDelete(r.id)} className="text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {r.comment && <p className="text-sm text-foreground/90">{r.comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
