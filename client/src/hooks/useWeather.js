import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '../services/api';

export function useWeather(city, units) {
  const latitude = city?.latitude ?? city?.lat;
  const longitude = city?.longitude ?? city?.lon;
  const storageKey = `skycast-weather-${latitude}-${longitude}-${units}`;
  const query = useQuery({
    queryKey: ['weather', latitude, longitude, units],
    queryFn: () => weatherApi.weather({ lat: latitude, lon: longitude, units }),
    enabled: Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)),
    staleTime: 600000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => {
      if (previousData) return previousData;
      try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { return undefined; }
    },
  });

  useEffect(() => {
    if (query.data && !query.isPlaceholderData) {
      localStorage.setItem(storageKey, JSON.stringify(query.data));
    }
  }, [query.data, query.isPlaceholderData, storageKey]);

  return query;
}
