import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import downloadArrow from '../../../assets/animations/download-arrow.json';
import error from '../../../assets/animations/error.json';
import kpiMeter from '../../../assets/animations/kpi-meter.json';
import locationPin from '../../../assets/animations/location-pin.json';
import successCheck from '../../../assets/animations/success-check.json';

export type EstadoAnimadoTipo =
  | 'cargando'
  | 'guardado'
  | 'sinConexion'
  | 'ubicacion'
  | 'kpi';

const animaciones = {
  cargando: downloadArrow,
  guardado: successCheck,
  sinConexion: error,
  ubicacion: locationPin,
  kpi: kpiMeter,
};

interface EstadoAnimadoProps {
  tipo: EstadoAnimadoTipo;
  tamano?: number;
}

export function EstadoAnimado({ tipo, tamano = 88 }: EstadoAnimadoProps) {
  const animationRef = useRef<LottieView>(null);
  const [falloCarga, setFalloCarga] = useState(false);

  if (falloCarga) {
    const icono =
      tipo === 'guardado'
        ? 'checkmark-circle'
        : tipo === 'sinConexion'
          ? 'cloud-offline'
          : tipo === 'ubicacion'
            ? 'location'
            : tipo === 'kpi'
              ? 'speedometer'
              : 'cloud-download';
    const color =
      tipo === 'guardado' ? '#16a34a' : tipo === 'sinConexion' ? '#d97706' : '#5b5bd6';

    return (
      <View
        accessible
        accessibilityLabel={tipo}
        className="items-center justify-center"
        style={{ width: tamano, height: tamano }}
      >
        <Ionicons name={icono} size={Math.min(tamano, 48)} color={color} />
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={tipo} className="items-center justify-center">
      <LottieView
        ref={animationRef}
        source={animaciones[tipo]}
        onAnimationLoaded={() => {
          if (tipo === 'guardado') {
            animationRef.current?.play(20, 30);
            return;
          }
          animationRef.current?.play();
        }}
        onAnimationFailure={(mensaje) => {
          console.error(`No se pudo cargar la animación Lottie "${tipo}":`, mensaje);
          setFalloCarga(true);
        }}
        loop
        style={{ width: tamano, height: tamano }}
      />
    </View>
  );
}
