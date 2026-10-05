import { useState, useMemo, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import './App.css'
import maps from '../maps.json';
import heroes from '../heroes.json';
import gamesFile from '../games.json';

const ALL_MAPS = maps.map((m) => m.name);
const DEFAULT_MAP = "Comté du dragon";
const MAP_LANES = Object.fromEntries(maps.map((m) => [m.name, m.lanes]));
const HERO_LIST = heroes.map((h) => h.name);

const HERO_PAIRS = { "Cho": "Gall", "Gall": "Cho" };

const TIER_BONUS = {
  "S": 1,
  "A": 0.5,
  "B": 0,
  "C": -0.5,
  "D": -1
};

// Plage visuelle utilisée pour le dégradé des scores
const SCORE_VISUAL_RANGE = { min: 5, max: 22 };

// Événements globaux signalant qu'une carte héros est en cours de glisser-déposer,
// pour que les zones de dépôt (ListBox) puissent se mettre en surbrillance.
const HERO_DRAG_START_EVENT = "hero-drag-start";
const HERO_DRAG_END_EVENT = "hero-drag-end";

const HERO_IMAGE_BASE = "https://raw.githubusercontent.com/heroespatchnotes/heroes-talents/master/images/heroes";

const HERO_SLUG_OVERRIDES = {
  "aile de mort": "deathwing",
  "asmodan": "azmodan",
  "balafre": "stitches",
  "blanchetete": "whitemane",
  "bourbie": "murky",
  "boucher": "thebutcher",
  "chacal": "junkrat",
  "cho": "chogall",
  "gall": "chogall",
  "varian tank": "varian",
  "varian bruiser": "varian",
  "varian dps mêlée": "varian",
  "dva": "dva",
  "etc": "etc",
  "sergent marteau": "sgthammer",
  "kramer tank": "blaze",
  "kramer dps": "blaze",
  "lardeur": "hogger",
  "les vikings perdus": "lostvikings",
  "li-li": "lili",
  "li-ming": "liming",
  "lt morales": "ltmorales",
  "luisaile": "brightwing",
  "nasibo": "nazeebo",
};

function heroSlug(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase();
  const override = HERO_SLUG_OVERRIDES[key];
  if (override) return override;

  const ascii = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const slug = ascii.replace(/[^a-z0-9]/g, "");
  return slug || null;
}

// Portraits hébergés localement pour les héros absents du dépôt d'images externe
// (ex. héros tout juste sortis, pas encore repris par heroespatchnotes/heroes-talents).
const LOCAL_PORTRAIT_OVERRIDES = {
  "xal'atath": "/xalatath-portrait.jpg",
};

function heroPortraitUrl(name) {
  const key = String(name || "").trim().toLowerCase();
  if (LOCAL_PORTRAIT_OVERRIDES[key]) return LOCAL_PORTRAIT_OVERRIDES[key];

  const slug = heroSlug(name);
  if (!slug) return null;
  return `${HERO_IMAGE_BASE}/${slug}.png`;
}

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

function buildHeroDB(heroStats = {}) {
  const db = {};

  heroes.forEach((raw) => {
    const name = raw.name;

    db[name] = {
      name,
      tier: raw.tier || 'B',
      role: raw.role || 'Range Auto',

      favMaps: cleanArray(raw.map_strong).map(resolveMapNameFromId),
      badMaps: cleanArray(raw.map_weak).map(resolveMapNameFromId),

      synergies: cleanArray(raw.synergy_with),
      counters: cleanArray(raw.counter_by),
      portrait: heroPortraitUrl(name),
      stats: heroStats[name] || null,
    };
  });

  return db;
}


function PortalTooltip({ children, content, isOpen = null, offset = 0, onHoverChange = null }) {
  const ref = useRef(null);
  const tooltipRef = useRef(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const open = isOpen !== null ? isOpen : internalOpen;

  useEffect(() => {
    if (!open) return;

    function update() {
      const el = ref.current;
      if (!el) return;

      const r = el.getBoundingClientRect();

      // largeur max du tooltip ≈ 300px -> moitié ≈ 150
      const HALF_TOOLTIP = 160; // petite marge de sécurité
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth || 0;

      let center = r.left + r.width / 2 + offset;

      if (viewportWidth > 0) {
        if (viewportWidth <= 2 * HALF_TOOLTIP) {
          // écran très petit : centre forcé au milieu
          center = viewportWidth / 2;
        } else {
          const minCenter = HALF_TOOLTIP;
          const maxCenter = viewportWidth - HALF_TOOLTIP;
          center = Math.max(minCenter, Math.min(center, maxCenter));
        }
      }

      setPos({ left: center, top: r.top });
    }

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, offset]);

  function isStayingInTooltipZone(event) {
    const next = event?.relatedTarget;
    if (!next) return false;
    if (ref.current && ref.current.contains(next)) return true;
    if (tooltipRef.current && tooltipRef.current.contains(next)) return true;
    return false;
  }

  function handleOpen() {
    if (onHoverChange) onHoverChange(true);
    if (isOpen === null) setInternalOpen(true);
  }

  function handleClose(event) {
    if (isStayingInTooltipZone(event)) return;
    if (isOpen === null) {
      setInternalOpen(false);
    } else if (onHoverChange) {
      onHoverChange(false);
    }
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        className="inline-block"
      >
        {children}
      </span>

      {open && content &&
        ReactDOM.createPortal(
          <div
            ref={tooltipRef}
            style={{ left: pos.left, top: pos.top - 8 }}
            className="portal-tooltip fixed z-50 -translate-x-1/2 transform"
            // IMPORTANT : on garde le tooltip ouvert quand la souris est dessus
            onMouseEnter={handleOpen}
            onMouseLeave={handleClose}
          >
            <div className="pointer-events-auto text-slate-200">
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}





const ROLE_KEYS = [
  "Tank",
  "Bruiser",
  "Healer",
  "Dps Mêléee",
  "Mage",
  "Range Auto",
];

function teamRoleCounts(names, DB) {
  const c = Object.fromEntries(ROLE_KEYS.map((k) => [k, 0]));
  names.forEach((n) => {
    const r = DB[n]?.role;
    if (r) c[r]++;
  });
  return c;
}

function MêléeCount(names, DB) {
  return names.filter((n) => DB[n]?.role === "Dps Mêléee").length;
}

const MAX_BY_ROLE = {
  "Tank": 1,
  "Bruiser": 1,
  Healer: 1,
  "Dps Mêléee": 1,
  "Mage": 1,
  "Range Auto": 1,
};

// Poids des critères du score (cf. fenêtre "Algo")
const WEIGHTS = {
  base: 10,
  roleDuplicate: -2,
  secondMelee: -2,
  mapFavorable: 0.5,
  mapUnfavorable: -0.5,
  synergy: 0.5,
  counters: 0.5,
  countered: -0.5,
  protectsFromCounter: 0.5,
  blocksEnemySynergy: 0.5,
};

// Couleurs des lignes du détail du score (mêmes teintes que la fiche du héros)
const SCORE_COLORS = {
  base: "text-slate-300",
  tier: "text-indigo-400",
  popularity: "text-fuchsia-400",
  performance: "text-sky-400",
  role: "text-indigo-400",
  mapGood: "text-emerald-400",
  mapBad: "text-rose-400",
  synergy: "text-cyan-400",
  counter: "text-amber-400",
};

function computeScoreFor(hero, DB, state, opts = {}) {
  const { ignoreLocks = false } = opts;
  if (!DB[hero]) return -999;

  // On évite les héros déjà pick ou bannis (sauf si ignoreLocks)
  if (!ignoreLocks) {
    const locked = [...state.allies, ...state.enemies, ...state.bansAllies, ...state.bansEnemies];
    if (locked.includes(hero)) return -999;
  }

  return explainScore(hero, DB, state, opts).reduce((acc, row) => acc + row.delta, 0);
}

function computeScore(hero, DB, state) {
  return computeScoreFor(hero, DB, state, { ignoreLocks: false });
}

// Détail du score : une ligne par critère appliqué ({ label, delta, color }).
// Le score d'un héros est la somme de ces lignes.
function explainScore(hero, DB, state, opts = {}) {
  const { selfNeutralizeRole = false, sideForRole = "allies" } = opts;
  const H = DB[hero];
  if (!H) return [];

  const rows = [];
  const add = (label, delta, color) => rows.push({ label, delta, color });

  // Base
  add("Base", WEIGHTS.base, SCORE_COLORS.base);

  // Tier
  const tier = TIER_BONUS[H.tier] ?? 0;
  if (tier) add(`Tier ${H.tier}`, tier, SCORE_COLORS.tier);

  // Popularité
  const pop = state.popularityBonus?.[hero] ?? 0;
  if (pop) add(pop >= 1 ? "Top 25% popularité" : "Top 50% popularité", pop, SCORE_COLORS.popularity);

  // Performance réelle sur les games enregistrées
  const perf = state.performanceBonus?.[hero] ?? 0;
  const stats = state.heroStats?.[hero];
  if (perf && stats) {
    add(
      `${perf > 0 ? "Bonnes" : "Mauvaises"} perfs (${formatWinRate(stats)})`,
      perf,
      SCORE_COLORS.performance
    );
  }

  // Côté de référence
  const teamList = sideForRole === "enemies" ? state.enemies : state.allies;
  const oppList = sideForRole === "enemies" ? state.allies : state.enemies;

  const listForCount = selfNeutralizeRole
    ? teamList.filter((n) => n !== hero)
    : teamList;

  // --- RÔLES ---
  const counts = teamRoleCounts(listForCount, DB);
  if ((counts[H.role] || 0) >= 1) {
    add(`Rôle déjà présent (${H.role})`, WEIGHTS.roleDuplicate, SCORE_COLORS.role);
  }

  if (H.role === "Dps Mêléee" && MêléeCount(listForCount, DB) >= 1) {
    add("Deuxième Mêlée (éviter 2× Mêlée)", WEIGHTS.secondMelee, SCORE_COLORS.role);
  }

  // --- CARTES ---
  if (state.map && H.favMaps?.includes(state.map)) {
    add("Carte favorable", WEIGHTS.mapFavorable, SCORE_COLORS.mapGood);
  }

  if (state.map && H.badMaps?.includes(state.map)) {
    add(`Carte défavorable (${state.map})`, WEIGHTS.mapUnfavorable, SCORE_COLORS.mapBad);
  }

  // --- SYNERGIES ALLIÉES ---
  (H.synergies || []).forEach((ally) => {
    if (teamList.includes(ally)) add(`Synergie avec ${ally}`, WEIGHTS.synergy, SCORE_COLORS.synergy);
  });

  // --- CONTRE LES ENNEMIS (les ennemis ont un counter sur nous) ---
  oppList.forEach((enemy) => {
    if ((DB[enemy]?.counters || []).includes(hero)) add(`Contre ${enemy}`, WEIGHTS.counters, SCORE_COLORS.counter);
  });

  // --- NOUS SOMMES CONTRÉS PAR CERTAINS HÉROS ---
  const counterByList = H.counters || [];

  oppList.forEach((enemy) => {
    if (counterByList.includes(enemy)) add(`Se fait contrer par ${enemy}`, WEIGHTS.countered, SCORE_COLORS.counter);
  });

  teamList.forEach((ally) => {
    if (counterByList.includes(ally)) {
      add(`Empeche de se faire contrer par ${ally}`, WEIGHTS.protectsFromCounter, SCORE_COLORS.counter);
    }
  });

  // --- BLOQUE LES SYNERGIES ADVERSES ---
  oppList.forEach((enemy) => {
    if ((DB[enemy]?.synergies || []).includes(hero)) {
      add(`Bloque synergie adverse avec ${enemy}`, WEIGHTS.blocksEnemySynergy, SCORE_COLORS.synergy);
    }
  });

  return rows;
}


const ROLE_META = {
  Healer: {
    badge: "✚",
    cls: "bg-emerald-900/40 text-emerald-200 border-emerald-500/50",
  },
  "Tank": {
    badge: "🛡",
    cls: "bg-cyan-900/40 text-cyan-200 border-cyan-500/50",
  },
  "Bruiser": {
    badge: "⛨",
    cls: "bg-amber-900/40 text-amber-200 border-amber-500/50",
  },
  "Dps Mêléee": {
    badge: "⚔",
    cls: "bg-rose-900/40 text-rose-200 border-rose-500/50",
  },
  "Mage": {
    badge: "✦",
    cls: "bg-fuchsia-900/40 text-fuchsia-200 border-fuchsia-500/50",
  },
  "Range Auto": {
    badge: "➤",
    cls: "bg-indigo-900/40 text-indigo-200 border-indigo-500/50",
  },
};

const PANEL_CLASS =
  "rounded-3xl border border-indigo-900/50 bg-gradient-to-br from-[#0a1330]/75 via-[#101B35]/70 to-[#292757]/65 backdrop-blur-2xl shadow-[0_20px_70px_rgba(2,6,23,0.65)]";

const SECTION_TITLE_CLASS =
  "text-[11px] uppercase tracking-[0.4em] text-indigo-100/70 font-semibold";

function HeroPortrait({ name, src, size = 48, score = null }) {
  const [error, setError] = useState(false);
  const dimension = typeof size === "number" ? `${size}px` : size;
  const initials = (name || "?").slice(0, 2).toUpperCase();
  const range = SCORE_VISUAL_RANGE;
  const ratio = score == null ? 0.5 : clamp01((score - range.min) / (range.max - range.min));
  const boosted = Math.pow(ratio, 1.45);
  const brightness = 0.35 + boosted * 1.25; // pousse plus loin la brillance avec le score
  const glow = [
    `0 5px ${10 + boosted * 30}px rgba(88,160,255,${0.16 + brightness * 0.5})`,
    `0 0 ${14 + boosted * 34}px rgba(190,150,255,${0.14 + brightness * 0.42})`,
    `0 0 ${20 + boosted * 40}px rgba(255,220,200,${0.08 + brightness * 0.3})`,
    `inset 0 0 0 1px rgba(255,255,255,0.06)`,
  ].join(", ");

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-[10px] font-semibold text-white/70 shadow-inner"
      style={{ width: dimension, height: dimension, boxShadow: glow }}
    >
      {!error && src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : (
        <span className="opacity-70">{initials}</span>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/35" />
    </div>
  );
}

function RoleChip({ role }) {
  const m = ROLE_META[role] || { badge: "•", cls: "bg-slate-800/40" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border whitespace-nowrap ${m.cls}`}>
      <span>{m.badge}</span>
      {role}
    </span>
  );
}

function HeroInfoHover({ name, DB, children, showTooltip = null, onHoverChange = null }) {
  const info = DB?.[name];
  if (!info) return <>{children}</>;

  const TooltipContent = (
    <div className="rounded-2xl border border-indigo-700/40 bg-[#05070f] w-[300px] max-w-[92vw] p-4 text-[12px] shadow-2xl">
      <div className="flex items-center gap-3 mb-3">
        <HeroPortrait name={name} src={info.portrait} size={60} />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-indigo-300 truncate">{name}</div>
          <div className="text-xs text-slate-400">{info.role}</div>
        </div>
      </div>
      <div className="flex flex-col text-[11px] text-left space-y-2">
        <div>
          <b><span className="text-indigo-400">Tier:</span></b> <span className="text-slate-200">{info.tier}</span>
        </div>
        <div>
          <b><span className="text-sky-400">Win rate:</span></b>{" "}
          <span className="text-slate-200">{info.stats ? formatWinRate(info.stats) : "aucune game"}</span>
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
          <b><span className="text-amber-400">Se fait contrer:</span></b>
          <div className="text-slate-300 ml-2">{info.counters.join(", ") || "—"}</div>
        </div>
      </div>
    </div>
  );

  return <PortalTooltip content={TooltipContent} isOpen={showTooltip} offset={-100} onHoverChange={onHoverChange}>{children}</PortalTooltip>;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function mixColor(from, to, t) {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  const aFrom = from.length > 3 ? from[3] : 1;
  const aTo = to.length > 3 ? to[3] : 1;
  const a = aFrom + (aTo - aFrom) * t;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

function getScoreBadgeStyle(value) {
  const span = SCORE_VISUAL_RANGE.max - SCORE_VISUAL_RANGE.min;
  const ratio = clamp01((value - SCORE_VISUAL_RANGE.min) / span);
  const boosted = clamp01(ratio * 1.35); // réduit la plage perçue pour écarter plus vite les scores
  const eased = Math.pow(boosted, 1.35); // plus de contraste, surtout en haut de plage
  const brightness = 0.6 + ratio * 0.4; // contrôle linéaire de la brillance

  // Palette d'origine (bleu → violet → rose) mais poussée en intensité
  const start = mixColor([40, 70, 255, 0.9], [10, 180, 255, 0.98], eased);
  const mid = mixColor([200, 60, 255, 0.9], [110, 255, 220, 0.98], eased);
  const end = mixColor([255, 120, 200, 0.92], [255, 255, 190, 1], eased);

  const glow = mixColor([24, 60, 200, 0.45], [120, 255, 240, 0.82], eased);
  const halo = mixColor([10, 20, 80, 0.35], [255, 200, 255, 0.7], eased);
  const border = mixColor([150, 180, 255, 0.65], [140, 255, 230, 0.95], eased);
  const textColor = mixColor([185, 200, 230, 0.95], [255, 255, 245, 1], eased);

  const blur = (10 + eased * 22) * brightness;
  const heat = (8 + eased * 24) * brightness;
  const scale = 1 + eased * 0.2 * brightness;

  return {
    background: `linear-gradient(105deg, ${start}, ${mid} 55%, ${end})`,
    boxShadow: [
      `0 2px 6px rgba(0,0,0,0.35)`,
      `0 0 ${blur}px ${glow}`,
      `0 0 ${heat}px ${halo}`
    ].join(", "),
    color: textColor,
    transform: `scale(${scale})`,
    filter: `drop-shadow(0 0 ${Math.round(blur * 0.6)}px ${glow})`,
    borderColor: border,
  };
}

function ScoreBadge({ value, breakdown, showTooltip = null, onHoverChange = null }) {
  const badgeStyle = getScoreBadgeStyle(value);
  const Tooltip = breakdown
    ? (
      <div className="rounded-2xl border border-indigo-700/40 bg-[#05070f] w-[220px] max-w-[92vw] p-4 text-[12px] shadow-2xl text-slate-200">
        <div className="font-semibold text-sm mb-2">Détail du score</div>
        <ul className="space-y-1 max-h-64 overflow-auto pr-1">
          {breakdown.map((row, idx) => (
            <li key={idx} className="flex justify-between gap-3">
              <span className={row.color || "text-slate-100"}>{row.label}</span>
              <span className={`font-mono ${row.delta > 0 ? "text-emerald-300" : row.delta < 0 ? "text-rose-300" : "text-slate-100"}`}>
                {row.delta > 0 ? "+" : ""}
                {row.delta.toFixed(2)}
              </span>
            </li>
          ))}
          <li className="flex justify-between gap-3 pt-1 mt-1 border-t border-slate-700">
            <span className="font-semibold">Total</span>
            <span className="font-mono font-bold text-slate-100">{value.toFixed(2)}</span>
          </li>
        </ul>
      </div>
    )
    : null;

  return (
    <PortalTooltip content={breakdown ? Tooltip : null} isOpen={showTooltip} offset={100} onHoverChange={onHoverChange}>
      <span
        className="ml-2 text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center transition duration-200"
        style={badgeStyle}
      >
        {value.toFixed(1)}
      </span>
    </PortalTooltip>
  );
}

// Badge sur le portrait : "Top 5" doré et animé, "Top 10" rouge.
function PopularityBadge({ rank }) {
  if (rank > 10) return null;
  if (rank <= 5) {
    return (
      <span
        title={`Top 5 des héros les plus pick/ban (n°${rank})`}
        className="top5-badge absolute -top-2 -left-2 z-10 whitespace-nowrap rounded-full border border-yellow-100/90 px-1.5 py-px text-[8px] font-black uppercase tracking-wider text-amber-950"
      >
        👑 Top 5
      </span>
    );
  }
  return (
    <span
      title={`Top 10 des héros les plus pick/ban (n°${rank})`}
      className="absolute -top-1 -left-1 z-10 whitespace-nowrap rounded-full border border-red-300/70 bg-red-600 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-white shadow-[0_0_8px_rgba(239,68,68,0.8)]"
    >
      Top 10
    </span>
  );
}

function HeroCard({ name, role, score, breakdown, DB, popularityRank = Infinity }) {
  const [showTooltips, setShowTooltips] = useState(false);
  const cardRef = useRef(null);
  const dragGhostRef = useRef(null);

  const handleMouseLeave = (event) => {
    const next = event?.relatedTarget;
    const isInsideCard = next && cardRef.current?.contains(next);
    const isGoingToTooltip = next && typeof next.closest === "function" && next.closest(".portal-tooltip");

    if (!isInsideCard && !isGoingToTooltip) {
      setShowTooltips(false);
    }
  };

  const handleHoverChange = (open) => {
    setShowTooltips(open);
  };

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("hero", name);
        e.dataTransfer.effectAllowed = "copy";
        document.dispatchEvent(new CustomEvent(HERO_DRAG_START_EVENT));

        // Chrome/Edge assombrissent systématiquement l'aperçu natif du glisser-déposer,
        // même avec une image personnalisée. On masque donc cet aperçu natif (image vide)
        // et on affiche nous-mêmes un clone de la carte, opaque, qui suit le curseur.
        const original = e.currentTarget;
        const rect = original.getBoundingClientRect();
        const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        const emptyImage = document.createElement("canvas");
        emptyImage.width = 1;
        emptyImage.height = 1;
        e.dataTransfer.setDragImage(emptyImage, 0, 0);

        const ghost = original.cloneNode(true);
        ghost.style.position = "fixed";
        ghost.style.zIndex = "9999";
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        ghost.style.margin = "0";
        ghost.style.pointerEvents = "none";
        ghost.style.opacity = "1";
        ghost.style.backdropFilter = "none";
        ghost.style.background = "linear-gradient(to bottom right, #1c2f53, #284573, #2f5b88)";
        ghost.style.transform = "none";
        document.body.appendChild(ghost);
        dragGhostRef.current = ghost;

        // On pilote le clone via des écouteurs globaux (et non les props React
        // onDrag/onDragEnd) : le drop peut faire disparaître cette carte de la liste
        // (ex. déplacée vers "Picks alliés"), et un composant démonté ne reçoit plus
        // ses événements React, ce qui laisserait le clone bloqué à l'écran.
        const handleDrag = (ev) => {
          // En fin de glisser, certains navigateurs renvoient (0,0) : on ignore ce cas.
          if (ev.clientX === 0 && ev.clientY === 0) return;
          ghost.style.left = `${ev.clientX - offset.x}px`;
          ghost.style.top = `${ev.clientY - offset.y}px`;
        };

        const cleanup = () => {
          ghost.remove();
          if (dragGhostRef.current === ghost) dragGhostRef.current = null;
          document.removeEventListener("drag", handleDrag);
          document.removeEventListener("dragend", cleanup);
          document.removeEventListener("drop", cleanup, true);
          document.dispatchEvent(new CustomEvent(HERO_DRAG_END_EVENT));
        };

        document.addEventListener("drag", handleDrag);
        // "drop" (capturé avant que le composant source ne soit démonté par le
        // changement d'état) couvre le dépôt réussi ; "dragend" couvre l'annulation.
        document.addEventListener("drop", cleanup, true);
        document.addEventListener("dragend", cleanup);
      }}
      onMouseLeave={handleMouseLeave}
      className="group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#1c2f53]/78 via-[#284573]/65 to-[#2f5b88]/55 p-2.5 shadow-[0_10px_24px_rgba(5,10,26,0.55)] backdrop-blur transition hover:border-cyan-300/70 cursor-grab active:cursor-grabbing"
      style={{
        boxShadow: "0 10px 28px rgba(10,24,48,0.55), 0 0 26px rgba(140,200,255,0.22)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-40 transition">
        <div className="absolute -inset-8 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.65),_transparent_60%)] blur-3xl" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`relative ${popularityRank <= 5 ? "top5-ring rounded-xl" : ""}`}>
            <HeroPortrait name={name} src={DB[name]?.portrait} size={52} score={score} />
            <PopularityBadge rank={popularityRank} />
          </div>
          <div className="min-w-0">
            <HeroInfoHover name={name} DB={DB} showTooltip={showTooltips}>
              <div className="font-semibold text-sm truncate mr-2 tracking-wide">{name}</div>
            </HeroInfoHover>
            <div className="mt-1 flex">
              <RoleChip role={role} />
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <ScoreBadge value={score} breakdown={breakdown} showTooltip={showTooltips} onHoverChange={handleHoverChange} />
        </div>
      </div>
    </div>
  );
}

function HeroListRow({ name, role, score, breakdown, DB, compact, onRemove }) {
  const [showTooltips, setShowTooltips] = useState(false);
  const rowRef = useRef(null);

  const handleMouseLeave = (event) => {
    const next = event?.relatedTarget;
    const isInsideRow = next && rowRef.current?.contains(next);
    const isGoingToTooltip = next && typeof next.closest === "function" && next.closest(".portal-tooltip");

    if (!isInsideRow && !isGoingToTooltip) {
      setShowTooltips(false);
    }
  };

  const handleHoverChange = (open) => {
    setShowTooltips(open);
  };

  return (
    <div
      ref={rowRef}
      onMouseLeave={handleMouseLeave}
      className={`flex items-center justify-between ${compact ? "gap-1 text-xs" : "gap-2 text-sm"}`}
    >
      <div className="flex items-center flex-1 gap-1.5 min-w-0">
        <div>
          <HeroPortrait name={name} src={DB[name]?.portrait} size={compact ? 28 : 34} score={score} />
        </div>
        <HeroInfoHover name={name} DB={DB} showTooltip={showTooltips}>
          <span className={`rounded-xl border border-white/10 bg-white/5 text-slate-100 shadow-inner ${compact ? "px-2 py-0.5" : "px-3 py-1"} inline-flex items-center max-w-full truncate`}>
            {name}
          </span>
        </HeroInfoHover>
        {role && (
          <span className="ml-1">
            <RoleChip role={role} />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ScoreBadge value={score} breakdown={breakdown} showTooltip={showTooltips} onHoverChange={handleHoverChange} />
        <button
          onClick={onRemove}
          className={`${compact ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"} rounded-full border border-rose-500/60 text-rose-100 bg-rose-600/20 hover:bg-rose-600/40 transition`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ListBox({ title, items, onRemove, compact, DB, state, side = "allies", children = null, tall = false, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHeroDragging, setIsHeroDragging] = useState(false);

  useEffect(() => {
    const onStart = () => setIsHeroDragging(true);
    const onEnd = () => setIsHeroDragging(false);
    document.addEventListener(HERO_DRAG_START_EVENT, onStart);
    document.addEventListener(HERO_DRAG_END_EVENT, onEnd);
    return () => {
      document.removeEventListener(HERO_DRAG_START_EVENT, onStart);
      document.removeEventListener(HERO_DRAG_END_EVENT, onEnd);
    };
  }, []);

  // Hauteur réservée = juste la place des lignes compactes (3 bans ou 5 picks),
  // pour que les colonnes latérales tiennent dans l'écran sans scroller.
  const heightCls = tall
    ? compact
      ? "min-h-[96px]"
      : "min-h-[164px]"
    : compact
      ? "min-h-[164px]"
      : "min-h-[200px]";

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const heroName = e.dataTransfer.getData("hero");
    if (heroName && onDrop) onDrop(heroName);
  };

  return (
    <div
      className={`${PANEL_CLASS} ${compact ? "p-3.5" : "p-4"} transition-all ${isDragOver
        ? "ring-2 ring-cyan-400/70 bg-cyan-500/5"
        : isHeroDragging
          ? "ring-2 ring-cyan-300/60 bg-cyan-500/[0.04]"
          : ""
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`flex items-center justify-between ${compact ? "mb-2" : "mb-3"}`}>
        <div className={`${SECTION_TITLE_CLASS} ${compact ? "text-[9px]" : ""}`}>{title}</div>
        <span className="text-[10px] text-slate-400 tracking-widest">#{items.length}</span>
      </div>
      {children && <div className={compact ? "mb-2" : "mb-3"}>{children}</div>}
      <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"} ${heightCls}`}>
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
            <HeroListRow
              key={h + String(i)}
              name={h}
              role={role}
              score={score}
              breakdown={breakdown}
              DB={DB}
              compact={compact}
              onRemove={() => onRemove && onRemove(i)}
            />
          );
        })}
        {items.length === 0 && (
          <div className={`text-[11px] text-slate-400/70 text-center ${compact ? "py-2" : "py-4"}`}>
            Aucun héros pour le moment
          </div>
        )}
      </div>
    </div>
  );
}

// Recherche sans accents ni ponctuation, sur le nom français et le nom anglais (slug des portraits)
function searchKey(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

const HERO_SEARCH_INDEX = HERO_LIST.map((name) => ({ name, keys: [searchKey(name), heroSlug(name) || ""] }));

function searchHeroes(query, exclude) {
  const q = searchKey(query);
  if (!q) return [];
  const available = HERO_SEARCH_INDEX.filter((h) => !exclude.includes(h.name));
  const starts = available.filter((h) => h.keys.some((k) => k.startsWith(q)));
  const contains = available.filter((h) => !starts.includes(h) && h.keys.some((k) => k.includes(q)));
  return [...starts, ...contains].slice(0, 8).map((h) => h.name);
}

// Champ d'ajout de héros : taper quelques lettres puis Entrée (ou clic) ajoute le premier résultat.
// Flèches haut/bas pour choisir un autre résultat, Échap pour fermer.
function AddHeroInput({ placeholder, onAdd, disabled, exclude = [], DB }) {
  const [value, setValue] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const inputRef = useRef(null);

  const results = searchHeroes(value, exclude);
  const showList = open && !disabled && results.length > 0;

  // La liste est affichée dans un portail (position fixe) pour passer au-dessus des autres panneaux
  useEffect(() => {
    if (!showList) return;
    function update() {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setPos({ left: r.left, top: r.bottom + 4, width: r.width });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showList]);

  function pick(name) {
    if (!name) return;
    onAdd(name);
    setValue("");
    setHighlight(0);
  }

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            pick(results[highlight]);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((i) => Math.max(i - 1, 0));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20 transition disabled:opacity-40"
      />
      {showList && pos &&
        ReactDOM.createPortal(
          <ul
            style={{ left: pos.left, top: pos.top, width: Math.max(pos.width, 220) }}
            className="fixed z-50 max-h-80 overflow-auto rounded-2xl border border-indigo-700/40 bg-[#05070f] p-1 shadow-2xl"
          >
            {results.map((name, i) => (
              <li
                key={name}
                // mousedown (et non click) : sinon le champ perd le focus et la liste se ferme avant le clic
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(name);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex items-center gap-2 rounded-xl px-2 py-1.5 cursor-pointer text-sm ${i === highlight ? "bg-indigo-500/30 text-white" : "text-slate-200"}`}
              >
                <HeroPortrait name={name} src={DB[name]?.portrait} size={26} />
                <span className="flex-1 truncate">{name}</span>
                <RoleChip role={DB[name]?.role} />
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}

function StatusChip({ label, state }) {
  const cls =
    state === "ok"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/40"
      : state === "warn"
        ? "bg-rose-500/15 text-rose-200 border-rose-400/40"
        : "bg-amber-500/15 text-amber-200 border-amber-400/40";
  const icon = state === "ok" ? "✔" : state === "warn" ? "⚠" : "⋯";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] shadow-[0_6px_15px_rgba(8,8,20,0.45)] ${cls}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

function getCompositionStatus(allies, DB) {
  const c = teamRoleCounts(allies, DB);
  const defCount = c["Tank"];
  const offCount = c["Bruiser"];
  const healCount = c["Healer"];

  const defOk = defCount >= 1;
  const offOk = offCount >= 1;
  const healOk = healCount >= 1;

  const defTooMany = defCount > 1;
  const offTooMany = offCount > 1;
  const healTooMany = healCount > 1;

  const dpsSlot1Ok = c["Mage"] + c["Dps Mêléee"] >= 1;
  const dpsSlot2Ok = c["Range Auto"] + c["Dps Mêléee"] >= 1;
  const noDoubleMêlée = c["Dps Mêléee"] <= 1;

  return { defOk, offOk, healOk, defTooMany, offTooMany, healTooMany, dpsSlot1Ok, dpsSlot2Ok, noDoubleMêlée };
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

  // Nouveau calcul du % de chance de victoire
  const diff = alliesScore - enemiesScore;
  const magnitude = Math.abs(alliesScore) + Math.abs(enemiesScore);

  let winChance = 50;
  if (magnitude > 0.0001) {
    // diff / magnitude ∈ [-1 ; 1]
    const normalized = diff / magnitude;
    winChance = Math.round(50 + normalized * 50); // → [0 ; 100]
  }
  const progress = Math.min(Math.max(winChance, 0), 100);

  return (
    <div className={`${PANEL_CLASS} px-4 py-2.5 text-center`}>
      <div className="flex flex-wrap items-center justify-center gap-4 text-lg font-semibold">
        <div>
          Alliés :
          <span className="text-emerald-300 ml-1">{alliesScore.toFixed(1)}</span>
        </div>
        <div>
          Adversaires :
          <span className="text-rose-300 ml-1">{enemiesScore.toFixed(1)}</span>
        </div>
        <div>
          Win :
          <span className={`ml-1 ${winChance >= 50 ? "text-emerald-300" : "text-rose-300"}`}>
            {winChance}%
          </span>
        </div>
      </div>
      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full ${winChance >= 50
              ? "bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-300"
              : "bg-gradient-to-r from-rose-500 via-fuchsia-500 to-orange-400"
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Images des cartes : public/maps/<ID>.jpg (ID tel que défini dans maps.json),
// tirées des écrans de chargement du jeu (dépôt HeroesToolChest/heroes-images)
const MAP_IMAGE_BASE = "/maps";

// Vues de dessus des cartes : public/maps/layout/<ID>.jpg, tirées de nexuscompendium.com
const MAP_LAYOUT_BASE = "/maps/layout";

function mapImageUrl(mapName) {
  const m = maps.find((x) => x.name === mapName);
  return m ? `${MAP_IMAGE_BASE}/${m.id}.jpg` : null;
}

function mapLayoutUrl(mapName) {
  const m = maps.find((x) => x.name === mapName);
  return m ? `${MAP_LAYOUT_BASE}/${m.id}.jpg` : null;
}

// Prend toute la hauteur restante de la colonne (flex-1) : l'image est positionnée en absolu
// pour ne pas agrandir la colonne, qui reste ainsi alignée sur la hauteur de la colonne centrale.
function MapImagePanel({ title, src, alt, fit = "cover", enlargeable = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) return null;

  return (
    <div className={`${PANEL_CLASS} p-3 flex-1 flex flex-col min-h-[180px]`}>
      <div className="flex items-center justify-between mb-2 px-1">
        {typeof title === "string" ? <div className={SECTION_TITLE_CLASS}>{title}</div> : title}
        {enlargeable && (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-slate-400 hover:text-cyan-300 transition"
          >
            Agrandir ↗
          </a>
        )}
      </div>
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10">
        <img
          key={src}
          src={src}
          alt={alt}
          className={`map-bg-fade absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
          onError={() => setFailedSrc(src)}
        />
      </div>
    </div>
  );
}

function MapBackground({ map }) {
  const src = mapImageUrl(map);
  if (!src) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* key={src} : l'image est recréée à chaque changement de carte, ce qui relance le fondu */}
      <img
        key={src}
        src={src}
        alt=""
        className="map-bg-fade absolute inset-0 h-full w-full object-cover"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      {/* Voile sombre pour garder les panneaux lisibles par-dessus l'image */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#01030a]/55 via-[#030712]/45 to-[#050c1c]/65" />
    </div>
  );
}

// Popularité des héros (+1 par game où le héros est pick ou ban) et historique des games.
// La source de vérité est heroes.json + games.json, mis à jour par l'endpoint du serveur Vite (voir vite.config.js).
// Si l'endpoint est absent (site déployé statique), les games sont gardées dans le navigateur ("en attente")
// jusqu'à ce que les JSON exportés soient remis dans le dépôt : une game dont l'id figure déjà dans
// games.json n'est alors plus comptée en local, ce qui évite de la compter deux fois.
const POPULARITY_API = "/api/validate-game";

function filePopularity() {
  return Object.fromEntries(heroes.map((h) => [h.name, h.popularity || 0]));
}

function filePopularityTotal() {
  return heroes.reduce((acc, h) => acc + (h.popularity || 0), 0);
}

// Ancien stockage : de simples compteurs, sans historique de games. On les rattache à la version
// de heroes.json en cours ; dès que ce fichier change (export remis dans le dépôt), ils sont
// considérés comme intégrés et supprimés.
const LEGACY_POPULARITY_KEY = "hero-popularity-local";

function loadLegacyPopularity() {
  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_POPULARITY_KEY));
    if (!raw) return {};
    if (raw.counts === undefined) {
      localStorage.setItem(LEGACY_POPULARITY_KEY, JSON.stringify({ base: filePopularityTotal(), counts: raw }));
      return raw;
    }
    if (raw.base !== filePopularityTotal()) {
      localStorage.removeItem(LEGACY_POPULARITY_KEY);
      return {};
    }
    return raw.counts;
  } catch {
    return {};
  }
}

function gamesPopularity(games) {
  const counts = {};
  games.forEach((g) => {
    new Set([...g.allies.picks, ...g.allies.bans, ...g.enemies.picks, ...g.enemies.bans]).forEach((n) => {
      counts[n] = (counts[n] || 0) + 1;
    });
  });
  return counts;
}

// Popularité pas encore présente dans heroes.json (games en attente + anciens compteurs)
function localPopularity() {
  return mergePopularity(loadLegacyPopularity(), gamesPopularity(pendingLocalGames()));
}

function mergePopularity(base, local) {
  const merged = { ...base };
  Object.entries(local).forEach(([name, n]) => {
    merged[name] = (merged[name] || 0) + n;
  });
  return merged;
}

const LOCAL_GAMES_KEY = "game-history-local";

function loadLocalGames() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_GAMES_KEY)) || [];
  } catch {
    return [];
  }
}

// Games validées dans ce navigateur et pas encore dans games.json
function pendingLocalGames() {
  const fileIds = new Set(gamesFile.map((g) => g.id));
  return loadLocalGames().filter((g) => !fileIds.has(g.id));
}

function saveLocalGames(local) {
  try {
    localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(local));
  } catch {
    // stockage indisponible : la game ne sera pas conservée
  }
}

// Enregistre une game validée : popularité de ses héros + entrée dans l'historique.
// Renvoie { popularity, games } à jour.
async function recordGame(names, game) {
  try {
    const res = await fetch(POPULARITY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroes: names, game }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        popularity: mergePopularity(data.popularity, localPopularity()),
        games: [...data.games, ...pendingLocalGames()],
      };
    }
  } catch {
    // serveur injoignable : repli sur le stockage local
  }

  saveLocalGames([...pendingLocalGames(), game]);
  return {
    popularity: mergePopularity(filePopularity(), localPopularity()),
    games: [...gamesFile, ...pendingLocalGames()],
  };
}

function downloadJson(filename, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Télécharge heroes.json et games.json à jour (fichiers du dépôt + données de ce navigateur),
// prêts à remplacer ceux du dépôt.
function exportJsonFiles(popularity) {
  downloadJson("heroes.json", heroes.map((h) => ({ ...h, popularity: popularity[h.name] ?? h.popularity ?? 0 })));
  downloadJson("games.json", [...gamesFile, ...pendingLocalGames()]);
}

const TEAM_LABEL = { allies: "Alliés", enemies: "Adversaires" };

function formatGameDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function HistoryTeam({ label, team, won, DB }) {
  return (
    <div className={`flex-1 min-w-0 rounded-2xl border p-3 ${won ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${won ? "text-emerald-300" : "text-slate-300"}`}>{label}</span>
        {won && <span className="text-[10px] font-bold text-emerald-300">🏆 Victoire</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {team.picks.map((h) => (
          <HeroInfoHover key={h} name={h} DB={DB}>
            <HeroPortrait name={h} src={DB[h]?.portrait} size={38} />
          </HeroInfoHover>
        ))}
      </div>
      {team.bans.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 mr-1">Bans</span>
          {team.bans.map((h) => (
            <span key={h} className="opacity-60 grayscale" title={h}>
              <HeroPortrait name={h} src={DB[h]?.portrait} size={24} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryPage({ DB, games }) {
  const wins = games.filter((g) => g.winner === "allies").length;
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="w-full flex-1 p-3">
      <div className={`${PANEL_CLASS} p-4 max-w-5xl mx-auto`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className={SECTION_TITLE_CLASS}>Historique des games</div>
            <div className="text-[11px] text-slate-400 mt-1">Enregistré dans games.json à chaque game validée</div>
          </div>
          {games.length > 0 && (
            <div className="flex gap-4 text-sm font-semibold">
              <span>{games.length} game{games.length > 1 ? "s" : ""}</span>
              <span className="text-emerald-300">{wins} victoire{wins > 1 ? "s" : ""}</span>
              <span className="text-rose-300">{games.length - wins} défaite{games.length - wins > 1 ? "s" : ""}</span>
              <span>{Math.round((wins / games.length) * 100)}% win</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {sorted.map((g) => (
            <div key={g.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="font-semibold text-white">{g.map}</span>
                <span className="text-slate-400">{formatGameDate(g.date)}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <HistoryTeam label={TEAM_LABEL.allies} team={g.allies} won={g.winner === "allies"} DB={DB} />
                <HistoryTeam label={TEAM_LABEL.enemies} team={g.enemies} won={g.winner === "enemies"} DB={DB} />
              </div>
            </div>
          ))}
          {games.length === 0 && (
            <div className="text-xs text-slate-400 text-center py-6">Aucune game validée pour le moment</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Performance réelle des héros sur les games enregistrées (picks des deux équipes).
// Le win rate est "lissé" vers 50% (comme si chaque héros avait déjà PERF_PRIOR_GAMES games à 50%)
// pour qu'un petit échantillon chanceux (ex. 2 victoires sur 2) ne compte pas comme une vraie performance.
const PERF_PRIOR_GAMES = 30;
const PERF_MIN_GAMES = 20;
const PERF_GOOD = 0.55;
const PERF_BAD = 0.45;

function computeHeroStats(games) {
  const stats = {};
  games.forEach((g) => {
    ["allies", "enemies"].forEach((side) => {
      g[side].picks.forEach((h) => {
        const s = (stats[h] ??= { games: 0, wins: 0 });
        s.games++;
        if (g.winner === side) s.wins++;
      });
    });
  });
  Object.values(stats).forEach((s) => {
    s.smoothed = (s.wins + PERF_PRIOR_GAMES / 2) / (s.games + PERF_PRIOR_GAMES);
  });
  return stats;
}

// +1 si le héros gagne nettement plus souvent qu'il ne perd, −1 dans le cas inverse
function computePerformanceBonus(heroStats) {
  return Object.fromEntries(
    Object.entries(heroStats).map(([h, s]) => [
      h,
      s.games < PERF_MIN_GAMES ? 0 : s.smoothed >= PERF_GOOD ? 1 : s.smoothed <= PERF_BAD ? -1 : 0,
    ])
  );
}

function formatWinRate(s) {
  return `${Math.round((100 * s.wins) / s.games)}% sur ${s.games} game${s.games > 1 ? "s" : ""}`;
}

// Bonus de score : +1 dans le top 25% des héros les plus populaires, +0.5 dans le top 50%.
// Les ex æquo au seuil en profitent aussi ; un héros jamais pick/ban (0) n'a pas de bonus.
function computePopularityBonus(popularity) {
  const counts = HERO_LIST.map((h) => popularity[h] || 0).sort((a, b) => b - a);
  const top25 = counts[Math.ceil(counts.length * 0.25) - 1];
  const top50 = counts[Math.ceil(counts.length * 0.5) - 1];
  return Object.fromEntries(
    HERO_LIST.map((h) => {
      const n = popularity[h] || 0;
      return [h, n > 0 && n >= top25 ? 1 : n > 0 && n >= top50 ? 0.5 : 0];
    })
  );
}

// Classement de popularité (1 = le plus pick/ban). Les ex æquo partagent le même rang ;
// un héros jamais pick/ban n'est pas classé (Infinity).
function computePopularityRanks(popularity) {
  const counts = HERO_LIST.map((h) => popularity[h] || 0);
  return Object.fromEntries(
    HERO_LIST.map((h) => {
      const n = popularity[h] || 0;
      return [h, n > 0 ? 1 + counts.filter((c) => c > n).length : Infinity];
    })
  );
}

function PopularityPage({ DB, popularity, onExport }) {
  const pendingCount = pendingLocalGames().length;
  const [roleFilter, setRoleFilter] = useState(null);

  const ranking = HERO_LIST
    .filter((h) => !roleFilter || DB[h]?.role === roleFilter)
    .map((h) => ({ name: h, role: DB[h]?.role, count: popularity[h] || 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const max = Math.max(1, ...ranking.map((r) => r.count));

  return (
    <div className="w-full flex-1 p-3">
      <div className={`${PANEL_CLASS} p-4 max-w-4xl mx-auto`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className={SECTION_TITLE_CLASS}>Popularité des héros</div>
            <div className="text-[11px] text-slate-400 mt-1">+1 à chaque game validée où le héros est pick ou ban</div>
            <button
              onClick={onExport}
              title="Télécharge heroes.json et games.json à jour, à mettre à la place de ceux du dépôt GitHub"
              className="mt-1 text-[10px] text-slate-500 hover:text-slate-300 hover:underline transition"
            >
              ⬇ Télécharger les JSON{pendingCount > 0 ? ` (${pendingCount} game${pendingCount > 1 ? "s" : ""} en attente)` : ""}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setRoleFilter(null)}
              className={`px-2.5 py-0.5 text-[10px] rounded-full border transition ${!roleFilter ? "border-cyan-300/70 bg-cyan-500/25 text-white" : "border-white/15 text-slate-300 hover:bg-white/10"}`}
            >
              Tous
            </button>
            {ROLE_KEYS.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(roleFilter === r ? null : r)}
                className={`rounded-full transition ${roleFilter === r ? "ring-2 ring-cyan-300/70" : "opacity-70 hover:opacity-100"}`}
              >
                <RoleChip role={r} />
              </button>
            ))}
          </div>
        </div>
        <ol className="flex flex-col gap-1.5">
          {ranking.map((r, i) => (
            <li key={r.name} className="flex items-center gap-3 text-sm">
              <span className="w-7 text-right font-mono text-slate-400">{i + 1}</span>
              <HeroPortrait name={r.name} src={DB[r.name]?.portrait} size={34} />
              <HeroInfoHover name={r.name} DB={DB}>
                <span className="w-40 truncate inline-block">{r.name}</span>
              </HeroInfoHover>
              <span className="w-28 hidden sm:block">
                <RoleChip role={r.role} />
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono font-semibold">{r.count}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Stats : graphiques calculés sur l'historique des games

// Paire divergente (validée sur le fond sombre de l'app) : au-dessus de 50% = bon pour nous, en dessous = mauvais
const STAT_COLORS = { good: "#3987e5", bad: "#e66767" };
const STATS_MIN_GAMES = 20;
const OUR_PLAYERS = ["Skippy", "Lisou92"];

const STATS_PERIODS = [
  { key: "all", label: "Tout", months: null },
  { key: "12m", label: "12 mois", months: 12 },
  { key: "6m", label: "6 mois", months: 6 },
  { key: "3m", label: "3 mois", months: 3 },
];

function pct(x) {
  return `${Math.round(100 * x)}%`;
}

function filterStatsGames(games, player, period) {
  const months = STATS_PERIODS.find((p) => p.key === period)?.months;
  const since = months ? Date.now() - months * 30.44 * 24 * 3600 * 1000 : null;
  return games.filter(
    (g) =>
      (!since || new Date(g.date).getTime() >= since) &&
      (player === "all" || g.allies.players?.includes(player))
  );
}

// entries : [clé, gagné (bool)] → { clé: { games, wins, rate } }
function tally(entries) {
  const out = {};
  entries.forEach(([k, won]) => {
    const o = (out[k] ??= { games: 0, wins: 0 });
    o.games++;
    if (won) o.wins++;
  });
  Object.values(out).forEach((o) => (o.rate = o.wins / o.games));
  return out;
}

function computeStats(games, DB) {
  const won = (g) => g.winner === "allies";

  // Héros, toutes équipes confondues : un pick gagne si son équipe gagne
  const heroes = tally(
    games.flatMap((g) => ["allies", "enemies"].flatMap((side) => g[side].picks.map((h) => [h, g.winner === side])))
  );
  const ranked = Object.entries(heroes)
    .filter(([, s]) => s.games >= STATS_MIN_GAMES)
    .sort((a, b) => b[1].rate - a[1].rate || b[1].games - a[1].games);

  // Héros adverses : leur win rate contre nous, et combien de fois on les bannit
  const nemesisTally = tally(games.flatMap((g) => g.enemies.picks.map((h) => [h, !won(g)])));
  const ourBans = {};
  games.forEach((g) => g.allies.bans.forEach((h) => (ourBans[h] = (ourBans[h] || 0) + 1)));
  const nemesis = Object.entries(nemesisTally)
    .filter(([, s]) => s.games >= STATS_MIN_GAMES)
    .sort((a, b) => b[1].rate - a[1].rate)
    .slice(0, 10)
    .map(([h, s]) => ({ ...s, hero: h, bans: ourBans[h] || 0 }));

  const maps = Object.entries(tally(games.map((g) => [g.map, won(g)]))).sort((a, b) => b[1].rate - a[1].rate);

  // Héros joués par chacun de nous (games importées des replays : on sait qui jouait quoi)
  const perPlayer = Object.fromEntries(
    OUR_PLAYERS.map((p) => {
      const t = tally(
        games
          .filter((g) => g.allies.players?.includes(p))
          .map((g) => [g.allies.picks[g.allies.players.indexOf(p)], won(g)])
      );
      return [p, Object.entries(t).sort((a, b) => b[1].games - a[1].games).slice(0, 10)];
    })
  );

  const roles = Object.entries(
    tally(games.flatMap((g) => ["allies", "enemies"].flatMap((side) => g[side].picks.map((h) => [DB[h]?.role || "?", g.winner === side]))))
  ).sort((a, b) => b[1].rate - a[1].rate);

  const comps = Object.entries(
    tally(
      games.map((g) => {
        const r = g.allies.picks.map((h) => DB[h]?.role);
        const n = (role) => r.filter((x) => x === role).length;
        return [`${n("Tank")} tank · ${n("Healer")} healer`, won(g)];
      })
    )
  ).sort((a, b) => b[1].games - a[1].games);

  const duo = tally(
    games.filter((g) => OUR_PLAYERS.every((p) => g.allies.players?.includes(p))).map((g) => ["duo", won(g)])
  ).duo;

  // Win rate glissant sur 50 games, dans l'ordre chronologique
  const chrono = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const WINDOW = 50;
  const rolling = [];
  let wins = 0;
  chrono.forEach((g, i) => {
    if (won(g)) wins++;
    if (i >= WINDOW && won(chrono[i - WINDOW])) wins--;
    if (i >= WINDOW - 1) rolling.push({ date: g.date, rate: wins / WINDOW, index: i + 1 });
  });

  const quarters = Object.entries(
    tally(chrono.map((g) => [`${g.date.slice(0, 4)} T${Math.ceil(Number(g.date.slice(5, 7)) / 3)}`, won(g)]))
  );

  return {
    total: games.length,
    wins: games.filter(won).length,
    top: ranked.slice(0, 10),
    flop: ranked.slice(-10).reverse(),
    nemesis,
    maps,
    perPlayer,
    roles,
    comps,
    duo,
    rolling,
    quarters,
  };
}

function StatPanel({ title, subtitle, children, className = "" }) {
  return (
    <div className={`${PANEL_CLASS} p-4 ${className}`}>
      <div className={SECTION_TITLE_CLASS}>{title}</div>
      {subtitle && <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatTile({ label, value, detail }) {
  return (
    <div className={`${PANEL_CLASS} px-4 py-3`}>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-2xl font-semibold text-white mt-1 truncate">{value}</div>
      {detail && <div className="text-[11px] text-slate-400 mt-0.5">{detail}</div>}
    </div>
  );
}

// Barres divergentes autour de 50% : à droite (bleu) au-dessus, à gauche (rouge) en dessous.
// Chaque ligne affiche sa valeur et son nombre de games : la barre n'est qu'un repère visuel.
function WinRateBars({ rows, DB, extra }) {
  const span = Math.max(0.15, ...rows.map((r) => Math.abs(r.rate - 0.5)));
  const grid = "grid grid-cols-[minmax(0,9rem)_1fr_5rem] items-center gap-2";
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => {
        const dev = r.rate - 0.5;
        return (
          <div
            key={r.key}
            className={`${grid} rounded-lg px-1 py-0.5 hover:bg-white/5`}
            title={`${r.label} : ${r.wins} victoires sur ${r.games} games (${pct(r.rate)})`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {DB && <HeroPortrait name={r.label} src={DB[r.label]?.portrait} size={22} />}
              <span className="truncate text-xs text-slate-200">{r.label}</span>
            </div>
            <div className="relative h-3">
              <div className="absolute -inset-y-1 left-1/2 w-px bg-white/20" />
              <div
                className={`absolute top-0 h-3 ${dev >= 0 ? "left-1/2 rounded-r" : "right-1/2 rounded-l"}`}
                style={{ width: `${(Math.abs(dev) / span) * 50}%`, background: dev >= 0 ? STAT_COLORS.good : STAT_COLORS.bad }}
              />
            </div>
            <div className="text-right text-xs tabular-nums">
              <span className="font-semibold text-white">{pct(r.rate)}</span>
              <span className="text-slate-500"> · {r.games}g</span>
              {extra && <div className="text-[10px] text-slate-400">{extra(r)}</div>}
            </div>
          </div>
        );
      })}
      {rows.length === 0 && <div className="text-xs text-slate-400">Pas assez de games</div>}
      {rows.length > 0 && (
        <div className={`${grid} px-1 text-[10px] text-slate-500`}>
          <span />
          <span className="text-center">50%</span>
          <span />
        </div>
      )}
    </div>
  );
}

const toBarRows = (entries) => entries.map(([k, s]) => ({ key: k, label: k, ...s }));

// Courbe du win rate glissant, avec repère à 50% et lecture au survol
function RollingWinRateChart({ points }) {
  const [hover, setHover] = useState(null);
  // Le graphique est dessiné à la largeur réelle du conteneur : les textes gardent leur taille
  const wrapRef = useRef(null);
  const [W, setW] = useState(640);
  const hasData = points.length >= 2;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(320, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasData]);
  if (!hasData) return <div className="text-xs text-slate-400">Pas assez de games (il en faut au moins 50)</div>;

  const H = 220, PAD = { l: 36, r: 44, t: 12, b: 24 };
  const values = points.map((p) => p.rate);
  const yMin = Math.min(0.3, Math.floor(Math.min(...values) * 10) / 10);
  const yMax = Math.max(0.7, Math.ceil(Math.max(...values) * 10) / 10);
  const x = (i) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`).join(" ");
  const ticks = [];
  for (let v = yMin; v <= yMax + 1e-9; v += 0.1) ticks.push(Math.round(v * 10) / 10);
  const years = [];
  points.forEach((p, i) => {
    const yr = p.date.slice(0, 4);
    if (i === 0 || yr !== points[i - 1].date.slice(0, 4)) years.push({ i, yr });
  });
  // Une année trop proche de la suivante (ex. 2 games en 2022) n'est pas affichée, pour éviter le chevauchement
  const yearLabels = years.filter((yv, k) => k === years.length - 1 || x(years[k + 1].i) - x(yv.i) >= 40);
  const last = points[points.length - 1];
  const hp = hover != null ? points[hover] : null;

  return (
    <div className="relative" ref={wrapRef}>
      <svg
        width={W}
        height={H}
        className="block"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)}
              stroke={v === 0.5 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)"}
              strokeWidth="1"
            />
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{pct(v)}</text>
          </g>
        ))}
        {yearLabels.map(({ i, yr }) => (
          <text key={yr} x={x(i)} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor={i === 0 ? "start" : "middle"}>{yr}</text>
        ))}
        <path d={path} fill="none" stroke={STAT_COLORS.good} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.rate)} r="4" fill={STAT_COLORS.good} stroke="#0f1833" strokeWidth="2" />
        <text x={x(points.length - 1) + 8} y={y(last.rate) + 4} textAnchor="start" fontSize="11" fontWeight="600" fill="#ffffff">{pct(last.rate)}</text>
        {hp && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(hp.rate)} r="4" fill={STAT_COLORS.good} stroke="#0f1833" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <div
          className="pointer-events-none absolute top-0 rounded-xl border border-indigo-700/40 bg-[#05070f] px-3 py-2 text-xs shadow-2xl whitespace-nowrap"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: hover > points.length / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
          }}
        >
          <div className="font-semibold text-white">{pct(hp.rate)}</div>
          <div className="text-slate-400">sur les 50 games jusqu&apos;au {new Date(hp.date).toLocaleDateString("fr-FR")}</div>
          <div className="text-slate-500">game n°{hp.index}</div>
        </div>
      )}
    </div>
  );
}

function StatsTable({ head, rows }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-slate-400">
          {head.map((h, i) => (
            <th key={h} className={`pb-1 font-normal ${i ? "text-right" : "text-left"}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map((r) => (
          <tr key={r[0]} className="border-t border-white/5">
            {r.map((c, i) => (
              <td key={i} className={`py-1 ${i ? "text-right text-slate-300" : "text-slate-200"}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatsPage({ DB, games }) {
  const [player, setPlayer] = useState("all");
  const [period, setPeriod] = useState("all");
  const filtered = useMemo(() => filterStatsGames(games, player, period), [games, player, period]);
  const s = useMemo(() => computeStats(filtered, DB), [filtered, DB]);

  const chip = (active) =>
    `rounded-xl px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-indigo-500/40 text-white" : "text-slate-300 hover:bg-white/10"}`;
  const heroRows = (entries) => entries.map(([h, st]) => ({ key: h, label: h, ...st }));

  return (
    <div className="w-full flex-1 p-3">
      <div className="max-w-6xl mx-auto flex flex-col gap-3">
        {/* Filtres : ils s'appliquent à tous les graphiques de la page */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-2xl border border-white/15 bg-white/5 p-1">
            {STATS_PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} className={chip(period === p.key)}>{p.label}</button>
            ))}
          </div>
          <div className="flex rounded-2xl border border-white/15 bg-white/5 p-1">
            {["all", ...OUR_PLAYERS].map((p) => (
              <button key={p} onClick={() => setPlayer(p)} className={chip(player === p)}>{p === "all" ? "Tous" : p}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Games" value={s.total} />
          <StatTile
            label="Win rate"
            value={s.total ? pct(s.wins / s.total) : "—"}
            detail={`${s.wins} victoires · ${s.total - s.wins} défaites`}
          />
          <StatTile
            label="Skippy + Lisou92 ensemble"
            value={s.duo ? pct(s.duo.rate) : "—"}
            detail={s.duo ? `sur ${s.duo.games} games` : ""}
          />
          <StatTile
            label="Meilleure map"
            value={s.maps[0]?.[0] || "—"}
            detail={s.maps[0] ? `${pct(s.maps[0][1].rate)} sur ${s.maps[0][1].games} games` : ""}
          />
        </div>

        {s.total === 0 ? (
          <div className={`${PANEL_CLASS} p-6 text-center text-sm text-slate-400`}>Aucune game pour ces filtres</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <StatPanel title="Top 10 · meilleurs win rates" subtitle={`Picks des deux équipes, minimum ${STATS_MIN_GAMES} games`}>
                <WinRateBars rows={heroRows(s.top)} DB={DB} />
              </StatPanel>
              <StatPanel title="Flop 10 · pires win rates" subtitle={`Picks des deux équipes, minimum ${STATS_MIN_GAMES} games`}>
                <WinRateBars rows={heroRows(s.flop)} DB={DB} />
              </StatPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <StatPanel title="Win rate par map" subtitle="Notre win rate sur chaque map">
                <WinRateBars rows={toBarRows(s.maps)} />
              </StatPanel>
              <StatPanel
                title="Némésis"
                subtitle={`Héros adverses qui nous battent le plus (leur win rate contre nous, minimum ${STATS_MIN_GAMES} games)`}
              >
                <WinRateBars
                  rows={s.nemesis.map((n) => ({ key: n.hero, label: n.hero, ...n }))}
                  DB={DB}
                  extra={(r) => (r.bans ? `banni ${r.bans}×` : "jamais banni")}
                />
              </StatPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {OUR_PLAYERS.map((p) => (
                <StatPanel key={p} title={`Héros de ${p}`} subtitle="Les 10 plus joués, avec leur win rate">
                  <WinRateBars rows={toBarRows(s.perPlayer[p])} DB={DB} />
                </StatPanel>
              ))}
            </div>

            <StatPanel title="Évolution du win rate" subtitle="Moyenne glissante sur 50 games">
              <RollingWinRateChart points={s.rolling} />
              <details className="mt-2 text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-200">Voir par trimestre</summary>
                <div className="mt-2 max-w-md">
                  <StatsTable head={["Trimestre", "Games", "Win rate"]} rows={s.quarters.map(([q, st]) => [q, st.games, pct(st.rate)])} />
                </div>
              </details>
            </StatPanel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <StatPanel title="Rôles" subtitle="Win rate de chaque rôle, picks des deux équipes">
                <StatsTable head={["Rôle", "Picks", "Win rate"]} rows={s.roles.map(([r, st]) => [r, st.games, pct(st.rate)])} />
              </StatPanel>
              <StatPanel title="Compositions" subtitle="Notre équipe : nombre de tanks et de healers">
                <StatsTable head={["Compo", "Games", "Win rate"]} rows={s.comps.map(([c, st]) => [c, st.games, pct(st.rate)])} />
              </StatPanel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DraftAssistant() {
  const [view, setView] = useState("draft");
  const [map, setMap] = useState(DEFAULT_MAP);
  const [allies, setAllies] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [bansAllies, setBansAllies] = useState([]);
  const [bansEnemies, setBansEnemies] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [popularity, setPopularity] = useState(() => mergePopularity(filePopularity(), localPopularity()));
  const [lastValidatedDraft, setLastValidatedDraft] = useState(null);
  const [games, setGames] = useState(() => [...gamesFile, ...pendingLocalGames()]);
  const heroStats = useMemo(() => computeHeroStats(games), [games]);
  const performanceBonus = useMemo(() => computePerformanceBonus(heroStats), [heroStats]);
  const DB = useMemo(() => buildHeroDB(heroStats), [heroStats]);
  const [askWinner, setAskWinner] = useState(false);

  const popularityBonus = useMemo(() => computePopularityBonus(popularity), [popularity]);
  const popularityRanks = useMemo(() => computePopularityRanks(popularity), [popularity]);
  const state = { map, allies, enemies, bansAllies, bansEnemies, popularityBonus, performanceBonus, heroStats };

  const takenHeroes = [...allies, ...enemies, ...bansAllies, ...bansEnemies];
  const gameHeroes = [...new Set(takenHeroes)];
  // Empêche de compter deux fois la même draft (double clic, re-validation)
  const draftKey = JSON.stringify([allies, enemies, bansAllies, bansEnemies]);
  const draftComplete = allies.length + enemies.length === 10;
  const gameValidated = draftKey === lastValidatedDraft;
  const canValidate = draftComplete && !gameValidated;

  async function validateGame(winner) {
    setAskWinner(false);
    if (!canValidate) return;
    setLastValidatedDraft(draftKey);
    const game = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      map,
      mapId: maps.find((m) => m.name === map)?.id ?? null,
      winner,
      allies: { picks: allies, bans: bansAllies },
      enemies: { picks: enemies, bans: bansEnemies },
    };
    const result = await recordGame(gameHeroes, game);
    setPopularity(result.popularity);
    setGames(result.games);
  }

  function addTo(setter, list, name, limit) {
    if (!HERO_LIST.includes(name)) return;
    if (list.includes(name)) return;
    const allPicked = [...allies, ...enemies, ...bansAllies, ...bansEnemies];
    if (allPicked.includes(name)) return;
    const partner = HERO_PAIRS[name];
    if (partner && allPicked.includes(partner)) return;
    const toAdd = partner ? [name, partner] : [name];
    if (limit && list.length + toAdd.length > limit) return;
    setter([...list, ...toAdd]);
  }

  function removeFrom(setter, list, idx) {
    const name = list[idx];
    const partner = HERO_PAIRS[name];
    let copy = [...list];
    copy.splice(idx, 1);
    if (partner) {
      const pi = copy.indexOf(partner);
      if (pi !== -1) copy.splice(pi, 1);
    }
    setter(copy);
  }

  function resetAll() {
    setAllies([]);
    setEnemies([]);
    setBansAllies([]);
    setBansEnemies([]);
    setMap(DEFAULT_MAP);
  }

  function swapTeams() {
    setAllies(enemies);
    setEnemies(allies);
    setBansAllies(bansEnemies);
    setBansEnemies(bansAllies);
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
      .slice(0, 88);
  }, [map, allies, enemies, bansAllies, bansEnemies, popularityBonus, performanceBonus, heroStats, DB]);

  const enemyPotential = useMemo(() => {
    const mirrorState = {
      map,
      allies: enemies,
      enemies: allies,
      bansAllies: bansEnemies,
      bansEnemies: bansAllies,
      popularityBonus,
      performanceBonus,
      heroStats,
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
      .slice(0, 24);
  }, [map, allies, enemies, bansAllies, bansEnemies, popularityBonus, performanceBonus, heroStats, DB]);

  const comp = getCompositionStatus(allies, DB);

  return (
    <div className="min-h-screen w-full text-slate-100 app-gradient-bg">
      <MapBackground map={map} />
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="sticky top-0 z-30 bg-[#030712]/55 backdrop-blur-2xl">
          <div className="w-full flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-4">
              <div>
                <div className={SECTION_TITLE_CLASS}>Heroes of the Storm</div>
                <div className="text-xl font-semibold text-white mt-1">Draft Assistant</div>
              </div>
              <nav className="flex rounded-2xl border border-white/15 bg-white/5 p-1 text-sm">
                {[["draft", "Draft"], ["popularity", "Popularité"], ["history", "Historique"], ["stats", "Stats"]].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={`rounded-xl px-3 py-1.5 font-semibold transition ${view === key ? "bg-indigo-500/40 text-white" : "text-slate-300 hover:bg-white/10"}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
            {view === "draft" && (
            <>
            <div className="flex-1 text-sm text-center flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1">
              <span className="text-[12px] uppercase tracking-[0.4em] text-slate-300">Map</span>
              <select
                className="ml-0 sm:ml-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
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
                onClick={() => setAskWinner(true)}
                disabled={!canValidate}
                title={
                  gameValidated
                    ? "Cette game a déjà été comptée"
                    : draftComplete
                      ? "Enregistre la game dans l'historique et ajoute +1 de popularité à chaque héros pick ou ban"
                      : "Les 10 héros doivent être pick pour valider la game"
                }
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${gameValidated
                  ? "border-emerald-300/70 bg-emerald-500/40 text-emerald-50 cursor-default"
                  : "border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/35 disabled:opacity-40 disabled:hover:bg-emerald-500/20"
                  }`}
              >
                {gameValidated ? "✔ Game validée" : "✔ Valider la game"}
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className="rounded-2xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold hover:bg-indigo-500/40 transition"
              >
                Algo
              </button>
              <button
                onClick={swapTeams}
                title="Échanger les héros (picks et bans) entre les deux équipes"
                className="rounded-2xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold hover:bg-cyan-500/35 transition"
              >
                ⇄ Échanger
              </button>
              <button
                onClick={resetAll}
                className="rounded-2xl border border-rose-400/30 bg-rose-500/20 px-4 py-2 text-sm font-semibold hover:bg-rose-500/35 transition"
              >
                Reset
              </button>
            </div>
            </>
            )}
          </div>
          {view === "draft" && (
            <div className="w-full px-3 pb-2.5">
              <GlobalScores DB={DB} state={state} />
            </div>
          )}
        </div>

        {view === "popularity" && <PopularityPage DB={DB} popularity={popularity} onExport={() => exportJsonFiles(popularity)} />}
        {view === "history" && <HistoryPage DB={DB} games={games} />}
        {view === "stats" && <StatsPage DB={DB} games={games} />}

        {askWinner && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setAskWinner(false)}
            />
            <div className="relative z-50 w-[380px] max-w-[92vw] rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-[#050917]/95 via-[#0b1130]/90 to-[#050917]/95 p-6 text-center shadow-[0_25px_80px_rgba(3,3,16,0.9)]">
              <div className="text-xl font-semibold text-white mb-1">Qui a gagné ?</div>
              <div className="text-xs text-slate-400 mb-5">{map}</div>
              <div className="flex gap-3">
                <button
                  onClick={() => validateGame("allies")}
                  className="flex-1 rounded-2xl border border-emerald-400/50 bg-emerald-500/25 px-4 py-3 font-semibold hover:bg-emerald-500/45 transition"
                >
                  Alliés
                </button>
                <button
                  onClick={() => validateGame("enemies")}
                  className="flex-1 rounded-2xl border border-rose-400/50 bg-rose-500/25 px-4 py-3 font-semibold hover:bg-rose-500/45 transition"
                >
                  Adversaires
                </button>
              </div>
              <button
                onClick={() => setAskWinner(false)}
                className="mt-4 text-xs text-slate-400 hover:text-white transition"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {showHelp && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowHelp(false)}
            />
            <div className="relative z-50 w-[680px] max-w-[92vw] rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-[#050917]/95 via-[#0b1130]/90 to-[#050917]/95 p-6 shadow-[0_25px_80px_rgba(3,3,16,0.9)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xl font-semibold tracking-tight text-white">Calcul des scores</div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-sm rounded-2xl px-3 py-1.5 bg-white/10 border border-white/20 hover:bg-white/20 transition"
                >
                  Fermer
                </button>
              </div>
              <div className="text-sm leading-relaxed space-y-2 text-slate-200">
                <p className="text-slate-300">Chaque héros démarre à 10, puis :</p>
                <ul className="list-disc ml-5 space-y-1 text-left text-slate-100">
                  <li>Tier : S = +1, A = +0.5, B = 0, C = −0.5, D = −1</li>
                  <li>Popularité : top 25% = +1, top 50% = +0.5</li>
                  <li>Performance sur les games enregistrées : win rate ≥ 55% = +1, ≤ 45% = −1 (lissé vers 50%, minimum {PERF_MIN_GAMES} games)</li>
                  <li>Rôle déjà présent : {WEIGHTS.roleDuplicate}</li>
                  <li>Deuxième DPS mêlée : {WEIGHTS.secondMelee}</li>
                  <li>Carte : favorable +{WEIGHTS.mapFavorable}, défavorable {WEIGHTS.mapUnfavorable}</li>
                  <li>Contre un ennemi : +{WEIGHTS.counters} par cible</li>
                  <li>Se fait contrer par un ennemi : {WEIGHTS.countered} par héros</li>
                  <li>Un allié contre ceux qui nous contrent : +{WEIGHTS.protectsFromCounter}</li>
                  <li>Synergies alliées : +{WEIGHTS.synergy} par allié synergique</li>
                  <li>Bloque une synergie ennemie : +{WEIGHTS.blocksEnemySynergy}</li>
                </ul>
                <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-emerald-300">54,1 %</div>
                  <div className="text-xs text-slate-300 mt-1">
                    de bonnes prédictions du vainqueur, testé sur 815 games de Ligue Storm
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "draft" && (
        <div className="w-full flex-1 grid grid-cols-12 gap-3 p-3">
          <aside className="col-span-12 md:col-span-3 flex flex-col gap-3">
            <ListBox
              title="Ban allié"
              items={bansAllies}
              onRemove={(i) => removeFrom(setBansAllies, bansAllies, i)}
              compact
              DB={DB}
              state={state}
              side="allies"
              tall
              onDrop={(name) => addTo(setBansAllies, bansAllies, name, 3)}
            >
              <AddHeroInput
                DB={DB}
                exclude={takenHeroes}
                placeholder="Ajouter un ban…"
                onAdd={(v) => addTo(setBansAllies, bansAllies, v, 3)}
                disabled={bansAllies.length >= 3}
              />
            </ListBox>
            <ListBox
              title="Picks alliés"
              items={allies}
              onRemove={(i) => removeFrom(setAllies, allies, i)}
              compact
              DB={DB}
              state={state}
              side="allies"
              onDrop={(name) => addTo(setAllies, allies, name, 5)}
            >
              <AddHeroInput
                DB={DB}
                exclude={takenHeroes}
                placeholder="Ajouter un pick…"
                onAdd={(v) => addTo(setAllies, allies, v, 5)}
                disabled={allies.length >= 5}
              />
            </ListBox>
            <MapImagePanel
              title={
                MAP_LANES[map] ? (
                  <div className="text-[13px] uppercase tracking-[0.4em] font-bold text-white">
                    Map à <span className="text-cyan-300">{MAP_LANES[map]}</span> lanes
                  </div>
                ) : (
                  "Structure de la map"
                )
              }
              src={mapLayoutUrl(map)}
              alt={`Vue de dessus : ${map}`}
              fit="contain"
              enlargeable
            />
          </aside>

          {/* Centre */}
          <main className="col-span-12 md:col-span-6 flex flex-col gap-4">
            <div className={`${PANEL_CLASS} p-4 text-xs`}>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusChip
                  label="Tank"
                  state={!comp.defOk ? "need" : comp.defTooMany ? "warn" : "ok"}
                />
                <StatusChip
                  label="Bruiser"
                  state={!comp.offOk ? "need" : comp.offTooMany ? "warn" : "ok"}
                />
                <StatusChip
                  label="Healer"
                  state={!comp.healOk ? "need" : comp.healTooMany ? "warn" : "ok"}
                />
                <StatusChip
                  label="Mage ou DPS mêlée"
                  state={!comp.dpsSlot1Ok ? "need" : !comp.noDoubleMêlée ? "warn" : "ok"}
                />
                <StatusChip
                  label="Dps AA ou Mêlée"
                  state={!comp.dpsSlot2Ok ? "need" : !comp.noDoubleMêlée ? "warn" : "ok"}
                />
              </div>
            </div>

            {/* Les listes de reco prennent toute la hauteur dispo (flex) et défilent au-delà.
                Le contenu est en absolu pour ne pas agrandir la ligne de la grille. */}
            <div className={`${PANEL_CLASS} p-4 flex-[3] flex flex-col`}>
              <div className="flex items-center justify-between mb-3">
                <div className={SECTION_TITLE_CLASS}>Reco allié à pick</div>
                <span className="text-[11px] text-slate-400">Top {allyReco.length}</span>
              </div>
              <div className="relative flex-1 min-h-[330px]">
              <div className="absolute inset-0 overflow-y-auto no-scrollbar reco-scroll pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {allyReco.map((r) => (
                    <HeroCard
                      key={r.name}
                      name={r.name}
                      role={r.role}
                      score={r.score}
                      breakdown={explainScore(r.name, DB, state, { sideForRole: "allies" })}
                      DB={DB}
                      popularityRank={popularityRanks[r.name]}
                    />
                  ))}
                  {allyReco.length === 0 && (
                    <div className="col-span-full text-xs opacity-60">Aucun héros disponible</div>
                  )}
                </div>
              </div>
              </div>
            </div>

            <div className={`${PANEL_CLASS} p-4 flex-[2] flex flex-col`}>
              <div className="flex items-center justify-between mb-3">
                <div className={SECTION_TITLE_CLASS}>
                  Reco à ban (meilleurs picks potentiels pour l'adversaire)
                </div>
              </div>
              <div className="relative flex-1 min-h-[160px]">
              <div className="absolute inset-0 overflow-y-auto no-scrollbar reco-scroll pr-1">
              <div className="grid grid-cols-4 gap-2.5">
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
                        popularityBonus,
                        performanceBonus,
                        heroStats,
                      },
                      { sideForRole: "allies" }
                    )}
                    DB={DB}
                    popularityRank={popularityRanks[r.name]}
                  />
                ))}
                {enemyPotential.length === 0 && (
                  <div className="col-span-4 text-xs opacity-60">
                    Aucun héros à ban suggéré
                  </div>
                )}
              </div>
              </div>
              </div>
            </div>
          </main>

          {/* Colonne droite */}
          <aside className="col-span-12 md:col-span-3 flex flex-col gap-3">
            <ListBox
              title="Ban adversaire"
              items={bansEnemies}
              onRemove={(i) => removeFrom(setBansEnemies, bansEnemies, i)}
              compact
              DB={DB}
              state={state}
              side="enemies"
              tall
              onDrop={(name) => addTo(setBansEnemies, bansEnemies, name, 3)}
            >
              <AddHeroInput
                DB={DB}
                exclude={takenHeroes}
                placeholder="Ajouter un ban adverse…"
                onAdd={(v) => addTo(setBansEnemies, bansEnemies, v, 3)}
                disabled={bansEnemies.length >= 3}
              />
            </ListBox>
            <ListBox
              title="Picks adverses"
              items={enemies}
              onRemove={(i) => removeFrom(setEnemies, enemies, i)}
              compact
              DB={DB}
              state={state}
              side="enemies"
              onDrop={(name) => addTo(setEnemies, enemies, name, 5)}
            >
              <AddHeroInput
                DB={DB}
                exclude={takenHeroes}
                placeholder="Ajouter un pick adverse…"
                onAdd={(v) => addTo(setEnemies, enemies, v, 5)}
                disabled={enemies.length >= 5}
              />
            </ListBox>
            <MapImagePanel title={map} src={mapImageUrl(map)} alt={map} />
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}
