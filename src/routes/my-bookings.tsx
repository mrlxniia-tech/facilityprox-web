import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.jpg";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/my-bookings")({
  component: MyBookings,
  head: () => ({ meta: [{ title: "Mes réservations — FacilityProx" }] }),
});

const teal = "oklch(0.78 0.13 195)";

function MyBookings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: bookings, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,check_in,check_out,guests,total_price,status,apartments(title,city,image_url)")
        .order("check_in", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-4xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-24">
        <h1 className="text-3xl font-bold mb-6">Mes réservations</h1>
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading && (bookings?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-white/15 p-10 text-center">
            <p>Aucune réservation pour le moment.</p>
            <Link to="/apartments" className="mt-4 inline-block rounded-md px-4 py-2 font-semibold" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>
              Voir les appartements
            </Link>
          </div>
        )}
        <div className="space-y-3">
          {bookings?.map((b) => {
            const apt = (b as { apartments?: { title?: string; city?: string; image_url?: string | null } | null }).apartments;
            return (
              <div key={b.id} className="flex gap-4 rounded-xl border border-white/15 overflow-hidden">
                <div className="w-28 sm:w-40 aspect-[4/3] bg-white/5 shrink-0">
                  {apt?.image_url && <img src={apt.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 p-4">
                  <h3 className="font-bold">{apt?.title ?? "Appartement"}</h3>
                  <p className="text-sm text-muted-foreground">{apt?.city}</p>
                  <p className="text-sm mt-2">
                    {new Date(b.check_in).toLocaleDateString("fr-FR")} → {new Date(b.check_out).toLocaleDateString("fr-FR")}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider px-2 py-1 rounded border border-white/20">{b.status}</span>
                    <span className="font-bold" style={{ color: teal }}>{Number(b.total_price).toFixed(0)}€</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
