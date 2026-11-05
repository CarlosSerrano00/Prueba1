import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { EstadoAnimadoTipo } from './EstadoAnimado';

interface EstadoAnimadoProps {
  tipo: EstadoAnimadoTipo;
  tamano?: number;
}

export function EstadoAnimado({ tipo, tamano = 40 }: EstadoAnimadoProps) {
  const [progreso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (tipo === 'cargando') return;

    const secuencia = Animated.sequence([
      Animated.timing(progreso, {
        toValue: 1,
        duration: tipo === 'guardado' ? 650 : 900,
        useNativeDriver: false,
      }),
      Animated.timing(progreso, {
        toValue: 0,
        duration: tipo === 'guardado' ? 650 : 900,
        useNativeDriver: false,
      }),
    ]);
    const animacion = Animated.loop(secuencia);
    animacion.start();

    return () => animacion.stop();
  }, [progreso, tipo]);

  if (tipo === 'cargando') {
    return (
      <View accessible accessibilityLabel={tipo} className="items-center justify-center">
        <ActivityIndicator size="large" color="#5b5bd6" />
        <View style={{ width: 0, height: tamano }} />
      </View>
    );
  }

  const esGuardado = tipo === 'guardado';
  const esSinConexion = tipo === 'sinConexion';
  const escala = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: esGuardado ? [0.85, 1.12] : [0.94, 1.06],
  });
  const opacidad = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });
  const color = esGuardado ? '#16a34a' : esSinConexion ? '#d97706' : '#5b5bd6';
  const icono =
    tipo === 'guardado'
      ? 'checkmark-circle'
      : tipo === 'sinConexion'
        ? 'cloud-offline'
        : tipo === 'ubicacion'
          ? 'location'
          : 'speedometer';

  return (
    <Animated.View
      accessible
      accessibilityLabel={tipo}
      className="items-center justify-center"
      style={{
        width: tamano,
        height: tamano,
        opacity: opacidad,
        transform: [{ scale: escala }],
      }}
    >
      <Ionicons name={icono} size={Math.min(tamano, 48)} color={color} />
    </Animated.View>
  );
}
