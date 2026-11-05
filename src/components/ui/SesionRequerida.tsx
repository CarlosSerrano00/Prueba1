import { useRouter } from 'expo-router';

import { Alerta } from './Alerta';
import { AppHeader } from './AppHeader';
import { AppScreen } from './AppScreen';
import { Boton } from './Boton';

export function SesionRequerida() {
  const router = useRouter();

  return (
    <AppScreen>
      <AppHeader marca titulo="Completa tu perfil técnico" />
      <Alerta tono="advertencia" titulo="No se encontró la jornada activa">
        Tu cuenta de Firebase está abierta, pero falta asociarla con un código de técnico para
        mostrar tus lecturas y datos de campo.
      </Alerta>
      <Boton
        titulo="Continuar configuración"
        onPress={() => router.replace('/codigo-tecnico')}
        icono="person-add-outline"
      />
    </AppScreen>
  );
}
