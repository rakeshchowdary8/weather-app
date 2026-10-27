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
  try {
    const r = await fetch(
      `${geoUrl}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw new Error("Open-Meteo geocoding failed");
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
  } catch (primaryError) {
    console.warn(`Open-Meteo geocoding unavailable (${primaryError.message}); using fallback provider.`);
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({ q, format: "jsonv2", addressdetails: "1", limit: "8" });
    const response = await fetch(url, {
      headers: { "User-Agent": "SkyCast/1.0 weather dashboard" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Geocoding providers unavailable");
    const results = await response.json();
    return results.map((item) => ({
      id: `${item.lat}:${item.lon}`,
      name: item.name || item.display_name?.split(",")[0] || q,
      country: item.address?.country || "",
      admin1: item.address?.state || item.address?.county || "",
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      timezone: undefined,
    }));
  }
}
async function getOpenMeteoWeather({ lat, lon, units = "metric" }) {
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

const metSymbolCode = (symbol = "") => {
  if (symbol.includes("thunder")) return 95;
  if (symbol.includes("snow")) return symbol.includes("heavy") ? 75 : 73;
  if (symbol.includes("sleet")) return 73;
  if (symbol.includes("rain")) return symbol.includes("heavy") ? 65 : 63;
  if (symbol.includes("fog")) return 45;
  if (symbol.includes("cloudy")) return 3;
  if (symbol.includes("partlycloudy")) return 2;
  if (symbol.includes("fair")) return 1;
  return 0;
};

const celsiusToFahrenheit = (value) => value == null ? null : (value * 9) / 5 + 32;
const metersPerSecondToMph = (value) => value == null ? null : value * 2.236936;

async function getMetNoWeather({ lat, lon, units = "metric" }) {
  const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/compact");
  url.search = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  const response = await fetch(url, {
    headers: { "User-Agent": "SkyCast/1.0 weather dashboard" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Fallback weather provider returned ${response.status}`);

  const payload = await response.json();
  const series = payload.properties?.timeseries || [];
  if (!series.length) throw new Error("Fallback weather provider returned no forecast");
  const value = (item, key) => item?.data?.instant?.details?.[key];
  const symbol = (item) => item?.data?.next_1_hours?.summary?.symbol_code
    || item?.data?.next_6_hours?.summary?.symbol_code
    || item?.data?.next_12_hours?.summary?.symbol_code
    || "clearsky_day";
  const tempValue = (value) => units === "imperial" ? celsiusToFahrenheit(value) : value;
  const windValue = (value) => units === "imperial" ? metersPerSecondToMph(value) : value * 3.6;
  const asCondition = (item) => condition(metSymbolCode(symbol(item)));
  const hourly = series.slice(0, 48).map((item) => ({
    time: item.time,
    temperature: tempValue(value(item, "air_temperature")),
    feelsLike: tempValue(value(item, "air_temperature")),
    precipitationProbability: null,
    windSpeed: windValue(value(item, "wind_speed")),
    condition: asCondition(item),
  }));
  const grouped = new Map();
  series.forEach((item) => {
    const date = item.time.slice(0, 10);
    const temperature = tempValue(value(item, "air_temperature"));
    const existing = grouped.get(date) || { date, temperatures: [], item };
    existing.temperatures.push(temperature);
    grouped.set(date, existing);
  });
  const daily = [...grouped.values()].slice(0, 7).map(({ date, temperatures, item }) => ({
    date,
    min: Math.min(...temperatures),
    max: Math.max(...temperatures),
    precipitationProbability: null,
    sunrise: `${date}T06:00`,
    sunset: `${date}T18:00`,
    uvIndex: null,
    condition: asCondition(item),
  }));
  const current = series[0];
  const currentTemperature = tempValue(value(current, "air_temperature"));
  const precipitation = current?.data?.next_1_hours?.details?.precipitation_amount || 0;
  return {
    latitude: Number(lat),
    longitude: Number(lon),
    timezone: "UTC",
    units,
    fallback: true,
    current: {
      time: current.time,
      temperature_2m: currentTemperature,
      relative_humidity_2m: value(current, "relative_humidity"),
      apparent_temperature: currentTemperature,
      is_day: /day/.test(symbol(current)) ? 1 : 0,
      precipitation,
      rain: precipitation,
      showers: 0,
      snowfall: 0,
      weather_code: metSymbolCode(symbol(current)),
      cloud_cover: value(current, "cloud_area_fraction"),
      surface_pressure: value(current, "air_pressure_at_sea_level"),
      wind_speed_10m: windValue(value(current, "wind_speed")),
      wind_direction_10m: value(current, "wind_from_direction"),
      visibility: 10000,
      uv_index: null,
      condition: asCondition(current),
    },
    hourly,
    daily,
  };
}

export async function getWeather({ lat, lon, units = "metric" }) {
  try {
    return await getOpenMeteoWeather({ lat, lon, units });
  } catch (primaryError) {
    console.warn(`Open-Meteo unavailable (${primaryError.message}); using fallback provider.`);
    try {
      return await getMetNoWeather({ lat, lon, units });
    } catch (fallbackError) {
      const error = new Error(`Weather providers unavailable: ${fallbackError.message}`);
      error.status = 503;
      throw error;
    }
  }
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
