'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';

const TIERRA_BLANCA = { lat: 18.4557, lng: -96.3569 };
const LIBRARIES: ('marker')[] = ['marker'];

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  // Base land — matches bg-gray-50
  { elementType: 'geometry', stylers: [{ color: '#f9fafb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#374151' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },

  // Water — muted slate blue
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },

  // Parks & nature — desaturated, matches gray palette
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#f3f4f6' }] },

  // POI — minimal, subdued
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeff1' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // Highways — orange accent (brand color)
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f97316' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#ea6c0a' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#f97316' }] },

  // Arterial roads — light orange tint
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#fed7aa' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },

  // Local roads — white, clean
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },

  // Transit — minimal
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },

  // Administrative borders — soft orange
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#fdba74' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
];

type Coords = { lat: number; lng: number };

type Props = {
  value: Coords | null;
  onChange: (coords: Coords) => void;
  height?: string;
};

export function MapPinPicker({ value, onChange, height = 'calc(100svh - 200px)' }: Props) {
  const [marker, setMarker] = useState<Coords | null>(value);
  const mapRef = useRef<google.maps.Map | null>(null);
  const advMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  // Create / update the AdvancedMarkerElement when marker coords change
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
        const coords = { lat: (pos as google.maps.LatLng).lat?.() ?? (pos as google.maps.LatLngLiteral).lat, lng: (pos as google.maps.LatLng).lng?.() ?? (pos as google.maps.LatLngLiteral).lng };
        setMarker(coords);
        onChange(coords);
      });
    }
  }, [isLoaded, marker, onChange]);

  // Cleanup marker on unmount
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
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarker(coords);
    onChange(coords);
  }, [onChange]);

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
  );
}
