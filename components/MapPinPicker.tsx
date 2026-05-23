'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';

const TIERRA_BLANCA = { lat: 18.4557, lng: -96.3569 };
const LIBRARIES: ('marker')[] = ['marker'];

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f9fafb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#374151' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#f3f4f6' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeff1' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f97316' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#ea6c0a' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#f97316' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#fed7aa' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#fdba74' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
];

type Coords = { lat: number; lng: number };

type GeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

type Props = {
  value: Coords | null;
  onChange: (coords: Coords) => void;
  height?: string;
  /** Request GPS on mount and place pin at user location */
  autoLocate?: boolean;
};

export function MapPinPicker({
  value,
  onChange,
  height = 'calc(100svh - 200px)',
  autoLocate = true,
}: Props) {
  const [marker, setMarker] = useState<Coords | null>(value);
  const [geoStatus, setGeoStatus] = useState<GeolocationStatus>('idle');
  const mapRef = useRef<google.maps.Map | null>(null);
  const advMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const hasAutoLocatedRef = useRef(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const centerMapOn = useCallback((coords: Coords, zoom = 17) => {
    mapRef.current?.panTo(coords);
    mapRef.current?.setZoom(zoom);
  }, []);

  const setPin = useCallback((coords: Coords, pan = true) => {
    setMarker(coords);
    onChange(coords);
    if (pan) centerMapOn(coords);
  }, [onChange, centerMapOn]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    setGeoStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPin(coords);
        setGeoStatus('granted');
      },
      (err) => {
        setGeoStatus(err.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [setPin]);

  useEffect(() => {
    if (!autoLocate || value || hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;
    requestLocation();
  }, [autoLocate, value, requestLocation]);

  useEffect(() => {
    if (value) setMarker(value);
  }, [value]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !marker) return;

    if (advMarkerRef.current) {
      advMarkerRef.current.position = marker;
    } else {
      advMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: marker,
        gmpDraggable: true,
      });
      advMarkerRef.current.addListener('dragend', () => {
        const pos = advMarkerRef.current?.position;
        if (!pos) return;
        const coords = {
          lat: (pos as google.maps.LatLng).lat?.() ?? (pos as google.maps.LatLngLiteral).lat,
          lng: (pos as google.maps.LatLng).lng?.() ?? (pos as google.maps.LatLngLiteral).lng,
        };
        setMarker(coords);
        onChange(coords);
      });
    }
  }, [isLoaded, marker, onChange]);

  useEffect(() => {
    return () => {
      if (advMarkerRef.current) {
        advMarkerRef.current.map = null;
        advMarkerRef.current = null;
      }
    };
  }, []);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (marker) centerMapOn(marker, marker ? 17 : 14);
  }, [marker, centerMapOn]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setPin({ lat: e.latLng.lat(), lng: e.latLng.lng() }, false);
  }, [setPin]);

  if (!isLoaded) {
    return (
      <div
        className="w-full rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-sm text-gray-400">Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height, borderRadius: '16px' }}
        center={marker ?? TIERRA_BLANCA}
        zoom={14}
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControlOptions: { position: 7 },
          styles: MAP_STYLES,
          mapId: 'DEMO_MAP_ID',
        }}
      />

      <button
        type="button"
        onClick={requestLocation}
        disabled={geoStatus === 'requesting'}
        className="absolute bottom-4 right-4 flex items-center gap-2 bg-white border border-gray-200 shadow-md rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-all disabled:opacity-60"
      >
        {geoStatus === 'requesting' ? (
          <>
            <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Ubicando...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Mi ubicación
          </>
        )}
      </button>

      {geoStatus === 'denied' && (
        <div className="absolute top-3 left-3 right-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-xl px-3 py-2 shadow-sm">
          Activa el permiso de ubicación en tu navegador, o toca el mapa para colocar el pin manualmente.
        </div>
      )}

      {geoStatus === 'unavailable' && !marker && (
        <div className="absolute top-3 left-3 right-3 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl px-3 py-2 shadow-sm">
          No pudimos obtener tu ubicación. Toca el mapa para colocar el pin.
        </div>
      )}
    </div>
  );
}
