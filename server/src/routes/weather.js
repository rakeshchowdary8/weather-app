import { Router } from 'express';
import NodeCache from 'node-cache';
import { z } from 'zod';
import { getAirQuality, getWeather, geocode, reverseGeocode } from '../services/openMeteo.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const cache = new NodeCache({ stdTTL: 1800, checkperiod: 120 });
const staleCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });
const inFlight = new Map();
const coords = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) });
const weatherSchema = coords.extend({ units: z.enum(['metric', 'imperial']).default('metric') });

router.get('/weather', validate(weatherSchema), async (req, res, next) => {
  const { lat, lon, units } = req.validated;
  const key = `${lat.toFixed(2)}:${lon.toFixed(2)}:${units}`;
  try {
    let data = cache.get(key);
    if (!data) {
      let request = inFlight.get(key);
      if (!request) {
        request = getWeather({ lat, lon, units });
        inFlight.set(key, request);
      }
      try {
        data = await request;
        cache.set(key, data);
        staleCache.set(key, data);
      } finally {
        if (inFlight.get(key) === request) inFlight.delete(key);
      }
    }
    res.json(data);
  } catch (error) {
    const stale = staleCache.get(key);
    if (stale) {
      return res.json({ ...stale, stale: true });
    }
    error.status = error.status || 503;
    next(error);
  }
});

router.get('/air-quality', validate(coords), async (req, res, next) => {
  try { res.json(await getAirQuality(req.validated)); } catch (error) { next(error); }
});

router.get('/geocode', validate(z.object({ q: z.string().trim().min(2).max(80) })), async (req, res, next) => {
  try { res.json(await geocode(req.validated.q)); } catch (error) { next(error); }
});

router.get('/reverse-geocode', validate(coords), async (req, res, next) => {
  try { res.json(await reverseGeocode(req.validated)); } catch (error) { next(error); }
});

export default router;
