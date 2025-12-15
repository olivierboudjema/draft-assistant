import { useState, useMemo, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
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

// Plage visuelle utilisée pour le dégradé des scores
const SCORE_VISUAL_RANGE = { min: 5, max: 22 };

const HERO_IMAGE_BASE = "https://raw.githubusercontent.com/heroespatchnotes/heroes-talents/master/images/heroes";

const HERO_SLUG_OVERRIDES = {
  "aile de mort": "deathwing",
  "asmodan": "azmodan",
  "balafre": "stitches",
  "blanchetete": "whitemane",
  "bourbie": "murky",
  "butcher": "thebutcher",
  "chacal": "junkrat",
  "chogall": "chogall",
  "dva": "dva",
  "etc": "etc",
  "hammer": "sgthammer",
  "kramer": "blaze",
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

function heroPortraitUrl(name) {
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
      label: `Carte favorable (${state.map})`,
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
  "rounded-3xl border border-indigo-900/50 bg-gradient-to-br from-[#0a1330]/95 via-[#101B35]/90 to-[#292757]/85 backdrop-blur-2xl shadow-[0_20px_70px_rgba(2,6,23,0.65)]";

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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${m.cls}`}>
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
      <div className="rounded-2xl border border-indigo-700/40 bg-[#05070f] w-[300px] max-w-[92vw] p-4 text-[12px] shadow-2xl text-slate-200">
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

function HeroCard({ name, role, score, breakdown, DB }) {
  const [showTooltips, setShowTooltips] = useState(false);
  const cardRef = useRef(null);

  const handleMouseEnter = () => {
    setShowTooltips(true);
  };

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
      onMouseLeave={handleMouseLeave}
      className="group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#1c2f53]/78 via-[#284573]/65 to-[#2f5b88]/55 p-2.5 shadow-[0_10px_24px_rgba(5,10,26,0.55)] backdrop-blur transition hover:border-cyan-300/70"
      style={{
        boxShadow: "0 10px 28px rgba(10,24,48,0.55), 0 0 26px rgba(140,200,255,0.22)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-40 transition">
        <div className="absolute -inset-8 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.65),_transparent_60%)] blur-3xl" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <HeroPortrait name={name} src={DB[name]?.portrait} size={52} score={score} />
          </div>
          <div className="min-w-0">
            <HeroInfoHover name={name} DB={DB} showTooltip={showTooltips} onHoverChange={handleHoverChange}>
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

  const handleMouseEnter = () => {
    setShowTooltips(true);
  };

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
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <HeroPortrait name={name} src={DB[name]?.portrait} size={compact ? 28 : 34} score={score} />
        </div>
        <HeroInfoHover name={name} DB={DB} showTooltip={showTooltips} onHoverChange={handleHoverChange}>
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

function ListBox({ title, items, onRemove, compact, DB, state, side = "allies", children = null, tall = false }) {
  const heightCls = tall
    ? compact
      ? "min-h-[140px]"
      : "min-h-[200px]"
    : compact
      ? "min-h-[140px]"
      : "min-h-[200px]";
  return (
    <div className={`${PANEL_CLASS} ${compact ? "p-3.5" : "p-4"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`${SECTION_TITLE_CLASS} ${compact ? "text-[9px]" : ""}`}>{title}</div>
        <span className="text-[10px] text-slate-400 tracking-widest">#{items.length}</span>
      </div>
      {children && <div className="mb-3">{children}</div>}
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
          if (side === "allies") {
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
          }
          return (
            <div key={h + String(i)} className={`flex items-center justify-between ${compact ? "gap-1 text-xs" : "gap-2 text-sm"}`}>
              <div className="flex items-center flex-1 gap-1.5 min-w-0">
                <HeroPortrait name={h} src={DB[h]?.portrait} size={compact ? 28 : 34} />
                <HeroInfoHover name={h} DB={DB}>
                  <span className={`rounded-xl border border-white/10 bg-white/5 text-slate-100 shadow-inner ${compact ? "px-2 py-0.5" : "px-3 py-1"} inline-flex items-center max-w-full truncate`}>
                    {h}
                  </span>
                </HeroInfoHover>
                {role && (
                  <span className="ml-1">
                    <RoleChip role={role} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <ScoreBadge value={score} breakdown={breakdown} />
                <button
                  onClick={() => onRemove && onRemove(i)}
                  className={`${compact ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"} rounded-full border border-rose-500/30 text-rose-100 bg-rose-500/10 hover:bg-rose-500/30 transition`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-[11px] text-slate-400/70 text-center py-4">
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
      .slice(0, 88);
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
    <div className="min-h-screen w-full text-slate-100 app-gradient-bg">
      <div className="relative z-10">
        <div className="sticky top-0 z-30 app-gradient-bg backdrop-blur-2xl">
          <div className="w-full flex items-center justify-between px-3 py-2">
            <div>
              <div className={SECTION_TITLE_CLASS}>Heroes of the Storm</div>
              <div className="text-xl font-semibold text-white mt-1">Draft Assistant</div>
            </div>
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
                onClick={() => setShowHelp(true)}
                className="rounded-2xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold hover:bg-indigo-500/40 transition"
              >
                Algo
              </button>
              <button
                onClick={resetAll}
                className="rounded-2xl border border-rose-400/30 bg-rose-500/20 px-4 py-2 text-sm font-semibold hover:bg-rose-500/35 transition"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="w-full px-3 pb-2.5">
            <GlobalScores DB={DB} state={state} />
          </div>
        </div>

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
                  <li>Tier : S = +2, A = +1, B = 0, C = −1, D = −2</li>
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

        <div className="w-full grid grid-cols-12 gap-3 p-3">
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
              DB={DB}
              state={state}
              side="allies"
            >
              <AddHeroInput
                placeholder="Ajouter un pick…"
                onAdd={(v) => addTo(setAllies, allies, v)}
              />
            </ListBox>
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

            <div className={`${PANEL_CLASS} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className={SECTION_TITLE_CLASS}>Reco allié à pick</div>
                <span className="text-[11px] text-slate-400">Top {allyReco.length}</span>
              </div>
              <div className="max-h-[380px] overflow-y-auto no-scrollbar reco-scroll pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
                    <div className="col-span-full text-xs opacity-60">Aucun héros disponible</div>
                  )}
                </div>
              </div>
            </div>

            <div className={`${PANEL_CLASS} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className={SECTION_TITLE_CLASS}>
                  Reco à ban (meilleurs picks potentiels pour l'adversaire)
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
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
            <ListBox
              title="Ban adversaire"
              items={bansEnemies}
              onRemove={(i) => removeFrom(setBansEnemies, bansEnemies, i)}
              compact
              DB={DB}
              state={state}
              side="enemies"
              tall
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
              DB={DB}
              state={state}
              side="enemies"
            >
              <AddHeroInput
                placeholder="Ajouter un pick adverse…"
                onAdd={(v) => addTo(setEnemies, enemies, v)}
              />
            </ListBox>
          </aside>
        </div>
      </div>
    </div>
  );
}
