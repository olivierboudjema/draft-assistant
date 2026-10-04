import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const HEROES_FILE = path.resolve(import.meta.dirname, 'heroes.json')

// Endpoint POST /api/validate-game : incrémente "popularity" dans heroes.json
// pour chaque héros pick ou ban de la game validée.
// Le navigateur ne pouvant pas écrire de fichier, c'est le serveur Vite (dev / preview) qui s'en charge.
function popularityApi() {
  const middleware = (req, res, next) => {
    if (req.url !== '/api/validate-game' || req.method !== 'POST') return next()

    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const names = new Set(JSON.parse(body).heroes || [])
        const heroes = JSON.parse(fs.readFileSync(HEROES_FILE, 'utf8'))
        heroes.forEach((h) => {
          if (names.has(h.name)) h.popularity = (h.popularity || 0) + 1
        })
        fs.writeFileSync(HEROES_FILE, JSON.stringify(heroes, null, 2))

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(Object.fromEntries(heroes.map((h) => [h.name, h.popularity || 0]))))
      } catch (err) {
        res.statusCode = 500
        res.end(String(err))
      }
    })
  }

  return {
    name: 'popularity-api',
    // Corps entre accolades : une fonction renvoyée ici serait exécutée par Vite comme post-hook
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), popularityApi()],
})
