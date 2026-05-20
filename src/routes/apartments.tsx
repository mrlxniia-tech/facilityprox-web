import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, MapPin, Search } from "lucide-react";
import { APARTMENT_OPTIONS, OPTION_LABEL } from "@/lib/apartment-options";

type AptSearch = { city?: string; maxPrice?: string; minCapacity?: string; options?: string };

export const Route = createFileRoute("/apartments")({
  component: ApartmentsPage,
  validateSearch: (s: Record<string, unknown>): AptSearch => ({
    city: typeof s.city === "string" ? s.city : undefined,
    maxPrice: typeof s.maxPrice === "string" ? s.maxPrice : undefined,
    minCapacity: typeof s.minCapacity === "string" ? s.minCapacity : undefined,
    options: typeof s.options === "string" ? s.options : undefined,
  }),
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
  const search = Route.useSearch();
  const { data: apartments, isLoading } = useQuery({
    queryKey: ["apartments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apartments")
        .select("id,title,city,price_per_night,capacity,image_url,options")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [city, setCity] = useState(search.city ?? "");
  const [maxPrice, setMaxPrice] = useState(search.maxPrice ?? "");
  const [minCapacity, setMinCapacity] = useState(search.minCapacity ?? "");
  const [opts, setOpts] = useState<string[]>(
    search.options ? search.options.split(",").filter(Boolean) : [],
  );

  const toggleOpt = (k: string) =>
    setOpts((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const cities = useMemo(() => {
    const s = new Set<string>();
    apartments?.forEach((a) => s.add(a.city));
    return Array.from(s).sort();
  }, [apartments]);

  const filtered = useMemo(() => {
    return (apartments ?? []).filter((a) => {
      if (city && a.city !== city) return false;
      if (maxPrice && Number(a.price_per_night) > Number(maxPrice)) return false;
      if (minCapacity && a.capacity < Number(minCapacity)) return false;
      if (opts.length > 0) {
        const aOpts = (a.options ?? []) as string[];
        if (!opts.every((o) => aOpts.includes(o))) return false;
      }
      return true;
    });
  }, [apartments, city, maxPrice, minCapacity, opts]);

  const reset = () => { setCity(""); setMaxPrice(""); setMinCapacity(""); setOpts([]); };
  const hasFilters = city || maxPrice || minCapacity || opts.length > 0;

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

        <div className="rounded-xl border border-white/15 p-4 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <Field label="Ville">
            <select value={city} onChange={(e) => setCity(e.target.value)} className="inp">
              <option value="">Toutes</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Prix max / nuit (€)">
            <input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="inp" />
          </Field>
          <Field label="Voyageurs (min)">
            <input type="number" min={1} value={minCapacity} onChange={(e) => setMinCapacity(e.target.value)} className="inp" />
          </Field>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Search className="h-3 w-3" /> {filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
            {hasFilters && (
              <button onClick={reset} className="text-xs underline text-muted-foreground hover:text-foreground ml-auto">Effacer</button>
            )}
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">Chargement…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-white/15 p-10 text-center">
            <p className="text-lg font-semibold">{hasFilters ? "Aucun appartement ne correspond" : "Aucun appartement publié pour le moment"}</p>
            <p className="text-muted-foreground text-sm mt-2">{hasFilters ? "Essayez d'élargir vos critères." : "Les propriétaires peuvent ajouter leurs biens depuis leur espace."}</p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
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
