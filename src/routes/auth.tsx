import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Connexion — FacilityProx" },
      { name: "description", content: "Connectez-vous ou créez votre compte FacilityProx." },
    ],
  }),
});

const teal = "oklch(0.78 0.13 195)";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Nom trop court").max(80),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis").max(72),
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && session) {
    navigate({ to: "/" });
  }

  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Identifiants invalides" : error.message);
      return;
    }
    toast.success("Connecté !");
    navigate({ to: "/" });
  };

  const onSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      fullName: fd.get("fullName"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Compte créé ! Vous êtes connecté.");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-8">
      <Link to="/" className="flex items-center gap-3 mb-8">
        <img src={logo} alt="FacilityProx" className="h-14 w-14 rounded-full ring-1 ring-white/10" />
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: teal }}>FACILITYPROX</h1>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground">POUR VOUS AIDER</p>
        </div>
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-white/15 p-6">
        <div className="grid grid-cols-2 mb-6 rounded-md bg-white/5 p-1 text-sm font-semibold">
          <button
            onClick={() => setMode("login")}
            className={`rounded py-2 transition ${mode === "login" ? "" : "text-muted-foreground"}`}
            style={mode === "login" ? { background: teal, color: "oklch(0.15 0.02 200)" } : undefined}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded py-2 transition ${mode === "signup" ? "" : "text-muted-foreground"}`}
            style={mode === "signup" ? { background: teal, color: "oklch(0.15 0.02 200)" } : undefined}
          >
            Inscription
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={onLogin} className="space-y-4">
            <Input name="email" label="Email" type="email" required />
            <Input name="password" label="Mot de passe" type="password" required />
            <Submit busy={busy}>Se connecter</Submit>
          </form>
        ) : (
          <form onSubmit={onSignup} className="space-y-4">
            <Input name="fullName" label="Nom complet" type="text" required />
            <Input name="email" label="Email" type="email" required />
            <Input name="password" label="Mot de passe (8+ caractères)" type="password" required />
            <Submit busy={busy}>Créer mon compte</Submit>
          </form>
        )}
      </div>
    </div>
  );
}

function Input({ name, label, type, required }: { name: string; label: string; type: string; required?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground">{label}</div>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2"
        style={{ ["--tw-ring-color" as string]: teal }}
      />
    </label>
  );
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      disabled={busy}
      className="w-full rounded-md py-2.5 text-sm font-semibold disabled:opacity-50"
      style={{ background: teal, color: "oklch(0.15 0.02 200)" }}
    >
      {busy ? "…" : children}
    </button>
  );
}
