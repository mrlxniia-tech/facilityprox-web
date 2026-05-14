import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, MapPin } from "lucide-react";

export const Route = createFileRoute("/apartments")({
  component: ApartmentsPage,
  head: () => ({
    meta: [
      { title: "Appartements — FacilityProx" },
      { name: "description", content: "Découvrez tous les appartements exclusifs FacilityProx disponibles à la réservation." },
    ],
  }),
});

const teal = "oklch(0.78 0.13 195)";

function ApartmentsPage() {
  const { user, signOut } = useAuth();
  const { data: apartments, isLoading } = useQuery({
    queryKey: ["apartments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apartments")
        .select("id,title,city,price_per_night,capacity,image_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="FacilityProx" className="h-12 w-12 rounded-full ring-1 ring-white/10" />
          <h1 className="text-xl font-extrabold tracking-wide" style={{ color: teal }}>FACILITYPROX</h1>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <button onClick={() => signOut()} className="flex items-center gap-2 rounded-md px-3 py-2 border border-white/20">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          ) : (
            <Link to="/auth" className="rounded-md px-4 py-2 font-semibold" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>
              Connexion
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="text-3xl font-bold mb-6">Nos appartements exclusifs</h2>

        {isLoading && <p className="text-muted-foreground">Chargement…</p>}

        {!isLoading && (apartments?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-white/15 p-10 text-center">
            <p className="text-lg font-semibold">Aucun appartement publié pour le moment</p>
            <p className="text-muted-foreground text-sm mt-2">Les propriétaires peuvent ajouter leurs biens depuis leur espace.</p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {apartments?.map((a) => (
            <Link
              to="/apartments/$id"
              params={{ id: a.id }}
              key={a.id}
              className="group rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition"
            >
              <div className="aspect-[4/3] bg-white/5 overflow-hidden">
                {a.image_url ? (
                  <img src={a.image_url} alt={a.title} className="h-full w-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">Pas d'image</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold">{a.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {a.city}
                </p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold" style={{ color: teal }}>
                    {Number(a.price_per_night).toFixed(0)}€
                    <span className="text-xs font-normal text-muted-foreground"> /nuit</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{a.capacity} pers.</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
