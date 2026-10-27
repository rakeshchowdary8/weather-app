import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '../services/api';

export function useWeather(city, units) {
  const latitude = city?.latitude ?? city?.lat;
  const longitude = city?.longitude ?? city?.lon;
  return useQuery({
    queryKey: ['weather', latitude, longitude, units],
    queryFn: () => weatherApi.weather({ lat: latitude, lon: longitude, units }),
    enabled: Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)),
    staleTime: 600000,
    refetchOnWindowFocus: false,
  });
}
