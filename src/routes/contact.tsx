import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Mail, Send } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — FacilityProx" },
      { name: "description", content: "Contactez l'équipe FacilityProx pour toute question sur nos appartements et services." },
      { property: "og:title", content: "Contact — FacilityProx" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
});

const teal = "oklch(0.78 0.13 195)";

function ContactPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")).trim(),
      email: String(fd.get("email")).trim(),
      subject: String(fd.get("subject") ?? "").trim() || null,
      message: String(fd.get("message")).trim(),
      user_id: user?.id ?? null,
    };
    if (!payload.name || !payload.email || !payload.message) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Message envoyé !");
    setSent(true);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-3xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-24">
        <div className="text-center mb-8">
          <Mail className="h-10 w-10 mx-auto mb-3" style={{ color: teal }} />
          <h1 className="text-3xl font-bold">Nous contacter</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Une question, une demande spéciale ? Notre équipe vous répond sous 24h.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-white/15 bg-white/[0.03] p-8 text-center">
            <p className="text-lg font-semibold mb-2">Merci pour votre message !</p>
            <p className="text-sm text-muted-foreground mb-6">Nous reviendrons vers vous très vite.</p>
            <button
              onClick={() => setSent(false)}
              className="rounded-md px-4 py-2 text-sm border border-white/20 hover:bg-white/5"
            >
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-xl border border-white/15 bg-white/[0.02] p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom *">
                <input name="name" required maxLength={100} defaultValue={user?.user_metadata?.full_name ?? ""} className="inp" />
              </Field>
              <Field label="Email *">
                <input name="email" type="email" required maxLength={200} defaultValue={user?.email ?? ""} className="inp" />
              </Field>
            </div>
            <Field label="Sujet">
              <input name="subject" maxLength={200} placeholder="Réservation, options, autre…" className="inp" />
            </Field>
            <Field label="Message *">
              <textarea name="message" required rows={6} maxLength={5000} className="inp" />
            </Field>
            <button
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold disabled:opacity-50"
              style={{ background: teal, color: "oklch(0.15 0.02 200)" }}
            >
              <Send className="h-4 w-4" /> {busy ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        )}

        <style>{`.inp{width:100%;border-radius:.5rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);padding:.625rem .875rem;font-size:.9rem;color:inherit;outline:none}.inp:focus{border-color:${teal}}`}</style>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
