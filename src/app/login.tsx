import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alerta, Boton, CampoTexto, Card, Texto } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/ui';
import { TECNICOS_DEMO } from '@/constants/tecnicos';
import { useApp } from '@/context/AppProvider';
import { mensajeDeError } from '@/services/errors';

export default function LoginScreen() {
  const { iniciarSesion } = useApp();
  const insets = useSafeAreaInsets();
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar() {
    Keyboard.dismiss();
    setError(null);
    setCargando(true);
    try {
      await iniciarSesion(codigo, clave);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    } finally {
      setCargando(false);
    }
  }

  function usarDemo(indice: number) {
    const tecnico = TECNICOS_DEMO[indice];
    if (!tecnico) return;
    setCodigo(tecnico.codigo);
    setClave(tecnico.clave);
    setError(null);
  }

  return (
    <View style={estilos.pantalla}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[estilos.contenido, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[estilos.hero, { paddingTop: insets.top + spacing.xl }]}>
            <View style={estilos.circulo1} />
            <View style={estilos.circulo2} />
            <View style={estilos.circulo3} />

            <View style={estilos.marcaFila}>
              <View style={estilos.logo}>
                <Ionicons name="water" size={28} color={colors.accentDark} />
              </View>
              <View>
                <Texto variante="titulo" color={colors.white}>
                  AquaRuta
                </Texto>
                <Texto variante="caption" color={colors.textOnBrandMuted}>
                  Lecturas de agua en campo
                </Texto>
              </View>
            </View>

            <View style={estilos.heroTexto}>
              <Texto variante="display" color={colors.white} style={estilos.heroTitulo}>
                Tu jornada, incluso sin señal.
              </Texto>
              <Texto variante="cuerpo" color={colors.textOnBrandMuted}>
                Registra la lectura, guarda la foto y envía cuando vuelva la conexión.
              </Texto>
            </View>

            <View style={estilos.sello}>
              <Ionicons name="shield-checkmark-outline" size={15} color={colors.textOnBrandMuted} />
              <Texto variante="micro" color={colors.textOnBrandMuted}>
                EPMAPS · Distrito Metropolitano de Quito
              </Texto>
            </View>
          </View>

          <View style={estilos.panel}>
            <Card estilo={estilos.tarjetaLogin}>
              <View style={estilos.tarjetaCabecera}>
                <View>
                  <Texto variante="encabezado">Iniciar jornada</Texto>
                  <Texto variante="caption" color={colors.textMuted}>
                    Identifícate con tu código de empleado.
                  </Texto>
                </View>
                <View style={estilos.iconoJornada}>
                  <Ionicons name="sunny-outline" size={22} color={colors.accentDark} />
                </View>
              </View>

              {error ? (
                <Alerta tono="peligro" titulo="No se pudo iniciar sesión">
                  {error}
                </Alerta>
              ) : null}

              <CampoTexto
                etiqueta="Código de empleado"
                valor={codigo}
                onChangeText={setCodigo}
                placeholder="TEC-001"
                icono="id-card-outline"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                maxLength={20}
                testID="login-codigo"
              />

              <CampoTexto
                etiqueta="Clave"
                valor={clave}
                onChangeText={setClave}
                placeholder="Tu clave de campo"
                icono="lock-closed-outline"
                seguro
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                testID="login-clave"
              />

              <Boton
                titulo="Ingresar a la jornada"
                onPress={() => void ingresar()}
                icono="log-in-outline"
                cargando={cargando}
                deshabilitado={codigo.trim().length === 0 || clave.length === 0}
              />

              <View style={estilos.nota}>
                <Ionicons name="phone-portrait-outline" size={15} color={colors.textMuted} />
                <Texto variante="micro" color={colors.textMuted} style={estilos.notaTexto}>
                  La sesión queda guardada en este teléfono hasta que cierres sesión.
                </Texto>
              </View>
            </Card>

            <View style={estilos.demo}>
              <View style={estilos.demoCabecera}>
                <Texto variante="etiqueta" color={colors.textMuted}>
                  Credenciales de demostración
                </Texto>
                <Texto variante="micro" color={colors.textSoft}>
                  Toca un técnico para completar
                </Texto>
              </View>

              {TECNICOS_DEMO.map((tecnico, indice) => (
                <Pressable
                  key={tecnico.codigo}
                  onPress={() => usarDemo(indice)}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar credenciales de ${tecnico.nombre}`}
                  style={({ pressed }) => [estilos.demoFila, pressed && estilos.demoPresionada]}
                >
                  <View style={estilos.demoAvatar}>
                    <Texto variante="micro" peso="bold" color={colors.accentDark}>
                      {tecnico.nombre
                        .split(' ')
                        .map((parte) => parte[0])
                        .slice(0, 2)
                        .join('')}
                    </Texto>
                  </View>
                  <View style={estilos.demoTextos}>
                    <Texto variante="cuerpoFuerte">{tecnico.nombre}</Texto>
                    <Texto variante="micro" color={colors.textMuted}>
                      {tecnico.codigo} · {tecnico.zona} · clave {tecnico.clave}
                    </Texto>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.accent} />
                </Pressable>
              ))}
            </View>

            <Texto variante="micro" color={colors.textSoft} centrado style={estilos.pie}>
              ESFOT · Escuela Politécnica Nacional · Prueba técnica 2026
            </Texto>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  contenido: {
    flexGrow: 1,
  },
  hero: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge + spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    gap: spacing.xxl,
  },
  circulo1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    right: -80,
    top: -40,
  },
  circulo2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(14,116,144,0.28)',
    right: 26,
    top: 40,
  },
  circulo3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    left: -30,
    bottom: 24,
  },
  marcaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  heroTexto: {
    gap: spacing.sm,
    maxWidth: 420,
  },
  heroTitulo: {
    fontSize: 34,
    lineHeight: 39,
  },
  sello: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  panel: {
    marginTop: -spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tarjetaLogin: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  tarjetaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  iconoJornada: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nota: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  notaTexto: {
    flex: 1,
  },
  demo: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  demoCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  demoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  demoPresionada: {
    backgroundColor: colors.accentSoft,
  },
  demoAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTextos: {
    flex: 1,
    gap: 1,
  },
  pie: {
    paddingBottom: spacing.sm,
  },
});
