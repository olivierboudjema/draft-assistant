import { useState, useMemo } from 'react'
import './App.css'
import maps from '../maps.json';
import heroes from '../heroes.json';

const ALL_MAPS = maps.map((m) => m.name);
const HERO_LIST = heroes.map((h) => h.name);

const TIER_BONUS = {
  "S": 2,
  "A": 1,
  "B": 0,
  "C": -1,
  "D": -2
};

function cleanArray(arr) {
  return Array.isArray(arr)
    ? arr
        .map((x) => (typeof x === 'string' ? x.trim() : x))
        .filter(Boolean)
    : [];
}

function resolveMapNameFromId(id) {
  if (!id) return null;
  const m = maps.find((m) => m.id === id);
  // Si on ne trouve pas, on renvoie l'id brut pour éviter un crash
  return m ? m.name : id;
}

function buildHeroDB() {
  const db = {};

  heroes.forEach((raw) => {
    const name = raw.name;

    db[name] = {
      name,
      tier: raw.tier || 'B',
      role: raw.role || 'dps range auto attack',

      favMaps: cleanArray(raw.map_strong).map(resolveMapNameFromId),
      badMaps: cleanArray(raw.map_weak).map(resolveMapNameFromId),

      synergies: cleanArray(raw.synergy_with),
      counters: cleanArray(raw.counter_by),
    };
  });

  return db;
}




const ROLE_KEYS = [
  "guerrier defensif",
  "guerrier offensif",
  "healer",
  "dps melee",
  "dps range mage",
  "dps range auto attack",
];

function teamRoleCounts(names, DB) {
  const c = Object.fromEntries(ROLE_KEYS.map((k) => [k, 0]));
  names.forEach((n) => {
    const r = DB[n]?.role;
    if (r) c[r]++;
  });
  return c;
}

function meleeCount(names, DB) {
  return names.filter((n) => DB[n]?.role === "dps melee").length;
}

const MAX_BY_ROLE = {
  "guerrier defensif": 1,
  "guerrier offensif": 1,
  healer: 1,
  "dps melee": 1,
  "dps range mage": 1,
  "dps range auto attack": 1,
};

function computeScoreFor(hero, DB, state, opts = {}) {
  const { ignoreLocks = false, selfNeutralizeRole = false, sideForRole = "allies" } = opts;
  const H = DB[hero];
  if (!H) return -999;
  const picked = [...state.allies, ...state.enemies];
  const banned = [...state.bansAllies, ...state.bansEnemies];
  if (!ignoreLocks) {
    if (picked.includes(hero) || banned.includes(hero)) return -999;
  }
  let score = 10;
  score += TIER_BONUS[H.tier] ?? 0;

  const teamList = sideForRole === "enemies" ? state.enemies : state.allies;
  const oppList = sideForRole === "enemies" ? state.allies : state.enemies;
  const listForCount = selfNeutralizeRole
    ? teamList.filter((n) => n !== hero)
    : teamList;

  const counts = teamRoleCounts(listForCount, DB);
  const currentCount = counts[H.role] || 0;
  if (currentCount >= 1) score -= currentCount === 1 ? 1 : 2;
  if (H.role === "dps melee" && meleeCount(listForCount, DB) >= 1) score -= 2;
  if (currentCount >= (MAX_BY_ROLE[H.role] || 1)) score -= 3;

  if (state.map && H.favMaps.includes(state.map)) score += 1;
  if (state.map && H.badMaps.includes(state.map)) score -= 1;

  H.synergies.forEach((a) => {
    if (teamList.includes(a)) score += 1;
  });
  H.counters.forEach((e) => {
    if (oppList.includes(e)) score += 1.5;
  });
  oppList.forEach((e) => {
    const list = DB[e]?.counters || [];
    if (list.includes(hero)) score -= 1.5;
  });
  teamList.forEach((e) => {
    const syn = DB[e]?.synergies || [];
    if (syn.includes(hero)) score += 0.5;
  });

  return score;
}

function computeScore(hero, DB, state) {
  return computeScoreFor(hero, DB, state, { ignoreLocks: false });
}

function explainScore(hero, DB, state, opts = {}) {
  const { selfNeutralizeRole = false, sideForRole = "allies" } = opts;
  const H = DB[hero];
  if (!H) return [];
  const rows = [];
  rows.push({ label: "Base", delta: 10 });
  const tier = TIER_BONUS[H.tier] ?? 0;
  if (tier) rows.push({ label: `Tier ${H.tier}`, delta: tier });

  const teamList = sideForRole === "enemies" ? state.enemies : state.allies;
  const oppList = sideForRole === "enemies" ? state.allies : state.enemies;
  const listForCount = selfNeutralizeRole
    ? teamList.filter((n) => n !== hero)
    : teamList;

  const counts = teamRoleCounts(listForCount, DB);
  const currentCount = counts[H.role] || 0;
  if (currentCount >= 1)
    rows.push({
      label: `Rôle déjà présent (${H.role})`,
      delta: currentCount === 1 ? -1 : -2,
    });
  if (H.role === "dps melee" && meleeCount(listForCount, DB) >= 1)
    rows.push({ label: "Deuxième melee (éviter 2× melee)", delta: -2 });
  if (currentCount >= (MAX_BY_ROLE[H.role] || 1))
    rows.push({ label: "Slot de rôle déjà complet", delta: -3 });

  if (state.map && H.favMaps.includes(state.map))
    rows.push({ label: `Carte favorable (${state.map})`, delta: +1 });
  if (state.map && H.badMaps.includes(state.map))
    rows.push({ label: `Carte défavorable (${state.map})`, delta: -1 });

  H.synergies.forEach((a) => {
    if (teamList.includes(a))
      rows.push({ label: `Synergie avec ${a}`, delta: +1 });
  });
  H.counters.forEach((e) => {
    if (oppList.includes(e))
      rows.push({ label: `Contre ${e}`, delta: +1.5 });
  });
  oppList.forEach((e) => {
    const list = DB[e]?.counters || [];
    if (list.includes(hero))
      rows.push({ label: `Se fait contrer par ${e}`, delta: -1.5 });
  });
  teamList.forEach((e) => {
    const syn = DB[e]?.synergies || [];
    if (syn.includes(hero))
      rows.push({ label: `Bloque synergie adverse avec ${e}`, delta: +0.5 });
  });

  return rows;
}

const ROLE_META = {
  healer: {
    badge: "✚",
    cls: "bg-emerald-900/40 text-emerald-200 border-emerald-500/50",
  },
  "guerrier defensif": {
    badge: "🛡",
    cls: "bg-cyan-900/40 text-cyan-200 border-cyan-500/50",
  },
  "guerrier offensif": {
    badge: "⛨",
    cls: "bg-amber-900/40 text-amber-200 border-amber-500/50",
  },
  "dps melee": {
    badge: "⚔",
    cls: "bg-rose-900/40 text-rose-200 border-rose-500/50",
  },
  "dps range mage": {
    badge: "✦",
    cls: "bg-fuchsia-900/40 text-fuchsia-200 border-fuchsia-500/50",
  },
  "dps range auto attack": {
    badge: "➤",
    cls: "bg-indigo-900/40 text-indigo-200 border-indigo-500/50",
  },
};

function RoleChip({ role }) {
  const m = ROLE_META[role] || { badge: "•", cls: "bg-slate-800/40" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${m.cls}`}>
      <span>{m.badge}</span>
      {role}
    </span>
  );
}

function HeroInfoHover({ name, DB, children }) {
  const info = DB?.[name];
  if (!info) return <>{children}</>;
  return (
    <span className="relative group inline-block">
      {children}
      <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition absolute top-full left-0 mt-2 z-[999] rounded-2xl border border-indigo-700/40 bg-[#05070f] w-[300px] max-w-[92vw] p-4 text-[12px] shadow-2xl">
        <div className="font-semibold text-sm mb-3 text-indigo-300">{name}</div>
        <div className="flex flex-col text-[11px] text-left space-y-2">
          <div>
            <b><span className="text-indigo-400">Tier:</span></b> <span className="text-slate-200">{info.tier}</span>
          </div>
          <div>
            <b><span className="text-indigo-400">Rôle:</span></b> <span className="text-slate-200">{info.role}</span>
          </div>

          <div>
            <b><span className="text-emerald-400">Maps favorable:</span></b>
            <div className="text-slate-300 ml-2">{info.favMaps.join(", ") || "—"}</div>
          </div>

          <div>
            <b><span className="text-rose-400">Maps nulles:</span></b>
            <div className="text-slate-300 ml-2">{info.badMaps.join(", ") || "—"}</div>
          </div>

          <div>
            <b><span className="text-cyan-400">Synergies:</span></b>
            <div className="text-slate-300 ml-2">{info.synergies.join(", ") || "—"}</div>
          </div>

          <div>
            <b><span className="text-amber-400">Contre:</span></b>
            <div className="text-slate-300 ml-2">{info.counters.join(", ") || "—"}</div>
          </div>
        </div>
      </div>
    </span>
  );
}

function ScoreBadge({ value, breakdown }) {
  return (
    <span className="relative group inline-flex items-center">
      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-600/40">
        {value.toFixed(1)}
      </span>
      {breakdown && (
        <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 rounded-2xl border border-indigo-700/40 bg-[#05070f] w-[300px] max-w-[92vw] p-4 text-[12px] shadow-2xl">
          <div className="font-semibold text-sm mb-2">Détail du score</div>
          <ul className="space-y-1 max-h-64 overflow-auto pr-1">
            {breakdown.map((row, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span className="opacity-80">{row.label}</span>
                <span className="font-mono">
                  {row.delta > 0 ? "+" : ""}
                  {row.delta.toFixed(2)}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-3 pt-1 mt-1 border-t border-slate-700">
              <span className="font-semibold">Total</span>
              <span className="font-mono font-bold">{value.toFixed(2)}</span>
            </li>
          </ul>
        </div>
      )}
    </span>
  );
}

function HeroCard({ name, role, score, breakdown, DB }) {
  return (
    <div className="group relative rounded-2xl bg-[#0a0e1a]/90 border border-slate-800 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-indigo-500/70 hover:bg-[#0c1222]">
      <div className="flex items-center justify-between">
        <HeroInfoHover name={name} DB={DB}>
          <div className="font-semibold text-sm truncate mr-2">{name}</div>
        </HeroInfoHover>
        <ScoreBadge value={score} breakdown={breakdown} />
      </div>
      <div className="mt-1 flex justify-start">
        <RoleChip role={role} />
      </div>
    </div>
  );
}

function ListBox({ title, items, onRemove, compact, DB, state, side = "allies" }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#0a0e1a]/90 p-3 ${compact ? "py-2" : ""}`}>
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className={`flex flex-col ${compact ? "gap-1 min-h-[120px]" : "gap-2 min-h-[180px]"}`}>
        {items.map((h, i) => {
          const role = DB[h]?.role;
          const score = computeScoreFor(h, DB, state, {
            ignoreLocks: true,
            selfNeutralizeRole: true,
            sideForRole: side,
          });
          const breakdown = explainScore(h, DB, state, {
            selfNeutralizeRole: true,
            sideForRole: side,
          });
          return (
            <div key={h + String(i)} className={`flex items-center ${compact ? "gap-1 text-xs" : "gap-2 text-sm"}`}>
              <HeroInfoHover name={h} DB={DB}>
                <span className={`rounded-lg bg-slate-900/80 border border-slate-700 ${compact ? "px-2 py-0.5" : "px-2 py-1"}`}>
                  {h}
                </span>
              </HeroInfoHover>
              {role && (
                <span className="ml-1">
                  <RoleChip role={role} />
                </span>
              )}
              <ScoreBadge value={score} breakdown={breakdown} />
              <button
                onClick={() => onRemove(i)}
                className={`ml-auto ${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} rounded bg-slate-700 hover:bg-slate-600`}
              >
                Retirer
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddHeroInput({ placeholder, onAdd, disabled }) {
  const [value, setValue] = useState("");
  const submit = () => {
    if (!value) return;
    onAdd(value);
    setValue("");
  };
  return (
    <div className="flex gap-2 items-center mb-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        list="all-heroes"
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="px-3 py-1 text-sm rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40"
      >
        OK
      </button>
      <datalist id="all-heroes">
        {HERO_LIST.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
    </div>
  );
}

function StatusChip({ label, state }) {
  const cls =
    state === "ok"
      ? "bg-emerald-900/40 text-emerald-200 border-emerald-600/40"
      : state === "warn"
        ? "bg-rose-900/40 text-rose-200 border-rose-600/40"
        : "bg-amber-900/40 text-amber-200 border-amber-600/40";
  const icon = state === "ok" ? "✔" : state === "warn" ? "⚠" : "…";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${cls}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

function getCompositionStatus(allies, DB) {
  const c = teamRoleCounts(allies, DB);
  const defCount = c["guerrier defensif"];
  const offCount = c["guerrier offensif"];
  const healCount = c["healer"];

  const defOk = defCount >= 1;
  const offOk = offCount >= 1;
  const healOk = healCount >= 1;

  const defTooMany = defCount > 1;
  const offTooMany = offCount > 1;
  const healTooMany = healCount > 1;

  const dpsSlot1Ok = c["dps range mage"] + c["dps melee"] >= 1;
  const dpsSlot2Ok = c["dps range auto attack"] + c["dps melee"] >= 1;
  const noDoubleMelee = c["dps melee"] <= 1;

  return { defOk, offOk, healOk, defTooMany, offTooMany, healTooMany, dpsSlot1Ok, dpsSlot2Ok, noDoubleMelee };
}

function GlobalScores({ DB, state }) {
  const alliesScore = state.allies.reduce(
    (acc, h) =>
      acc +
      computeScoreFor(h, DB, state, {
        ignoreLocks: true,
        selfNeutralizeRole: true,
        sideForRole: "allies",
      }),
    0
  );
  const enemiesScore = state.enemies.reduce(
    (acc, h) =>
      acc +
      computeScoreFor(h, DB, state, {
        ignoreLocks: true,
        selfNeutralizeRole: true,
        sideForRole: "enemies",
      }),
    0
  );
  return (
    <div className="rounded-xl bg-[#0a0e1a]/80 border border-slate-800 p-3 flex items-center justify-center gap-6">
      <div className="text-sm opacity-70"></div>
      <div className="text-lg font-semibold">
        Alliés : <span className="text-emerald-300">{alliesScore.toFixed(1)}</span>
      </div>
      <div className="text-lg font-semibold">
        Adversaires : <span className="text-rose-300">{enemiesScore.toFixed(1)}</span>
      </div>
    </div>
  );
}

export default function DraftAssistant() {
  const DB = useMemo(() => buildHeroDB(), []);
  const [map, setMap] = useState(ALL_MAPS[0]);
  const [allies, setAllies] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [bansAllies, setBansAllies] = useState([]);
  const [bansEnemies, setBansEnemies] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

  const state = { map, allies, enemies, bansAllies, bansEnemies };

  function addTo(setter, list, name, limit) {
    if (!HERO_LIST.includes(name)) return;
    if (list.includes(name)) return;
    if ([...allies, ...enemies, ...bansAllies, ...bansEnemies].includes(name)) return;
    if (limit && list.length >= limit) return;
    setter([...list, name]);
  }

  function removeFrom(setter, list, idx) {
    const copy = [...list];
    copy.splice(idx, 1);
    setter(copy);
  }

  function resetAll() {
    setAllies([]);
    setEnemies([]);
    setBansAllies([]);
    setBansEnemies([]);
    setMap(ALL_MAPS[0]);
  }

  const allyReco = useMemo(() => {
    return HERO_LIST.filter(
      (h) =>
        !allies.includes(h) &&
        !enemies.includes(h) &&
        !bansAllies.includes(h) &&
        !bansEnemies.includes(h)
    )
      .map((h) => ({
        name: h,
        role: DB[h].role,
        score: computeScore(h, DB, state),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [map, allies, enemies, bansAllies, bansEnemies, DB]);

  const enemyPotential = useMemo(() => {
    const mirrorState = {
      map,
      allies: enemies,
      enemies: allies,
      bansAllies: bansEnemies,
      bansEnemies: bansAllies,
    };
    return HERO_LIST.filter(
      (h) =>
        !allies.includes(h) &&
        !enemies.includes(h) &&
        !bansAllies.includes(h) &&
        !bansEnemies.includes(h)
    )
      .map((h) => ({
        name: h,
        role: DB[h].role,
        score: computeScoreFor(h, DB, mirrorState, { sideForRole: "allies" }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [map, allies, enemies, bansAllies, bansEnemies, DB]);

  const comp = getCompositionStatus(allies, DB);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(1200px_600px_at_50%_-200px,rgba(26,32,54,0.7),transparent)] bg-[#05070d] text-slate-100">
      <div className="sticky top-0 z-10 backdrop-blur bg-[#080c17]/90  border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-3">
          <div className="text-xl font-semibold">Draft Assistant</div>
          <div className="flex-1 text-sm text-center">
            Map:
            <select
              className="ml-2 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={map}
              onChange={(e) => setMap(e.target.value)}
            >
              {ALL_MAPS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="text-sm rounded-lg bg-indigo-900/40 border border-indigo-700/40 px-3 py-1 hover:bg-indigo-800/50"
            >
              Scores
            </button>
            <button
              onClick={resetAll}
              className="text-sm rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 hover:bg-slate-700"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 pb-3">
          <GlobalScores DB={DB} state={state} />
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowHelp(false)}
          />
          <div className="relative z-50 w-[680px] max-w-[92vw] rounded-2xl bg-[#0a0e1a] border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Calcul des scores</div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-sm rounded-md px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                Fermer
              </button>
            </div>
            <div className="text-sm leading-relaxed space-y-2">
              <p>Chaque héros démarre à 10, puis :</p>
              <ul className="list-disc ml-5 space-y-1 text-left">
                <li>Tier : S = +2, A = +1, B = 0, C = −1, D = −2</li>
                <li>Rôle déjà présent : −1 (−2 si déjà 2×). Si slot complet : −3.</li>
                <li>Carte : favorable +1, défavorable −1</li>
                <li>Contre un ennemi : +1.5 par cible</li>
                <li>Se fait contrer : −1.5 par héros qui le contre</li>
                <li>Synergies alliées : +1 par allié synergique</li>
                <li>Bloque une synergie ennemie : +0.5</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 p-4">
        {/* Colonne gauche */}
        <aside className="col-span-12 md:col-span-3 flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-800 bg-[#0a0e1a]/90 p-3">
            <div className="text-sm font-semibold mb-2">Ban allié (3 max)</div>
            <AddHeroInput
              placeholder="Ajouter un ban…"
              onAdd={(v) => addTo(setBansAllies, bansAllies, v, 3)}
              disabled={bansAllies.length >= 3}
            />
            <ListBox
              items={bansAllies}
              onRemove={(i) => removeFrom(setBansAllies, bansAllies, i)}
              compact
              DB={DB}
              state={state}
              side="allies"
            />
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <div className="text-sm font-semibold mb-2">Picks alliés</div>
            <AddHeroInput
              placeholder="Ajouter un pick…"
              onAdd={(v) => addTo(setAllies, allies, v)}
            />
            <ListBox
              items={allies}
              onRemove={(i) => removeFrom(setAllies, allies, i)}
              DB={DB}
              state={state}
              side="allies"
            />
          </div>
        </aside>

        {/* Centre */}
        <main className="col-span-12 md:col-span-6 flex flex-col gap-4">
          <div className="rounded-xl bg-[#0a0e1a]/80 border border-slate-800 p-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusChip
                label="Guerrier défensif"
                state={!comp.defOk ? "need" : comp.defTooMany ? "warn" : "ok"}
              />
              <StatusChip
                label="Guerrier offensif"
                state={!comp.offOk ? "need" : comp.offTooMany ? "warn" : "ok"}
              />
              <StatusChip
                label="Healer"
                state={!comp.healOk ? "need" : comp.healTooMany ? "warn" : "ok"}
              />
              <StatusChip
                label="Mage OU Melee"
                state={!comp.dpsSlot1Ok ? "need" : !comp.noDoubleMelee ? "warn" : "ok"}
              />
              <StatusChip
                label="AA OU Melee"
                state={!comp.dpsSlot2Ok ? "need" : !comp.noDoubleMelee ? "warn" : "ok"}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0a0e1a]/80 p-3">
            <div className="text-sm font-semibold mb-3">Reco allié à pick</div>
            <div className="grid grid-cols-3 gap-3">
              {allyReco.map((r) => (
                <HeroCard
                  key={r.name}
                  name={r.name}
                  role={r.role}
                  score={r.score}
                  breakdown={explainScore(r.name, DB, state, { sideForRole: "allies" })}
                  DB={DB}
                />
              ))}
              {allyReco.length === 0 && (
                <div className="col-span-3 text-xs opacity-60">Aucun héros disponible</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="text-sm font-semibold mb-3">
              Reco à ban (meilleurs picks potentiels pour l'adversaire)
            </div>
            <div className="grid grid-cols-3 gap-3">
              {enemyPotential.map((r) => (
                <HeroCard
                  key={r.name}
                  name={r.name}
                  role={r.role}
                  score={r.score}
                  breakdown={explainScore(
                    r.name,
                    DB,
                    {
                      map,
                      allies: enemies,
                      enemies: allies,
                      bansAllies: bansEnemies,
                      bansEnemies: bansAllies,
                    },
                    { sideForRole: "allies" }
                  )}
                  DB={DB}
                />
              ))}
              {enemyPotential.length === 0 && (
                <div className="col-span-3 text-xs opacity-60">
                  Aucun héros à ban suggéré
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Colonne droite */}
        <aside className="col-span-12 md:col-span-3 flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <div className="text-sm font-semibold mb-2">Ban adversaire (3 max)</div>
            <AddHeroInput
              placeholder="Ajouter un ban adverse…"
              onAdd={(v) => addTo(setBansEnemies, bansEnemies, v, 3)}
              disabled={bansEnemies.length >= 3}
            />
            <ListBox
              items={bansEnemies}
              onRemove={(i) => removeFrom(setBansEnemies, bansEnemies, i)}
              compact
              DB={DB}
              state={state}
              side="enemies"
            />
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <div className="text-sm font-semibold mb-2">Picks adverses</div>
            <AddHeroInput
              placeholder="Ajouter un pick adverse…"
              onAdd={(v) => addTo(setEnemies, enemies, v)}
            />
            <ListBox
              items={enemies}
              onRemove={(i) => removeFrom(setEnemies, enemies, i)}
              DB={DB}
              state={state}
              side="enemies"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}




