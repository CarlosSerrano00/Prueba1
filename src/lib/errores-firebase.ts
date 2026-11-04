const MENSAJES: Record<string, string> = {
  'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
  'auth/invalid-login-credentials': 'El correo o la contraseña no son correctos.',
  'auth/wrong-password': 'El correo o la contraseña no son correctos.',
  'auth/user-not-found': 'El correo o la contraseña no son correctos.',
  'auth/invalid-email': 'Ingresa un correo electrónico válido.',
  'auth/missing-email': 'Ingresa tu correo electrónico.',
  'auth/missing-password': 'Ingresa tu contraseña.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo electrónico.',
  'auth/weak-password': 'La contraseña debe tener al menos ocho caracteres.',
  'auth/too-many-requests': 'Hubo demasiados intentos. Espera un momento y vuelve a intentarlo.',
  'auth/network-request-failed': 'No hay conexión. Revisa tu internet e inténtalo nuevamente.',
  'auth/requires-recent-login': 'Por seguridad, cierra sesión e inicia nuevamente antes de cambiar la contraseña.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Contacta al administrador.',
  'auth/operation-not-allowed': 'El acceso con correo y contraseña no está habilitado en Firebase.',
  'auth/invalid-api-key': 'La configuración de Firebase no es válida.',
  'auth/unauthorized-continue-uri': 'Firebase no permite el enlace de verificación configurado.',
  'auth/expired-action-code': 'El enlace de verificación venció. Solicita uno nuevo.',
  'auth/invalid-action-code': 'El enlace de verificación no es válido o ya fue utilizado.',
};

export function mensajeErrorFirebase(
  error: unknown,
  mensajeAlternativo = 'No se pudo completar la operación. Inténtalo nuevamente.',
): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const codigo = (error as { code?: unknown }).code;
    if (typeof codigo === 'string') return MENSAJES[codigo] ?? mensajeAlternativo;
  }
  return error instanceof Error ? error.message : mensajeAlternativo;
}

export function crearErrorConfiguracionFirebase(): Error {
  return new Error(
    'Configura las variables EXPO_PUBLIC_FIREBASE_* en .env.local para usar la autenticación.',
  );
}
