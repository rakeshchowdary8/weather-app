# SkyCast Weather

A production-minded MERN weather dashboard powered by Open-Meteo. The provider boundary is isolated in `server/src/services/openMeteo.js`, so an OpenWeatherMap adapter can be added without changing API consumers.

## Project tree

```text
server/
  src/{config,controllers,routes,models,services,middleware,utils}/
client/
  src/{components,pages,hooks,services,context,utils,assets}/
```

The empty structural folders are intentionally reserved for future auth/page extraction; the working implementation is in the adjacent source modules.

## Run locally

Requirements: Node 18+ and MongoDB (local or Atlas).

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
npm install
npm run install:all
npm run dev
```

Client: `http://localhost:5173` · API: `http://localhost:5000`

For a local database, use `mongodb://127.0.0.1:27017/skycast`. For Atlas, replace `MONGODB_URI` with the connection string and whitelist the server deployment IP.

## Environment variables

Server: `PORT`, `MONGODB_URI`, `CLIENT_URL`, and `WEATHER_PROVIDER` (`open-meteo` currently; the value is ready for provider selection).

Client: `VITE_API_URL`, normally `http://localhost:5000/api`.

## API

- `GET /api/weather?lat=12.97&lon=77.59&units=metric` — normalized current, 48-hour, and 7-day forecast. Cached for 10 minutes using rounded coordinates.
- `GET /api/geocode?q=London` — up to eight city suggestions.
- `GET /api/air-quality?lat=12.97&lon=77.59` — AQI and pollutant breakdown.
- `GET /api/favorites?guestId=...`, `POST /api/favorites`, `DELETE /api/favorites`.
- `GET /api/history?guestId=...`, `POST /api/history`, `DELETE /api/history`.
- `GET /api/health` — health check.

Favorites and history accept a client-generated `guestId`, which gives guests persistence without requiring auth. The client also keeps a local fallback so the dashboard remains usable if MongoDB is unavailable.

## Deployment

Build the client with `npm run build --prefix client`; deploy `client/dist` to Vercel or Netlify and set `VITE_API_URL` to the public API URL. Deploy the server to Render or Railway with `npm start --prefix server`, set the server environment variables, and use MongoDB Atlas for the database. Configure the client origin in `CLIENT_URL`.

## Next improvements

1. Add JWT accounts and sync guest data after login.
2. Add an OpenWeatherMap adapter and automated provider contract tests.
3. Add PWA caching, shareable weather cards, and Vitest/Supertest coverage.
