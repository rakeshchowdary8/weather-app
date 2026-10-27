import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api'),
  timeout: 12000,
});

export const weatherApi = {
  weather: (params) => api.get('/weather', { params }).then((response) => response.data),
  air: (params) => api.get('/air-quality', { params }).then((response) => response.data),
  favorites: (guestId) => api.get('/favorites', { params: { guestId } }).then((response) => response.data),
  saveFavorite: (guestId, place) => api.post('/favorites', { guestId, name: place.name, country: place.country || '', latitude: place.latitude, longitude: place.longitude, timezone: place.timezone }).then((response) => response.data),
  history: (guestId) => api.get('/history', { params: { guestId } }).then((response) => response.data),
  reverseGeocode: (params) => api.get('/reverse-geocode', { params }).then((response) => response.data),
  saveHistory: (guestId, place) => api.post('/history', {
    guestId,
    name: place.name,
    country: place.country || '',
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
  }).then((response) => response.data),
  geocode: (query) => {
    if (!query?.trim()) return Promise.resolve([]);
    return api.get('/geocode', { params: { q: query } }).then((response) => response.data);
  },
};
