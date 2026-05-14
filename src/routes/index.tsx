import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/logo.jpg";
import apt1 from "@/assets/apartment-1.jpg";
import apt2 from "@/assets/apartment-2.jpg";
import { Calendar, CreditCard, FileText, HandCoins, LogOut, Play, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "FacilityProx — Appartements exclusifs, réservation directe" },
      { name: "description", content: "FacilityProx : appartements exclusifs en réservation directe. Paiements sécurisés, frais réduits, options sur mesure." },
    ],
  }),
});

const teal = "oklch(0.78 0.13 195)";

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <Nav />
        <Hero />
        <SearchBar />
        <BookingGrid />
        <Options />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="mx-auto max-w-6xl px-4 pt-8 pb-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <img src={logo} alt="FacilityProx logo" className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10" />
        <div className="leading-tight">
          <h1 className="text-2xl font-extrabold tracking-wide" style={{ color: teal }}>FACILITYPROX</h1>
          <p className="text-[11px] tracking-[0.3em] text-muted-foreground">POUR VOUS AIDER</p>
        </div>
      </Link>
      <div className="flex items-center gap-3 sm:gap-4 text-sm">
        <Link to="/apartments" className="text-muted-foreground hover:text-foreground hidden sm:inline">Appartements</Link>
        {user ? (
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 rounded-md px-3 sm:px-4 py-2 text-sm font-semibold border border-white/20 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="rounded-md px-4 sm:px-5 py-2 text-sm font-semibold"
            style={{ background: teal, color: "oklch(0.15 0.02 200)" }}
          >
            CONNEXION
          </Link>
        )}
      </div>
    </header>
  );
}

function Nav() {
  const items = ["HÉBERGEMENTS", "EXPÉRIENCES", "OFFRES", "AIDE"];
  return (
    <nav className="rounded-xl bg-white text-black px-6 py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm font-semibold">
      {items.map((i, idx) => (
        <div key={i} className="flex items-center gap-8">
          <a href="#" className="hover:opacity-70">{i}</a>
          {idx < items.length - 1 && <span className="text-black/30">|</span>}
        </div>
      ))}
    </nav>
  );
}

function Hero() {
  return (
    <section className="mt-4 grid grid-cols-3 gap-2 rounded-xl overflow-hidden">
      <div className="col-span-2 relative">
        <img src={apt1} alt="Appartement exclusif" className="h-80 w-full object-cover" width={1280} height={720} />
        <h2 className="absolute bottom-4 left-5 text-2xl font-bold drop-shadow-lg">NOS APPARTEMENTS EXCLUSIFS</h2>
      </div>
      <div className="relative">
        <img src={apt2} alt="Cuisine moderne" className="h-80 w-full object-cover" loading="lazy" width={640} height={720} />
        <button className="absolute inset-0 flex items-center justify-center" aria-label="Lecture vidéo">
          <span className="rounded-full bg-black/50 p-4 ring-2 ring-white/80">
            <Play className="h-8 w-8 text-white" fill="white" />
          </span>
        </button>
        <span className="absolute bottom-3 right-3 text-sm italic text-white/90">Style RBNB</span>
      </div>
    </section>
  );
}

function SearchBar() {
  return (
    <section className="mt-6 rounded-xl border border-white/15 p-6">
      <div className="grid gap-6 md:grid-cols-[1fr,auto]">
        <div className="space-y-4">
          <Field label="DESTINATION">
            <input className="w-full rounded-md bg-white px-3 py-2 text-black" placeholder="Ville, quartier, adresse…" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={<span className="flex items-center gap-2">DATES (Arrivée <Dot color="oklch(0.65 0.18 145)" /> / Départ <Dot color="oklch(0.55 0.2 25)" />)</span>}>
              <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-black">
                <span>10</span>
                <span className="text-black/40">/</span>
                <span>20</span>
                <Calendar className="ml-auto h-4 w-4" />
              </div>
            </Field>
            <Field label="VOYAGEURS">
              <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-black">
                <Users className="h-4 w-4" />
                <span className="ml-auto text-black/60">▾</span>
              </div>
            </Field>
          </div>
        </div>
        <div className="space-y-4 md:w-72">
          <Field label="CODE PROMO">
            <input className="w-full rounded-md border border-white/30 bg-transparent px-3 py-2" />
          </Field>
          <button
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-md py-3 font-semibold"
            style={{ background: teal, color: "oklch(0.15 0.02 200)" }}
          >
            <Search className="h-4 w-4" /> RECHERCHER
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}

function BookingGrid() {
  return (
    <section className="mt-6 grid gap-6 md:grid-cols-[1.5fr,1fr]">
      <CalendarCard />
      <div className="space-y-4">
        <FeatureCard icon={<FileText />} title={<>RÉSERVATION<br />DIRECTE SUR SITE</>} />
        <FeatureCard icon={<CreditCard />} title={<>PAIEMENTS<br />SÉCURISÉS<br />STRIPE / PAYPAL</>} />
        <FeatureCard icon={<HandCoins />} title={<>FRAIS RÉDUITS<br />VS RBNB</>} />
      </div>
    </section>
  );
}

function FeatureCard({ icon, title }: { icon: React.ReactNode; title: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/15 p-4">
      <span className="rounded-md p-2" style={{ color: teal }}>{icon}</span>
      <p className="text-sm font-bold leading-tight">{title}</p>
    </div>
  );
}

function CalendarCard() {
  const [month] = useState("JUIN 2024");
  const days = ["Ju", "Lu", "Ma", "Mu", "Ji", "Ve", "Sa", "Su"];
  // 5 weeks grid
  const cells: { d: number; muted?: boolean; status?: "arr" | "dep" | "between" }[] = [
    { d: 29, muted: true }, { d: 30, muted: true }, { d: 31, muted: true }, { d: 1 }, { d: 2 }, { d: 3 }, { d: 4 }, { d: 5 },
    { d: 6 }, { d: 7 }, { d: 7 }, { d: 8 }, { d: 9 }, { d: 10, status: "arr" }, { d: 11 }, { d: 12 },
    { d: 13 }, { d: 14, status: "between" }, { d: 15, status: "arr" }, { d: 15, status: "between" }, { d: 16, status: "between" }, { d: 17, status: "dep" }, { d: 18, status: "dep" }, { d: 19 },
    { d: 20 }, { d: 21 }, { d: 22 }, { d: 22 }, { d: 23 }, { d: 24 }, { d: 25 }, { d: 26 },
    { d: 27 }, { d: 28 }, { d: 29 }, { d: 30 }, { d: 30 }, { d: 1, muted: true }, { d: 2, muted: true }, { d: 3, muted: true },
  ];
  return (
    <div className="rounded-xl bg-white text-black p-5">
      <div className="flex items-center justify-between mb-4">
        <button aria-label="Mois précédent"><ChevronLeft className="h-5 w-5" /></button>
        <h3 className="font-bold tracking-wide">{month}</h3>
        <button aria-label="Mois suivant"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-8 gap-1 text-center text-sm">
        {days.map((d, i) => <div key={i} className="py-1 font-semibold text-black/70">{d}</div>)}
        {cells.map((c, i) => {
          const base = "rounded-md border py-2 text-xs leading-tight flex flex-col items-center justify-center min-h-[44px]";
          if (c.muted) return <div key={i} className={`${base} border-black/10 text-black/30`}>{c.d}</div>;
          if (c.status === "arr") return <div key={i} className={`${base} border-transparent text-white`} style={{ background: "oklch(0.55 0.18 145)" }}><span>{c.d}</span><span className="text-[9px] font-semibold">Arrivée</span></div>;
          if (c.status === "dep") return <div key={i} className={`${base} border-transparent text-white`} style={{ background: "oklch(0.45 0.18 25)" }}><span>{c.d}</span><span className="text-[9px] font-semibold">Départ</span></div>;
          if (c.status === "between") return <div key={i} className={`${base} border-transparent text-white`} style={{ background: "oklch(0.55 0.18 145)" }}>{c.d}</div>;
          return <div key={i} className={`${base} border-black/15`}>{c.d}</div>;
        })}
      </div>
    </div>
  );
}

function Options() {
  const opts = [
    { t: "FRAIS MÉNAGE INCLUS", s: "Frais de ménage inclus dès la première nuit." },
    { t: "LOVE ROOM OPTIONS", s: "Options sur-mesure : pétales, champagne et collation." },
    { t: "PETIT DÉJEUNER", s: "Petit déjeuner livré à votre porte chaque matin." },
  ];
  return (
    <section className="mt-10">
      <h3 className="text-sm font-semibold tracking-wider text-muted-foreground mb-4">OPTIONS</h3>
      <div className="grid gap-6 md:grid-cols-[1fr,auto] items-start">
        <ul className="space-y-4">
          {opts.map(o => (
            <li key={o.t} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border" style={{ borderColor: teal, background: teal, color: "oklch(0.15 0.02 200)" }}>✓</span>
              <div>
                <div className="font-bold">{o.t}</div>
                <div className="text-sm text-muted-foreground">{o.s}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="relative">
          <div className="rounded-full border border-white/40 px-5 py-3 text-sm">
            ADMINISTRATEUR | PROPRIÉTAIRE | CLIENTS
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-wrap justify-end gap-6 text-sm text-muted-foreground">
        <a href="#">À propos</a>
        <a href="#">Conditions</a>
        <a href="#">Confidentialité</a>
        <a href="#">Carrières</a>
      </div>
    </footer>
  );
}
