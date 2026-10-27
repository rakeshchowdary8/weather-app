const forecastUrl = "https://api.open-meteo.com/v1/forecast";
const airUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";
const geoUrl = "https://geocoding-api.open-meteo.com/v1/search";
const weatherParams =
  "current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,visibility,uv_index&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7";
const codeMap = {
  0: ["Clear sky", "sun"],
  1: ["Mainly clear", "sun"],
  2: ["Partly cloudy", "cloud"],
  3: ["Overcast", "cloud"],
  45: ["Fog", "fog"],
  48: ["Rime fog", "fog"],
  51: ["Light drizzle", "rain"],
  53: ["Drizzle", "rain"],
  55: ["Heavy drizzle", "rain"],
  61: ["Light rain", "rain"],
  63: ["Rain", "rain"],
  65: ["Heavy rain", "rain"],
  71: ["Light snow", "snow"],
  73: ["Snow", "snow"],
  75: ["Heavy snow", "snow"],
  80: ["Rain showers", "rain"],
  81: ["Rain showers", "rain"],
  82: ["Heavy showers", "rain"],
  95: ["Thunderstorm", "storm"],
  96: ["Thunderstorm with hail", "storm"],
  99: ["Thunderstorm with hail", "storm"],
};
const condition = (code) => {
  const [label, type] = codeMap[code] || ["Unknown", "cloud"];
  return { label, type, code };
};
export async function geocode(q) {
  const r = await fetch(
    `${geoUrl}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
  );
  if (!r.ok) throw new Error("Geocoding failed");
  const d = await r.json();
  return (d.results || []).map((x) => ({
    id: `${x.latitude}:${x.longitude}`,
    name: x.name,
    country: x.country,
    admin1: x.admin1,
    latitude: x.latitude,
    longitude: x.longitude,
    timezone: x.timezone,
  }));
}
export async function getWeather({ lat, lon, units = "metric" }) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Weather request requires numeric latitude and longitude");
  }

  const temperatureUnit = units === "imperial" ? "fahrenheit" : "celsius";
  const windUnit = units === "imperial" ? "mph" : "kmh";
  const params = new URLSearchParams(weatherParams);
  params.set("latitude", String(latitude));
  params.set("longitude", String(longitude));
  params.set("temperature_unit", temperatureUnit);
  params.set("wind_speed_unit", windUnit);

  const r = await fetch(`${forecastUrl}?${params}`);
  if (!r.ok) {
    let detail = "Weather provider failed";
    try {
      const error = await r.json();
      detail = error.reason || detail;
    } catch {}
    throw new Error(detail);
  }
  const d = await r.json();
  return {
    latitude: d.latitude,
    longitude: d.longitude,
    timezone: d.timezone,
    units,
    current: { ...d.current, condition: condition(d.current.weather_code) },
    hourly: d.hourly.time
      .slice(0, 48)
      .map((time, i) => ({
        time,
        temperature: d.hourly.temperature_2m[i],
        feelsLike: d.hourly.apparent_temperature[i],
        precipitationProbability: d.hourly.precipitation_probability[i],
        windSpeed: d.hourly.wind_speed_10m[i],
        condition: condition(d.hourly.weather_code[i]),
      })),
    daily: d.daily.time.map((date, i) => ({
      date,
      min: d.daily.temperature_2m_min[i],
      max: d.daily.temperature_2m_max[i],
      precipitationProbability: d.daily.precipitation_probability_max[i],
      sunrise: d.daily.sunrise[i],
      sunset: d.daily.sunset[i],
      uvIndex: d.daily.uv_index_max[i],
      condition: condition(d.daily.weather_code[i]),
    })),
  };
}
export async function getAirQuality({ lat, lon }) {
  const r = await fetch(
    `${airUrl}?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=auto&forecast_days=1`,
  );
  if (!r.ok) throw new Error("Air quality provider failed");
  const d = await r.json();
  const i = 0;
  const aqi = d.hourly.us_aqi?.[i] ?? null;
  return {
    aqi,
    category:
      aqi == null
        ? "Unavailable"
        : aqi <= 50
          ? "Good"
          : aqi <= 100
            ? "Moderate"
            : aqi <= 150
              ? "Unhealthy for sensitive groups"
              : aqi <= 200
                ? "Unhealthy"
                : "Very unhealthy",
    pollutants: {
      pm25: d.hourly.pm2_5?.[i],
      pm10: d.hourly.pm10?.[i],
      o3: d.hourly.ozone?.[i],
      no2: d.hourly.nitrogen_dioxide?.[i],
    },
  };
}

export async function reverseGeocode({ lat, lon }) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Reverse geocoding requires numeric latitude and longitude');
  }
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'jsonv2', zoom: '10', addressdetails: '1' });
  const response = await fetch(url, { headers: { 'User-Agent': 'SkyCast weather app/1.0' } });
  if (!response.ok) throw new Error('Reverse geocoding failed');
  const data = await response.json();
  const address = data.address || {};
  return { name: address.city || address.town || address.village || address.municipality || address.county || 'Current location', country: address.country || '', latitude, longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}
