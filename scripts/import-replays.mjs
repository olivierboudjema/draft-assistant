// Importe les games de Ligue Storm depuis les replays du jeu (.StormReplay) :
// - ajoute chaque nouvelle game à games.json (équipes, bans, map, vainqueur…) ;
// - ajoute +1 de popularité dans heroes.json à chaque héros pick ou ban de ces games.
//
// Relançable sans risque : une game déjà présente dans games.json n'est jamais ajoutée deux fois.
//
//   npm run import-replays              → importe et écrit les fichiers
//   npm run import-replays -- --dry-run → affiche ce qui serait importé, sans rien écrire
//   … -- --dry-run --dump games.out.json → écrit aussi les games détectées dans un fichier, pour les vérifier

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '..')
const HEROES_FILE = path.join(ROOT, 'heroes.json')
const GAMES_FILE = path.join(ROOT, 'games.json')
const MAPS_FILE = path.join(ROOT, 'maps.json')

const REPLAYS_ROOT = path.join(process.env.USERPROFILE || '', 'Documents', 'Heroes of the Storm', 'Accounts')

// Comptes Battle.net à importer (dossier dans REPLAYS_ROOT → joueur)
const ACCOUNTS = {
  '1154517938': 'Skippy',
  '405091405': 'Lisou92',
}
// L'équipe "allies" est celle où joue l'un de ces joueurs
const OUR_PLAYERS = Object.values(ACCOUNTS)

const STORM_LEAGUE_AMM_ID = 50091

// Héros dont le nom en jeu ne correspond pas à heroes.json (clé : identifiant interne du jeu)
const HERO_OVERRIDES = {
  Butcher: 'Boucher',
  Tinker: 'Gazlowe',
  SgtHammer: 'Sergent Marteau',
  Greymane: 'Greymane',
  Probius: 'Probius',
}

// Héros séparés en plusieurs variantes dans heroes.json : la variante est déduite des talents.
// Pour un ban, aucune variante n'est connue : on prend la plus jouée dans les replays importés.
const VARIANTS = {
  // Héroïque du niveau 4
  Varian: (talents) =>
    /Taunt/.test(talents[1]) ? 'Varian Tank'
      : /ColossusSmash/.test(talents[1]) ? 'Varian Bruiser'
        : /TwinBlades/.test(talents[1]) ? 'Varian Dps Mêlée'
          : null,
  // Aucun talent ne distingue clairement les deux rôles : Gantelets incinérateurs (niveau 4) = build dégâts
  Firebat: (talents) => (/IncineratorGauntlets/.test(talents[1]) ? 'Kramer Dps' : 'Kramer Tank'),
}

// ---------------------------------------------------------------------------
// Lecture des replays (bibliothèque heroprotocol, portage JS de Blizzard/heroprotocol)

const require = createRequire(import.meta.url)
const HP_LIB = path.join(path.dirname(require.resolve('heroprotocol')), 'lib')
const { MPQArchive } = createRequire(require.resolve('heroprotocol'))('empeeku/mpyq')
const baseProtocol = require(path.join(HP_LIB, 'protocol29406'))

// Blizzard ne publie plus les protocoles des nouveaux builds, mais le format ne change plus :
// on prend le protocole connu le plus proche (≤ build du replay).
const PROTOCOL_BUILDS = fs.readdirSync(HP_LIB)
  .map((f) => /^protocol(\d+)\.js$/.exec(f))
  .filter(Boolean)
  .map((m) => Number(m[1]))
  .sort((a, b) => a - b)

function decodeStrings(d) {
  if (d instanceof Buffer) return d.toString()
  if (Array.isArray(d)) return d.map(decodeStrings)
  if (d && typeof d === 'object') {
    for (const k of Object.keys(d)) d[k] = decodeStrings(d[k])
  }
  return d
}

function openReplay(file) {
  const archive = new MPQArchive(file)
  const header = decodeStrings(baseProtocol.decodeReplayHeader(archive.header.userDataHeader.content))
  const build = header.m_version.m_baseBuild
  const protocolBuild = PROTOCOL_BUILDS.filter((b) => b <= build).pop() ?? PROTOCOL_BUILDS.at(-1)
  const protocol = require(path.join(HP_LIB, `protocol${protocolBuild}`))
  return {
    header,
    details: () => decodeStrings(protocol.decodeReplayDetails(archive.readFile('replay.details'))),
    initData: () => decodeStrings(protocol.decodeReplayInitdata(archive.readFile('replay.initdata'))),
    * trackerEvents() {
      for (const e of protocol.decodeReplayTrackerEvents(archive.readFile('replay.tracker.events'))) yield decodeStrings(e)
    },
  }
}

// FILETIME Windows (centaines de ns depuis 1601) → date ISO
function fileTimeToIso(t) {
  return new Date(Number(t) / 10000 - 11644473600000).toISOString()
}

// Extrait d'un replay les infos brutes (héros en identifiants internes), ou null si ce n'est pas de la Ligue Storm
function readReplay(file) {
  const r = openReplay(file)
  const game = r.initData().m_syncLobbyState.m_gameDescription
  if (game.m_gameOptions.m_ammId !== STORM_LEAGUE_AMM_ID) return null

  const details = r.details()
  const players = details.m_playerList.map((p) => ({
    name: p.m_name,
    team: p.m_teamId,
    won: p.m_result === 1,
    localizedHero: p.m_hero,
  }))

  const picks = [] // ordre de la draft
  const bans = [[], []]
  const talents = {} // nom interne du héros (ex. "HeroVarian") → choix de talents, par joueur
  for (const e of r.trackerEvents()) {
    if (e._event === 'NNet.Replay.Tracker.SHeroPickedEvent') {
      players[e.m_controllingPlayer].hero = e.m_hero
      picks.push(e.m_controllingPlayer)
    } else if (e._event === 'NNet.Replay.Tracker.SHeroBannedEvent') {
      // "NONE" : ban non utilisé
      if (e.m_hero !== 'NONE') bans[e.m_controllingTeam - 1].push(e.m_hero)
    } else if (e._event === 'NNet.Replay.Tracker.SStatGameEvent' && e.m_eventName === 'EndOfGameTalentChoices') {
      const s = Object.fromEntries(e.m_stringData.map((x) => [x.m_key, x.m_value]))
      const player = e.m_intData.find((x) => x.m_key === 'PlayerID')?.m_value
      if (player) talents[player - 1] = [1, 2, 3, 4, 5, 6, 7].map((t) => s[`Tier ${t} Choice`] || null).filter(Boolean)
    }
  }

  return {
    randomValue: game.m_randomValue,
    date: fileTimeToIso(details.m_timeUTC),
    mapTitle: details.m_title,
    durationSec: Math.round(r.header.m_elapsedGameLoops / 16),
    players: players.map((p, i) => ({ ...p, talents: talents[i] || [] })),
    pickOrder: picks,
    bans,
  }
}

// ---------------------------------------------------------------------------
// Correspondance des noms du jeu vers heroes.json / maps.json

const normalize = (s) =>
  String(s).toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

const heroesData = JSON.parse(fs.readFileSync(HEROES_FILE, 'utf8'))
const mapsData = JSON.parse(fs.readFileSync(MAPS_FILE, 'utf8'))
const heroByNorm = new Map(heroesData.map((h) => [normalize(h.name), h.name]))
const mapByNorm = new Map(mapsData.map((m) => [normalize(m.name), m]))

function resolveMap(title) {
  // Le jeu ajoute l'article : "La fonderie Volskaya" → "Fonderie Volskaya"
  const withoutArticle = title.replace(/^(la |le |les |l['’])/i, '')
  return mapByNorm.get(normalize(withoutArticle)) || mapByNorm.get(normalize(title)) || null
}

// ---------------------------------------------------------------------------

function main() {
  const dryRun = process.argv.includes('--dry-run')

  // 1. Lecture de tous les replays de Ligue Storm
  const raw = []
  let skippedMode = 0
  const errors = []
  for (const [account, player] of Object.entries(ACCOUNTS)) {
    const accountDir = path.join(REPLAYS_ROOT, account)
    if (!fs.existsSync(accountDir)) {
      console.warn(`Compte ${account} (${player}) introuvable dans ${REPLAYS_ROOT}`)
      continue
    }
    for (const region of fs.readdirSync(accountDir).filter((d) => d.includes('-Hero-'))) {
      const dir = path.join(accountDir, region, 'Replays', 'Multiplayer')
      if (!fs.existsSync(dir)) continue
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.StormReplay'))
      console.log(`${player} : lecture de ${files.length} replays…`)
      for (const f of files) {
        try {
          const game = readReplay(path.join(dir, f))
          if (game) raw.push({ ...game, account: player })
          else skippedMode++
        } catch (err) {
          errors.push(`${f} : ${err.message}`)
        }
      }
    }
  }

  // 2. Identifiant interne → nom heroes.json, appris des picks (le jeu donne aussi le nom français du joueur)
  const localizedVotes = {}
  raw.forEach((g) => g.players.forEach((p) => {
    if (!p.hero) return
    const votes = (localizedVotes[p.hero] ??= {})
    votes[p.localizedHero] = (votes[p.localizedHero] || 0) + 1
  }))
  const variantCounts = {}
  const unknownHeroes = new Set()

  function resolveHero(id, talents = null) {
    if (VARIANTS[id]) {
      const variant = talents && VARIANTS[id](talents)
      if (variant) {
        variantCounts[id] ??= {}
        variantCounts[id][variant] = (variantCounts[id][variant] || 0) + 1
        return variant
      }
      return { pendingVariant: id }
    }
    if (HERO_OVERRIDES[id]) return HERO_OVERRIDES[id]
    const localized = Object.entries(localizedVotes[id] || {}).sort((a, b) => b[1] - a[1])[0]?.[0]
    const name = (localized && heroByNorm.get(normalize(localized))) || heroByNorm.get(normalize(id))
    if (!name) unknownHeroes.add(`${id} (${localized || '?'})`)
    return name || null
  }

  // 3. Conversion au format de games.json
  const unknownMaps = new Set()
  let notOurs = 0
  const converted = []
  for (const g of raw) {
    const map = resolveMap(g.mapTitle)
    if (!map) {
      unknownMaps.add(g.mapTitle)
      continue
    }
    // Joueur du compte dont vient le replay (à défaut, l'un des nôtres)
    const us = g.players.find((p) => p.name === g.account) || g.players.find((p) => OUR_PLAYERS.includes(p.name))
    if (!us) {
      notOurs++
      continue
    }
    const ourTeam = us.team
    const team = (t) => {
      const members = g.pickOrder.map((i) => g.players[i]).filter((p) => p.team === t)
      return {
        picks: members.map((p) => resolveHero(p.hero, p.talents)),
        bans: g.bans[t].map((id) => resolveHero(id)),
        players: members.map((p) => p.name),
      }
    }
    const allies = team(ourTeam)
    const enemies = team(1 - ourTeam)
    converted.push({
      id: `replay-${g.randomValue}`,
      date: g.date,
      map: map.name,
      mapId: map.id,
      winner: us.won ? 'allies' : 'enemies',
      allies,
      enemies,
      source: 'replay',
      mode: 'storm-league',
      durationSec: g.durationSec,
      player: us.name,
    })
  }

  // Variante des bans (Varian, Kramer) : la plus jouée
  const mostPlayed = Object.fromEntries(Object.entries(variantCounts).map(([id, counts]) =>
    [id, Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]]))
  converted.forEach((g) => [g.allies, g.enemies].forEach((t) => {
    t.picks = t.picks.map((h) => (h?.pendingVariant ? mostPlayed[h.pendingVariant] : h))
    t.bans = t.bans.map((h) => (h?.pendingVariant ? mostPlayed[h.pendingVariant] : h))
  }))
  const complete = converted.filter((g) => [g.allies, g.enemies].every((t) => t.picks.length === 5 && t.picks.every(Boolean)))
  complete.forEach((g) => [g.allies, g.enemies].forEach((t) => (t.bans = t.bans.filter(Boolean))))

  // 4. Fusion avec games.json : même replay (identifiant) ou même game validée à la main (map + 10 héros)
  const games = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'))
  const signature = (g) => [g.mapId, [...g.allies.picks].sort().join(','), [...g.enemies.picks].sort().join(',')].join('|')
  const known = new Set(games.flatMap((g) => [g.id, signature(g)]))
  const added = []
  for (const g of complete.sort((a, b) => a.date.localeCompare(b.date))) {
    if (known.has(g.id) || known.has(signature(g))) continue
    known.add(g.id)
    known.add(signature(g))
    added.push(g)
  }

  // 5. Popularité : +1 par game ajoutée pour chaque héros pick ou ban
  const increments = {}
  added.forEach((g) => {
    new Set([...g.allies.picks, ...g.allies.bans, ...g.enemies.picks, ...g.enemies.bans]).forEach((h) => {
      increments[h] = (increments[h] || 0) + 1
    })
  })

  // Résumé
  const wins = added.filter((g) => g.winner === 'allies').length
  console.log('')
  console.log(`Replays de Ligue Storm lus : ${raw.length} (autres modes ignorés : ${skippedMode})`)
  console.log(`Nouvelles games : ${added.length} (${wins} victoires, ${added.length - wins} défaites)`)
  console.log(`Déjà présentes dans games.json : ${complete.length - added.length}`)
  if (converted.length - complete.length) console.log(`Ignorées (héros non reconnu) : ${converted.length - complete.length}`)
  if (notOurs) console.log(`Ignorées (ni ${OUR_PLAYERS.join(' ni ')} dans la partie) : ${notOurs}`)
  if (unknownMaps.size) console.log(`Maps absentes de maps.json (games ignorées) : ${[...unknownMaps].join(', ')}`)
  if (unknownHeroes.size) console.log(`Héros non reconnus : ${[...unknownHeroes].join(', ')}`)
  if (errors.length) console.log(`Replays illisibles : ${errors.length}\n  ${errors.slice(0, 5).join('\n  ')}`)
  console.log('Variantes jouées :', JSON.stringify(variantCounts))
  console.log('Héros les plus présents (pick ou ban) :', Object.entries(increments).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h, n]) => `${h} ${n}`).join(', '))

  const dumpIndex = process.argv.indexOf('--dump')
  if (dumpIndex !== -1) {
    fs.writeFileSync(process.argv[dumpIndex + 1], JSON.stringify(added, null, 2))
    console.log(`Games détectées écrites dans ${process.argv[dumpIndex + 1]}`)
  }

  if (dryRun) {
    console.log('\n--dry-run : aucun fichier modifié.')
    return
  }
  if (!added.length) return

  fs.writeFileSync(GAMES_FILE, JSON.stringify([...games, ...added], null, 2))
  heroesData.forEach((h) => {
    if (increments[h.name]) h.popularity = (h.popularity || 0) + increments[h.name]
  })
  fs.writeFileSync(HEROES_FILE, JSON.stringify(heroesData, null, 2))
  console.log(`\ngames.json et heroes.json mis à jour (+${added.length} games).`)
}

main()
