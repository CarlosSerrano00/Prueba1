import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import type { UbicacionLectura } from '@/types/models';
import { Texto } from './Texto';

interface MapaLecturaProps {
  ubicacion: UbicacionLectura | null;
  interactivo?: boolean;
  onChange?: (ubicacion: UbicacionLectura) => void;
}

const MAPA_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    body { font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([-0.1807, -78.4678], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    let marker = null;
    let seleccionar = false;
    function seleccionarPunto(lat, lng) {
      if (!seleccionar) return;
      if (!marker) {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', enviarPunto);
      } else {
        marker.setLatLng([lat, lng]);
      }
      map.panTo([lat, lng]);
      enviarPunto();
    }
    function enviarPunto() {
      const punto = marker.getLatLng();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        latitud: punto.lat,
        longitud: punto.lng
      }));
    }
    window.actualizarMapa = function(lat, lng, editable) {
      seleccionar = editable;
      if (lat !== null && lng !== null) {
        if (!marker) {
          marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          marker.on('dragend', enviarPunto);
        }
        marker.setLatLng([lat, lng]);
        marker.dragging[editable ? 'enable' : 'disable']();
        map.setView([lat, lng], Math.max(map.getZoom(), 16));
      } else if (marker) {
        map.removeLayer(marker);
        marker = null;
      }
    };
    map.on('click', function(event) {
      if (seleccionar) seleccionarPunto(event.latlng.lat, event.latlng.lng);
    });
    setTimeout(function() { map.invalidateSize(); }, 100);
  </script>
</body>
</html>`;

function actualizarMapaScript(
  ubicacion: UbicacionLectura | null,
  interactivo: boolean,
): string {
  const latitud = ubicacion?.latitud ?? 'null';
  const longitud = ubicacion?.longitud ?? 'null';
  return `window.actualizarMapa(${latitud}, ${longitud}, ${interactivo}); true;`;
}

export function MapaLectura({
  ubicacion,
  interactivo = false,
  onChange,
}: MapaLecturaProps) {
  const mapaRef = useRef<WebView>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [errorMapa, setErrorMapa] = useState<string | null>(null);

  const sincronizarMapa = useCallback(() => {
    if (!mapaListo) return;
    mapaRef.current?.injectJavaScript(actualizarMapaScript(ubicacion, interactivo));
  }, [interactivo, mapaListo, ubicacion]);

  useEffect(() => {
    sincronizarMapa();
  }, [sincronizarMapa]);

  function recibirPunto(evento: WebViewMessageEvent) {
    try {
      const punto: unknown = JSON.parse(evento.nativeEvent.data);
      if (!punto || typeof punto !== 'object') throw new Error();
      const { latitud, longitud } = punto as Record<string, unknown>;
      if (
        typeof latitud !== 'number' ||
        typeof longitud !== 'number' ||
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        latitud < -90 ||
        latitud > 90 ||
        longitud < -180 ||
        longitud > 180
      ) {
        throw new Error();
      }
      onChange?.({ latitud, longitud, origen: 'manual' });
      setErrorMapa(null);
    } catch {
      setErrorMapa('No se pudo leer el punto seleccionado. Inténtalo otra vez.');
    }
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <WebView
        ref={mapaRef}
        source={{ html: MAPA_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onLoadEnd={() => {
          setMapaListo(true);
          setErrorMapa(null);
        }}
        onError={() => setErrorMapa('No se pudo cargar el mapa. Revisa tu conexión a internet.')}
        onHttpError={() => setErrorMapa('El servicio del mapa no respondió. Inténtalo más tarde.')}
        onMessage={recibirPunto}
        style={{ height: 250, backgroundColor: '#f1f5f9' }}
        accessibilityLabel={
          interactivo
            ? 'Mapa OpenStreetMap. Toca o arrastra el marcador para seleccionar la ubicación.'
            : 'Mapa OpenStreetMap con la ubicación de la lectura.'
        }
      />
      {errorMapa ? (
        <View className="absolute inset-x-2 bottom-2 rounded-xl bg-white/95 p-2">
          <Texto variante="micro" color="#9f1239">
            {errorMapa}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}
