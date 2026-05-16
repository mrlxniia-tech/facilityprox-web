import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Calendar as CalIcon, Flag } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/planning")({
  component: PlanningPage,
  head: () => ({ meta: [{ title: "Planning opérationnel — FacilityProx" }] }),
});

const teal = "oklch(0.78 0.13 195)";

type Status = "todo" | "in_progress" | "done";
type Priority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  assignee: string | null;
  due_date: string | null;
  priority: Priority;
  status: Status;
};

const COLUMNS: { key: Status; label: string }[] = [
  { key: "todo", label: "À faire" },
  { key: "in_progress", label: "En cours" },
  { key: "done", label: "Terminé" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "oklch(0.65 0.12 220)",
  medium: "oklch(0.75 0.15 80)",
  high: "oklch(0.6 0.22 25)",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

function PlanningPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!roles.includes("admin")) {
      toast.error("Réservé aux administrateurs");
      navigate({ to: "/" });
    }
  }, [loading, user, roles, navigate]);

  const { data: tasks, isLoading } = useQuery({
    enabled: !!user && roles.includes("admin"),
    queryKey: ["planning-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const grouped = useMemo(() => {
    const out: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks?.forEach((t) => out[t.status].push(t));
    return out;
  }, [tasks]);

  const move = async (t: Task, status: Status) => {
    const { error } = await supabase.from("planning_tasks").update({ status }).eq("id", t.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["planning-tasks"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    const { error } = await supabase.from("planning_tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée");
    qc.invalidateQueries({ queryKey: ["planning-tasks"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-7xl px-4 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <img src={logo} alt="FacilityProx" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-24">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Planning opérationnel</h1>
            <p className="text-sm text-muted-foreground">Suivi des tâches et de leur avancement</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 rounded-md px-4 py-2 font-semibold"
            style={{ background: teal, color: "oklch(0.15 0.02 200)" }}
          >
            <Plus className="h-4 w-4" /> Nouvelle tâche
          </button>
        </div>

        {isLoading && <p className="text-muted-foreground">Chargement…</p>}

        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="rounded-xl border border-white/15 bg-white/[0.02] p-3 min-h-[300px]">
              <div className="flex items-center justify-between px-1 mb-3">
                <h2 className="font-bold tracking-wide text-sm uppercase">{col.label}</h2>
                <span className="text-xs text-muted-foreground">{grouped[col.key].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[col.key].length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-2 py-6 text-center">Aucune tâche</p>
                )}
                {grouped[col.key].map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onEdit={() => { setEditing(t); setShowForm(true); }}
                    onDelete={() => remove(t.id)}
                    onMove={(s) => move(t, s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <TaskForm
            initial={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["planning-tasks"] });
              setShowForm(false); setEditing(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onMove }: {
  task: Task; onEdit: () => void; onDelete: () => void; onMove: (s: Status) => void;
}) {
  const overdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date(new Date().toDateString());
  return (
    <div className="rounded-lg border border-white/10 bg-background p-3 hover:border-white/30 transition">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onEdit} className="text-left flex-1">
          <h3 className="font-semibold text-sm">{task.title}</h3>
          {task.category && <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{task.category}</p>}
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-red-400">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {task.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{task.description}</p>}
      <div className="flex items-center gap-2 flex-wrap mt-2.5 text-[11px]">
        <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: `${PRIORITY_COLORS[task.priority]}22`, color: PRIORITY_COLORS[task.priority] }}>
          <Flag className="h-2.5 w-2.5" /> {PRIORITY_LABEL[task.priority]}
        </span>
        {task.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? "text-red-400" : "text-muted-foreground"}`}>
            <CalIcon className="h-2.5 w-2.5" /> {new Date(task.due_date).toLocaleDateString("fr-FR")}
          </span>
        )}
        {task.assignee && <span className="text-muted-foreground">· {task.assignee}</span>}
      </div>
      <div className="flex gap-1 mt-2.5">
        {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
          <button
            key={c.key}
            onClick={() => onMove(c.key)}
            className="flex-1 text-[10px] rounded border border-white/15 py-1 hover:border-white/40 text-muted-foreground"
          >
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskForm({ initial, onClose, onSaved }: {
  initial: Task | null; onClose: () => void; onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title")).trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      category: String(fd.get("category") ?? "").trim() || null,
      assignee: String(fd.get("assignee") ?? "").trim() || null,
      due_date: String(fd.get("due_date") ?? "") || null,
      priority: String(fd.get("priority")) as Priority,
      status: String(fd.get("status")) as Status,
    };
    setBusy(true);
    const q = initial
      ? supabase.from("planning_tasks").update(payload).eq("id", initial.id)
      : supabase.from("planning_tasks").insert(payload);
    const { error } = await q;
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Modifiée" : "Créée");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-lg bg-background border border-white/15 rounded-xl p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{initial ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
          <button onClick={onClose} className="text-muted-foreground">✕</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Titre">
            <input name="title" defaultValue={initial?.title} required maxLength={200} className="inp" />
          </Field>
          <Field label="Description">
            <textarea name="description" defaultValue={initial?.description ?? ""} maxLength={1000} rows={3} className="inp" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie">
              <input name="category" defaultValue={initial?.category ?? ""} maxLength={80} placeholder="Ménage, Marketing…" className="inp" />
            </Field>
            <Field label="Assigné à">
              <input name="assignee" defaultValue={initial?.assignee ?? ""} maxLength={80} placeholder="Nom" className="inp" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Échéance">
              <input name="due_date" type="date" defaultValue={initial?.due_date ?? ""} className="inp" />
            </Field>
            <Field label="Priorité">
              <select name="priority" defaultValue={initial?.priority ?? "medium"} className="inp">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </Field>
            <Field label="Statut">
              <select name="status" defaultValue={initial?.status ?? "todo"} className="inp">
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="done">Terminé</option>
              </select>
            </Field>
          </div>
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
