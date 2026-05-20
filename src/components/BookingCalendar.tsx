import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Range = { check_in: string; check_out: string };

const teal = "oklch(0.78 0.13 195)";
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingCalendar({
  ranges = [],
  initialDate = new Date(),
  compact = false,
}: {
  ranges?: Range[];
  initialDate?: Date;
  compact?: boolean;
}) {
  const [cursor, setCursor] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const bookedSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of ranges) {
      const start = new Date(r.check_in + "T00:00:00");
      const end = new Date(r.check_out + "T00:00:00"); // exclusive
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        set.add(toKey(d));
      }
    }
    return set;
  }, [ranges]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = toKey(today);

  const cells: ({ date: Date; key: string } | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, key: toKey(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => setCursor(new Date(year, month - 1, 1));
  const next = () => setCursor(new Date(year, month + 1, 1));

  return (
    <div className={`rounded-xl bg-white text-black ${compact ? "p-3" : "p-5"}`}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prev} aria-label="Mois précédent" className="p-1 hover:bg-black/5 rounded"><ChevronLeft className="h-5 w-5" /></button>
        <h3 className="font-bold tracking-wide uppercase text-sm">{MONTHS[month]} {year}</h3>
        <button type="button" onClick={next} aria-label="Mois suivant" className="p-1 hover:bg-black/5 rounded"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {DAYS.map((d, i) => <div key={i} className="py-1 font-semibold text-black/60">{d}</div>)}
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const booked = bookedSet.has(c.key);
          const isToday = c.key === todayKey;
          const past = c.date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <div
              key={i}
              className={`rounded-md ${compact ? "py-1.5" : "py-2"} text-xs font-medium border`}
              style={
                booked
                  ? { background: "oklch(0.55 0.2 25)", borderColor: "transparent", color: "white" }
                  : past
                    ? { background: "rgba(0,0,0,.04)", borderColor: "rgba(0,0,0,.06)", color: "rgba(0,0,0,.35)" }
                    : isToday
                      ? { background: teal, borderColor: "transparent", color: "oklch(0.15 0.02 200)" }
                      : { background: "white", borderColor: "rgba(0,0,0,.1)" }
              }
            >
              {c.date.getDate()}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] text-black/70">
        <Legend color="oklch(0.55 0.2 25)" label="Occupé" />
        <Legend color={teal} label="Aujourd'hui" />
        <Legend color="white" border label="Libre" />
      </div>
    </div>
  );
}

function Legend({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded" style={{ background: color, border: border ? "1px solid rgba(0,0,0,.2)" : undefined }} />
      {label}
    </span>
  );
}
