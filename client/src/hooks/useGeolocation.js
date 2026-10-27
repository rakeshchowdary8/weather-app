import { useState } from 'react';

export function useGeolocation() {
  const [state, setState] = useState({ loading: false, error: null, coords: null });
  const getLocation = () => {
    if (!navigator.geolocation) { setState({ loading: false, error: 'Geolocation is not supported by this browser.', coords: null }); return; }
    setState({ loading: true, error: null, coords: null });
    navigator.geolocation.getCurrentPosition(
      (position) => setState({ loading: false, error: null, coords: { latitude: position.coords.latitude, longitude: position.coords.longitude } }),
      (error) => setState({ loading: false, error: error.message || 'Unable to get your location.', coords: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };
  return { ...state, getLocation };
}
