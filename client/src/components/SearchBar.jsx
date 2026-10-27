import { useEffect, useRef, useState } from 'react';
import { CloudSun, History, LocateFixed, MapPin, Moon, Search, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { weatherApi } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useGeolocation } from '../hooks/useGeolocation';
import { useApp } from '../context/AppContext';

function getGuestId() {
  let id = localStorage.getItem('skycast-guest');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('skycast-guest', id); }
  return id;
}

export default function SearchBar() {
  const { setCity, units, setUnits, theme, setTheme } = useApp();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(0);
  const debouncedQuery = useDebounce(query);
  const geo = useGeolocation();
  const guestId = getGuestId();
  const processedLocation = useRef('');

  useEffect(() => {
    weatherApi.history(guestId).then(setHistory).catch(() => setHistory([]));
  }, [guestId]);

  const runSearch = (value = query) => {
    const term = value.trim();
    if (term.length < 2) { setItems([]); setSearched(false); return; }
    setShowHistory(true);
    weatherApi.geocode(term).then((results) => { setItems(results); setSearched(true); }).catch(() => { setItems([]); setSearched(true); });
  };

  useEffect(() => {
    if (debouncedQuery.length < 2) { setItems([]); setSearched(false); return; }
    runSearch(debouncedQuery);
  }, [debouncedQuery]);

  useEffect(() => {
    if (!geo.coords) return;
    const locationKey = `${geo.coords.latitude}:${geo.coords.longitude}`;
    if (processedLocation.current === locationKey) return;
    processedLocation.current = locationKey;
    const fallback = { name: 'Current location', country: '', latitude: geo.coords.latitude, longitude: geo.coords.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    setCity(fallback);
    weatherApi.reverseGeocode({ lat: geo.coords.latitude, lon: geo.coords.longitude }).then((location) => {
      setCity(location);
      return weatherApi.saveHistory(guestId, location);
    }).then((saved) => setHistory((old) => [saved, ...old.filter((item) => item.latitude !== saved.latitude || item.longitude !== saved.longitude)].slice(0, 10))).catch(() => {});
  }, [geo.coords, guestId, setCity]);

  useEffect(() => { if (geo.error) toast.error(geo.error); }, [geo.error]);

  const choose = (item) => {
    setCity(item); setQuery(''); setItems([]); setShowHistory(false);
    weatherApi.saveHistory(guestId, item).then((saved) => setHistory((old) => [saved, ...old.filter((entry) => entry.latitude !== saved.latitude || entry.longitude !== saved.longitude)].slice(0, 10))).catch(() => {});
  };

  return <header className="site-header">
    <div className="site-brand"><span className="brand-mark"><CloudSun size={22} /></span><span><b>SKYCAST</b><small>LIVE WEATHER</small></span></div>
    <div className="header-search-wrap">
      <div className="header-search">
        <Search size={18} className="text-slate-400" />
        <input aria-label="Search city" value={query} onFocus={() => setShowHistory(true)} onChange={(event) => { setQuery(event.target.value); setActive(0); setShowHistory(true); }} onKeyDown={(event) => { if (event.key === 'ArrowDown') setActive((value) => Math.min(value + 1, items.length - 1)); if (event.key === 'ArrowUp') setActive((value) => Math.max(value - 1, 0)); if (event.key === 'Enter') { event.preventDefault(); runSearch(); } }} placeholder="Search city or place..." />
        {showHistory && (items.length > 0 || searched || (query.length < 2 && history.length > 0)) && <div className="search-menu">{items.length > 0 ? items.map((item, index) => <button key={item.id} onClick={() => choose(item)} className={active === index ? 'active' : ''}><MapPin size={15} /><span><b>{item.name}</b><small>{[item.admin1, item.country].filter(Boolean).join(', ')}</small></span></button>) : searched ? <div className="search-empty">City not found</div> : <>{history.map((item) => <button key={`${item.latitude}:${item.longitude}`} onClick={() => choose(item)}><History size={15} /><span><b>{item.name}</b><small>{item.country || 'Recent search'}</small></span></button>)}</>}</div>}
      </div>
      <button className="header-location" onClick={() => { setShowHistory(false); geo.getLocation(); }} disabled={geo.loading} title="Use your current location"><LocateFixed size={17} />{geo.loading ? 'Locating...' : 'My location'}</button>
    </div>
    <div className="header-actions"><button className="header-pill" onClick={() => setUnits(units === 'metric' ? 'imperial' : 'metric')}>{units === 'metric' ? '°C · km/h' : '°F · mph'}</button><button className="header-icon" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button></div>
  </header>;
}
