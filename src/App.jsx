import { useState, useMemo, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import './App.css'
import maps from '../maps.json';
import heroes from '../heroes.json';

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

function buildHeroDB() {
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

function computeScoreFor(hero, DB, state, opts = {}) {
  const { ignoreLocks = false, selfNeutralizeRole = false, sideForRole = "allies" } = opts;
  const H = DB[hero];
  if (!H) return -999;

  const picked = [...state.allies, ...state.enemies];
  const banned = [...state.bansAllies, ...state.bansEnemies];

  // On évite les héros déjà pick ou bannis (sauf si ignoreLocks)
  if (!ignoreLocks) {
    if (picked.includes(hero) || banned.includes(hero)) return -999;
  }

  // Base
  let score = 10;
  score += TIER_BONUS[H.tier] ?? 0;
  score += state.popularityBonus?.[hero] ?? 0;

  // Côté de référence
  const teamList = sideForRole === "enemies" ? state.enemies : state.allies;
  const oppList = sideForRole === "enemies" ? state.allies : state.enemies;

  const listForCount = selfNeutralizeRole
    ? teamList.filter((n) => n !== hero)
    : teamList;

  // --- RÔLES ---
  const counts = teamRoleCounts(listForCount, DB);
  const currentCount = counts[H.role] || 0;

  // Rôle déjà présent dans l’équipe → -2 (règle simple)
  if (currentCount >= 1) {
    score -= 2;
  }

  // Deuxième DPS mêlée → -2
  if (H.role === "Dps Mêléee" && MêléeCount(listForCount, DB) >= 1) {
    score -= 2;
  }

  // --- CARTES ---
  if (state.map && H.favMaps && H.favMaps.includes(state.map)) {
    score += 1;
  }

  if (state.map && H.badMaps && H.badMaps.includes(state.map)) {
    score -= 1;
  }

  // --- SYNERGIES ALLIÉES ---
  const heroSynergies = H.synergies || [];
  heroSynergies.forEach((ally) => {
    if (teamList.includes(ally)) {
      score += 1;
    }
  });

  // --- CONTRE LES ENNEMIS (les ennemis ont un counter sur nous) ---
  oppList.forEach((enemy) => {
    const oppCounters = DB[enemy]?.counters || [];
    if (oppCounters.includes(hero)) {
      score += 1.5;
    }
  });

  // --- NOUS SOMMES CONTRÉS PAR CERTAINS HÉROS ---
  const counterByList = DB[hero]?.counters || [];

  // Héros ennemis qui nous contrent
  oppList.forEach((enemy) => {
    if (counterByList.includes(enemy)) {
      score -= 1;
    }
  });

  // Héros alliés qui contrent nos counters
  teamList.forEach((ally) => {
    if (counterByList.includes(ally)) {
      score += 0.5;
    }
  });

  // --- BLOQUER LES SYNERGIES ADVERSES ---
  oppList.forEach((enemy) => {
    const syn = DB[enemy]?.synergies || [];
    if (syn.includes(hero)) {
      score += 0.5;
    }
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

  // Base
  rows.push({ label: "Base", delta: 10 });

  // Tier
  const tier = TIER_BONUS[H.tier] ?? 0;
  if (tier) {
    rows.push({ label: `Tier ${H.tier}`, delta: tier });
  }

  // Popularité
  const pop = state.popularityBonus?.[hero] ?? 0;
  if (pop) {
    rows.push({ label: pop >= 1 ? "Top 25% popularité" : "Top 50% popularité", delta: pop });
  }

  // Côté de référence
  const teamList = sideForRole === "enemies" ? state.enemies : state.allies;
  const oppList = sideForRole === "enemies" ? state.allies : state.enemies;

  const listForCount = selfNeutralizeRole
    ? teamList.filter((n) => n !== hero)
    : teamList;

  // --- RÔLES ---
  const counts = teamRoleCounts(listForCount, DB);
  const currentCount = counts[H.role] || 0;

  if (currentCount >= 1) {
    rows.push({
      label: `Rôle déjà présent (${H.role})`,
      delta: -2,
    });
  }

  if (H.role === "Dps Mêléee" && MêléeCount(listForCount, DB) >= 1) {
    rows.push({
      label: "Deuxième Mêlée (éviter 2× Mêlée)",
      delta: -2,
    });
  }

  // --- CARTES ---
  if (state.map && H.favMaps && H.favMaps.includes(state.map)) {
    rows.push({
      label: `Carte favorable `,
      delta: +1,
    });
  }

  if (state.map && H.badMaps && H.badMaps.includes(state.map)) {
    rows.push({
      label: `Carte défavorable (${state.map})`,
      delta: -1,
    });
  }

  // --- SYNERGIES ALLIÉES ---
  (H.synergies || []).forEach((ally) => {
    if (teamList.includes(ally)) {
      rows.push({
        label: `Synergie avec ${ally}`,
        delta: +1,
      });
    }
  });

  // --- CONTRE LES ENNEMIS (les ennemis ont un counter sur nous) ---
  oppList.forEach((enemy) => {
    const oppCounters = DB[enemy]?.counters || [];
    if (oppCounters.includes(hero)) {
      rows.push({
        label: `Contre ${enemy}`,
        delta: +1.5,
      });
    }
  });

  // --- NOUS SOMMES CONTRÉS PAR CERTAINS HÉROS ---
  const counterByList = DB[hero]?.counters || [];

  oppList.forEach((enemy) => {
    if (counterByList.includes(enemy)) {
      rows.push({
        label: `Se fait contrer par ${enemy}`,
        delta: -1,
      });
    }
  });

  teamList.forEach((ally) => {
    if (counterByList.includes(ally)) {
      rows.push({
        label: `Empeche de se faire contrer par ${ally}`,
        delta: +0.5,
      });
    }
  });

  // --- BLOQUE LES SYNERGIES ADVERSES ---
  oppList.forEach((enemy) => {
    const syn = DB[enemy]?.synergies || [];
    if (syn.includes(hero)) {
      rows.push({
        label: `Bloque synergie adverse avec ${enemy}`,
        delta: +0.5,
      });
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
              <span className="opacity-80 text-slate-100">{row.label}</span>
              <span className="font-mono text-slate-100">
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

function HeroCard({ name, role, score, breakdown, DB, popular = false }) {
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
          <div className="relative">
            <HeroPortrait name={name} src={DB[name]?.portrait} size={52} score={score} />
            {popular && (
              <span
                title="Top 25% des héros les plus pick/ban"
                className="absolute -top-1.5 -left-1.5 z-10 rounded-full border border-red-300/70 bg-red-600 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              >
                Top
              </span>
            )}
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

function AddHeroInput({ placeholder, onAdd, disabled }) {
  const [value, setValue] = useState("");
  const submit = () => {
    if (!value) return;
    onAdd(value);
    setValue("");
  };
  return (
    <div className="flex gap-2 items-center">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        list="all-heroes"
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20 transition disabled:opacity-40"
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="px-4 py-2 text-sm font-semibold rounded-2xl border border-indigo-400/40 bg-indigo-500/20 text-white shadow-[0_10px_25px_rgba(46,74,255,0.35)] hover:bg-indigo-500/35 transition disabled:opacity-40"
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

// Popularité des héros (+1 par game où le héros est pick ou ban).
// La source de vérité est heroes.json, mis à jour par l'endpoint du serveur Vite (voir vite.config.js).
// Si l'endpoint est absent (site statique), les incréments sont gardés dans le navigateur.
const POPULARITY_API = "/api/validate-game";
const LOCAL_POPULARITY_KEY = "hero-popularity-local";

function filePopularity() {
  return Object.fromEntries(heroes.map((h) => [h.name, h.popularity || 0]));
}

function loadLocalPopularity() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_POPULARITY_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLocalPopularity(local) {
  try {
    localStorage.setItem(LOCAL_POPULARITY_KEY, JSON.stringify(local));
  } catch {
    // stockage indisponible : l'incrément ne sera pas conservé
  }
}

function mergePopularity(base, local) {
  const merged = { ...base };
  Object.entries(local).forEach(([name, n]) => {
    merged[name] = (merged[name] || 0) + n;
  });
  return merged;
}

async function recordGame(names) {
  try {
    const res = await fetch(POPULARITY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroes: names }),
    });
    if (res.ok) return mergePopularity(await res.json(), loadLocalPopularity());
  } catch {
    // serveur injoignable : repli sur le stockage local
  }

  const local = loadLocalPopularity();
  names.forEach((n) => {
    local[n] = (local[n] || 0) + 1;
  });
  saveLocalPopularity(local);
  return mergePopularity(filePopularity(), local);
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

function PopularityPage({ DB, popularity }) {
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

export default function DraftAssistant() {
  const DB = useMemo(() => buildHeroDB(), []);
  const [view, setView] = useState("draft");
  const [map, setMap] = useState(DEFAULT_MAP);
  const [allies, setAllies] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [bansAllies, setBansAllies] = useState([]);
  const [bansEnemies, setBansEnemies] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [popularity, setPopularity] = useState(() => mergePopularity(filePopularity(), loadLocalPopularity()));
  const [lastValidatedDraft, setLastValidatedDraft] = useState(null);

  const popularityBonus = useMemo(() => computePopularityBonus(popularity), [popularity]);
  const state = { map, allies, enemies, bansAllies, bansEnemies, popularityBonus };

  const gameHeroes = [...new Set([...allies, ...enemies, ...bansAllies, ...bansEnemies])];
  // Empêche de compter deux fois la même draft (double clic, re-validation)
  const draftKey = JSON.stringify([allies, enemies, bansAllies, bansEnemies]);
  const draftComplete = allies.length + enemies.length === 10;
  const gameValidated = draftKey === lastValidatedDraft;
  const canValidate = draftComplete && !gameValidated;

  async function validateGame() {
    if (!canValidate) return;
    setLastValidatedDraft(draftKey);
    setPopularity(await recordGame(gameHeroes));
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
  }, [map, allies, enemies, bansAllies, bansEnemies, popularityBonus, DB]);

  const enemyPotential = useMemo(() => {
    const mirrorState = {
      map,
      allies: enemies,
      enemies: allies,
      bansAllies: bansEnemies,
      bansEnemies: bansAllies,
      popularityBonus,
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
  }, [map, allies, enemies, bansAllies, bansEnemies, popularityBonus, DB]);

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
                {[["draft", "Draft"], ["popularity", "Popularité"]].map(([key, label]) => (
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
                onClick={validateGame}
                disabled={!canValidate}
                title={
                  gameValidated
                    ? "Cette game a déjà été comptée"
                    : draftComplete
                      ? "Ajoute +1 de popularité à chaque héros pick ou ban de cette game"
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

        {view === "popularity" && <PopularityPage DB={DB} popularity={popularity} />}

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
                  <li>Rôle déjà présent : −1 (−2 si déjà 2×)</li>
                  <li>Carte : favorable +1, défavorable −1</li>
                  <li>Contre un ennemi : +1.5 par cible</li>
                  <li>Se fait contrer par ennemi : −1.5 par héros</li>
                  <li>Bloque un contre ennemi : +0.5</li>
                  <li>Synergies alliées : +1 par allié synergique</li>
                  <li>Bloque une synergie ennemie : +0.5</li>
                </ul>
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
                      popular={popularityBonus[r.name] >= 1}
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
                      },
                      { sideForRole: "allies" }
                    )}
                    DB={DB}
                    popular={popularityBonus[r.name] >= 1}
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
