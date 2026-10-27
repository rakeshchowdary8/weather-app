import { useEffect, useMemo, useState } from 'react';
import { Activity, Droplets, Eye, Gauge, RefreshCw, Star, Sun, Umbrella, Wind } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import SearchBar from './components/SearchBar';
import WeatherIcon from './components/WeatherIcon';
import Skeleton from './components/Skeleton';
import ForecastChart from './components/ForecastChart';
import { useApp } from './context/AppContext';
import { useWeather } from './hooks/useWeather';
import { weatherApi } from './services/api';
import { temp, time, day } from './utils/format';

const Card = ({ children, className = '' }) => <section className={`glass rounded-3xl p-5 ${className}`}>{children}</section>;
const Stat = ({ icon: Icon, label, value }) => <div className="metric"><Icon size={18} className="text-sky-400" /><span className="text-xs text-slate-500">{label}</span><strong>{value}</strong></div>;
const placeKey = (place) => `${place.latitude}:${place.longitude}`;

export default function App() {
  const { city, setCity, units } = useApp();
  const { data, isLoading, isError, isFetching, refetch } = useWeather(city, units);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('skycast-favorites') || '[]'));
  const [air, setAir] = useState(null);
  const latitude = city?.latitude ?? city?.lat;
  const longitude = city?.longitude ?? city?.lon;
  const guestId = useMemo(() => {
    let id = localStorage.getItem('skycast-guest');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('skycast-guest', id); }
    return id;
  }, []);

  useEffect(() => {
    weatherApi.favorites(guestId).then((saved) => {
      setFavorites(saved);
      localStorage.setItem('skycast-favorites', JSON.stringify(saved));
    }).catch(() => {});
  }, [guestId]);

  useEffect(() => {
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return;
    setAir(null);
    weatherApi.air({ lat: latitude, lon: longitude }).then(setAir).catch(() => setAir({ aqi: null, category: 'Unavailable', pollutants: {} }));
  }, [latitude, longitude]);

  const addFavorite = async () => {
    if (favorites.some((item) => placeKey(item) === placeKey(city))) { toast('Already in favorites'); return; }
    try {
      const saved = await weatherApi.saveFavorite(guestId, city);
      const next = [...favorites, saved];
      setFavorites(next);
      localStorage.setItem('skycast-favorites', JSON.stringify(next));
      toast.success('Added to favorites');
    } catch { toast.error('Could not save favorite. Check the database connection.'); }
  };

  if (isLoading) return <main className="app"><div className="mx-auto max-w-6xl space-y-6"><Skeleton className="h-16" /><Skeleton className="h-72" /><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></div></main>;
  if ((isError && !data) || !data) return <main className="app"><div className="mx-auto max-w-xl glass rounded-3xl p-10 text-center"><h1 className="text-2xl font-bold">We lost the forecast</h1><p className="mt-2 text-slate-500">Check your connection or try again in a moment.</p><button onClick={() => refetch()} className="button mt-6"><RefreshCw size={16} /> Try again</button></div></main>;

  const current = data.current;
  const currentType = current.is_day ? current.condition.type : 'night';
  return <main className={`app weather-${currentType}`}><div className="mx-auto max-w-6xl space-y-5">
    {isFetching && <div className="forecast-status" role="status" aria-live="polite">Updating forecast for {city.name}...</div>}
    <SearchBar />
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hero rounded-3xl p-7 md:p-10"><div className="flex items-start justify-between"><div><p className="text-lg text-white/70">{city.name}, {city.country}</p><p className="mt-5 text-7xl font-semibold tracking-tighter md:text-8xl">{temp(current.temperature_2m, units)}</p><p className="mt-3 text-xl text-white/80">{current.condition.label}</p></div><WeatherIcon type={currentType} size={90} /></div><div className="mt-10 flex flex-wrap gap-5 text-sm text-white/80"><span>Feels like {temp(current.apparent_temperature, units)}</span><span>H:{temp(data.daily[0].max, units)} · L:{temp(data.daily[0].min, units)}</span><span>{time(data.daily[0].sunrise, data.timezone)} sunrise</span></div></motion.div>
      <Card><div className="flex items-center justify-between"><h2 className="section-title">At a glance</h2><button onClick={addFavorite} className="icon-button" aria-label="Add favorite"><Star size={19} /></button></div><div className="mt-5 grid grid-cols-2 gap-3"><Stat icon={Droplets} label="Humidity" value={`${current.relative_humidity_2m}%`} /><Stat icon={Wind} label="Wind" value={`${Math.round(current.wind_speed_10m)} ${units === 'metric' ? 'km/h' : 'mph'}`} /><Stat icon={Gauge} label="Pressure" value={`${Math.round(current.surface_pressure)} hPa`} /><Stat icon={Eye} label="Visibility" value={`${(current.visibility / 1000).toFixed(1)} km`} /><Stat icon={Umbrella} label="Cloud cover" value={`${current.cloud_cover}%`} /><Stat icon={Sun} label="UV index" value={current.uv_index} /></div></Card>
    </div>
    {air && <Card className="air-card"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="air-icon"><Activity size={20} /></span><div><h2 className="section-title">Air quality</h2><p className="muted">Live conditions near {city.name}</p></div></div><div className="flex items-center gap-3"><strong className="aqi-value">{air.aqi ?? '—'}</strong><span className="aqi-category">{air.category}</span></div></div><div className="pollutants"><span>PM2.5 <b>{air.pollutants?.pm25 ?? '—'}</b> µg/m³</span><span>PM10 <b>{air.pollutants?.pm10 ?? '—'}</b> µg/m³</span><span>O₃ <b>{air.pollutants?.o3 ?? '—'}</b> µg/m³</span><span>NO₂ <b>{air.pollutants?.no2 ?? '—'}</b> µg/m³</span></div></Card>}
    <div className="grid gap-5 lg:grid-cols-[1.6fr_.4fr]"><Card className="forecast-card"><div className="hourly-header flex items-center justify-between"><div><h2 className="section-title">Hourly forecast</h2><p className="muted">Next 24 hours</p></div><div className="hourly-list flex gap-3 overflow-x-auto py-1">{data.hourly.slice(0, 8).map((item, index) => <div className="hour" key={item.time}><span>{index ? '' : 'Now'}</span><WeatherIcon type={item.condition.type} size={24} /><b>{temp(item.temperature, units)}</b></div>)}</div></div><ForecastChart data={data.hourly} units={units} tz={data.timezone} /></Card><Card><h2 className="section-title">Saved places</h2>{favorites.length === 0 ? <p className="muted mt-4">Star a city to pin it here.</p> : favorites.map((item) => <button key={placeKey(item)} onClick={() => setCity(item)} className="favorite"><Star size={15} className="text-amber-400" /><span>{item.name}</span></button>)}</Card></div>
    <Card><h2 className="section-title">7-day outlook</h2><div className="forecast-list">{data.daily.map((item) => <div className="day-row" key={item.date}><span className="w-24 font-medium">{day(item.date, data.timezone)}</span><WeatherIcon type={item.condition.type} size={25} /><span className="flex-1 text-sm text-slate-500">{item.condition.label}</span><span className="text-sm">💧 {item.precipitationProbability}%</span><b>{temp(item.max, units)} <span className="font-normal text-slate-400">{temp(item.min, units)}</span></b></div>)}</div></Card>
    <footer className="pb-8 text-center text-xs text-slate-400">Data by Open-Meteo · Updated automatically every 10 minutes · <span>{guestId.slice(0, 8)}</span></footer>
  </div></main>;
}
