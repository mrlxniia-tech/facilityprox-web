import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Upload, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { APARTMENT_OPTIONS } from "@/lib/apartment-options";

export const Route = createFileRoute("/owner")({
  component: OwnerPage,
  head: () => ({ meta: [{ title: "Espace propriétaire — FacilityProx" }] }),
});

const teal = "oklch(0.78 0.13 195)";

type Apt = {
  id: string;
  title: string;
  city: string;
  address: string | null;
  description: string | null;
  price_per_night: number;
  capacity: number;
  image_url: string | null;
  is_published: boolean;
  options: string[] | null;
};

function OwnerPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Apt | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!roles.includes("owner") && !roles.includes("admin")) {
      toast.error("Réservé aux propriétaires");
      navigate({ to: "/" });
    }
  }, [loading, user, roles, navigate]);

  const { data: apartments, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["owner-apartments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apartments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Apt[];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet appartement ?")) return;
    const { error } = await supabase.from("apartments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    qc.invalidateQueries({ queryKey: ["owner-apartments"] });
    qc.invalidateQueries({ queryKey: ["apartments"] });
  };

  const togglePublish = async (a: Apt) => {
    const { error } = await supabase.from("apartments").update({ is_published: !a.is_published }).eq("id", a.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["owner-apartments"] });
    qc.invalidateQueries({ queryKey: ["apartments"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-5xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Mes appartements</h1>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 rounded-md px-4 py-2 font-semibold"
            style={{ background: teal, color: "oklch(0.15 0.02 200)" }}
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>

        {isLoading && <p className="text-muted-foreground">Chargement…</p>}

        {!isLoading && (apartments?.length ?? 0) === 0 && !showForm && (
          <div className="rounded-xl border border-white/15 p-10 text-center text-muted-foreground">
            Vous n'avez encore aucun appartement.
          </div>
        )}

        <div className="space-y-3">
          {apartments?.map((a) => (
            <div key={a.id} className="flex gap-4 rounded-xl border border-white/15 overflow-hidden">
              <div className="w-28 sm:w-40 aspect-[4/3] bg-white/5 shrink-0">
                {a.image_url && <img src={a.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 p-4">
                <h3 className="font-bold">{a.title}</h3>
                <p className="text-sm text-muted-foreground">{a.city}</p>
                <p className="text-sm" style={{ color: teal }}>{Number(a.price_per_night).toFixed(0)}€ /nuit · {a.capacity} pers.</p>
              </div>
              <div className="p-4 flex flex-col gap-2 justify-center">
                <button onClick={() => togglePublish(a)} className="text-xs flex items-center gap-1 rounded border border-white/20 px-2 py-1">
                  {a.is_published ? <><Eye className="h-3 w-3" /> Publié</> : <><EyeOff className="h-3 w-3" /> Masqué</>}
                </button>
                <button onClick={() => { setEditing(a); setShowForm(true); }} className="text-xs rounded border border-white/20 px-2 py-1">
                  Modifier
                </button>
                <button onClick={() => remove(a.id)} className="text-xs flex items-center gap-1 rounded border border-red-500/40 text-red-400 px-2 py-1">
                  <Trash2 className="h-3 w-3" /> Suppr.
                </button>
              </div>
            </div>
          ))}
        </div>

        {showForm && user && (
          <ApartmentForm
            ownerId={user.id}
            initial={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["owner-apartments"] });
              qc.invalidateQueries({ queryKey: ["apartments"] });
              setShowForm(false); setEditing(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

function ApartmentForm({ ownerId, initial, onClose, onSaved }: {
  ownerId: string; initial: Apt | null; onClose: () => void; onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? []);

  const toggleOpt = (k: string) =>
    setOptions((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const onUpload = async (file: File) => {
    setBusy(true);
    const ext = file.name.split(".").pop();
    const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("apartment-images").upload(path, file);
    if (error) { setBusy(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("apartment-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setBusy(false);
    toast.success("Image téléchargée");
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      owner_id: ownerId,
      title: String(fd.get("title")).trim(),
      city: String(fd.get("city")).trim(),
      address: String(fd.get("address") ?? "").trim() || null,
      description: String(fd.get("description") ?? "").trim() || null,
      price_per_night: Number(fd.get("price")),
      capacity: Number(fd.get("capacity")),
      image_url: imageUrl || null,
      is_published: true,
      options,
    };
    setBusy(true);
    const q = initial
      ? supabase.from("apartments").update(payload).eq("id", initial.id)
      : supabase.from("apartments").insert(payload);
    const { error } = await q;
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Modifié" : "Créé");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-lg bg-background border border-white/15 rounded-xl p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{initial ? "Modifier" : "Nouvel appartement"}</h2>
          <button onClick={onClose} className="text-muted-foreground">✕</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Titre"><input name="title" defaultValue={initial?.title} required maxLength={120} className="inp" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ville"><input name="city" defaultValue={initial?.city} required maxLength={80} className="inp" /></Field>
            <Field label="Capacité"><input name="capacity" type="number" min={1} max={20} defaultValue={initial?.capacity ?? 2} required className="inp" /></Field>
          </div>
          <Field label="Adresse"><input name="address" defaultValue={initial?.address ?? ""} maxLength={200} className="inp" /></Field>
          <Field label="Prix par nuit (€)"><input name="price" type="number" min={1} step="0.01" defaultValue={initial?.price_per_night} required className="inp" /></Field>
          <Field label="Description"><textarea name="description" defaultValue={initial?.description ?? ""} maxLength={2000} rows={4} className="inp" /></Field>
          <Field label="Photo">
            <div className="flex items-center gap-3">
              {imageUrl && <img src={imageUrl} alt="" className="h-16 w-16 rounded object-cover" />}
              <label className="flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm cursor-pointer">
                <Upload className="h-4 w-4" /> Choisir
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
              </label>
            </div>
          </Field>
          <button disabled={busy} className="w-full rounded-md py-2.5 font-semibold disabled:opacity-50" style={{ background: teal, color: "oklch(0.15 0.02 200)" }}>
            {busy ? "…" : initial ? "Enregistrer" : "Créer"}
          </button>
        </form>
        <style>{`.inp{width:100%;border-radius:.375rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);padding:.5rem .75rem;font-size:.875rem;color:inherit}`}</style>
      </div>
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
