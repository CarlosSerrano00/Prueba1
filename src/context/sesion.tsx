import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { auth, firebaseConfigurado } from '@/config/firebase';
import { crearErrorConfiguracionFirebase, mensajeErrorFirebase } from '@/lib/errores-firebase';

interface SesionContextValue {
  usuario: User | null;
  nombre: string;
  cargando: boolean;
  errorAutenticacion: string | null;
  versionUsuario: number;
  firebaseConfigurado: boolean;
  iniciarSesion: (correo: string, clave: string) => Promise<void>;
  registrarse: (nombre: string, correo: string, clave: string) => Promise<void>;
  enviarCorreoRecuperacion: (correo: string) => Promise<void>;
  cambiarClave: (actual: string, nueva: string) => Promise<void>;
  actualizarNombre: (nombre: string) => Promise<void>;
  reenviarVerificacion: () => Promise<void>;
  comprobarVerificacion: () => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
}

const SesionContext = createContext<SesionContextValue | null>(null);

function comprobarConfiguracion() {
  if (!firebaseConfigurado) throw crearErrorConfiguracionFirebase();
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorAutenticacion, setErrorAutenticacion] = useState<string | null>(null);
  const [versionPerfil, setVersionPerfil] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (actual) => {
        setUsuario(actual);
        setCargando(false);
      },
      (error) => {
        setErrorAutenticacion(
          mensajeErrorFirebase(error, 'No se pudo restaurar la sesión de Firebase.'),
        );
        setCargando(false);
      },
    );
  }, []);

  const iniciarSesion = useCallback(async (correo: string, clave: string) => {
    comprobarConfiguracion();
    auth.languageCode = 'es';
    await signInWithEmailAndPassword(auth, correo.trim(), clave);
  }, []);

  const registrarse = useCallback(async (nombre: string, correo: string, clave: string) => {
    comprobarConfiguracion();
    auth.languageCode = 'es';
    const credencial = await createUserWithEmailAndPassword(auth, correo.trim(), clave);
    await updateProfile(credencial.user, { displayName: nombre.trim() });
    setUsuario(credencial.user);
    setVersionPerfil((version) => version + 1);
    await sendEmailVerification(credencial.user);
  }, []);

  const enviarCorreoRecuperacion = useCallback(async (correo: string) => {
    comprobarConfiguracion();
    auth.languageCode = 'es';
    await sendPasswordResetEmail(auth, correo.trim());
  }, []);

  const cambiarClave = useCallback(async (actual: string, nueva: string) => {
    comprobarConfiguracion();
    const actualUsuario = auth.currentUser;
    if (!actualUsuario?.email) throw new Error('Inicia sesión para cambiar tu contraseña.');
    const credencial = EmailAuthProvider.credential(actualUsuario.email, actual);
    await reauthenticateWithCredential(actualUsuario, credencial);
    await updatePassword(actualUsuario, nueva);
  }, []);

  const actualizarNombre = useCallback(async (nombre: string) => {
    comprobarConfiguracion();
    const actual = auth.currentUser;
    if (!actual) throw new Error('Inicia sesión para editar tu perfil.');
    await updateProfile(actual, { displayName: nombre.trim() });
    setUsuario(actual);
    setVersionPerfil((version) => version + 1);
  }, []);

  const reenviarVerificacion = useCallback(async () => {
    comprobarConfiguracion();
    const actual = auth.currentUser;
    if (!actual) throw new Error('Inicia sesión para verificar tu correo.');
    auth.languageCode = 'es';
    await sendEmailVerification(actual);
  }, []);

  const comprobarVerificacion = useCallback(async () => {
    comprobarConfiguracion();
    const actual = auth.currentUser;
    if (!actual) return false;
    await reload(actual);
    const actualizado = auth.currentUser;
    setUsuario(actualizado);
    setVersionPerfil((version) => version + 1);
    return actualizado?.emailVerified ?? false;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await signOut(auth);
  }, []);

  const valor = useMemo<SesionContextValue>(
    () => ({
      usuario,
      nombre: usuario?.displayName?.trim() || 'Técnico',
      cargando,
      errorAutenticacion,
      versionUsuario: versionPerfil,
      firebaseConfigurado,
      iniciarSesion,
      registrarse,
      enviarCorreoRecuperacion,
      cambiarClave,
      actualizarNombre,
      reenviarVerificacion,
      comprobarVerificacion,
      cerrarSesion,
    }),
    [
      cambiarClave,
      cerrarSesion,
      cargando,
      comprobarVerificacion,
      errorAutenticacion,
      enviarCorreoRecuperacion,
      iniciarSesion,
      actualizarNombre,
      versionPerfil,
      reenviarVerificacion,
      registrarse,
      usuario,
    ],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider.');
  return contexto;
}
