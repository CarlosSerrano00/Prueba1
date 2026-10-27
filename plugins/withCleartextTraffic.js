const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Config plugin local para permitir HTTP sin cifrar hacia el servidor de
 * simulación o un MockAPI local. No se instala ninguna dependencia nueva:
 * el paquete `expo` ya exporta `expo/config-plugins`.
 *
 * Android 9+ bloquea el tráfico HTTP por defecto. La app lo necesita porque
 * la URL de la oficina se configura en tiempo de ejecución y la demostración
 * usa la IP LAN de una computadora. En producción con HTTPS este plugin
 * debería eliminarse.
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (configConManifiesto) => {
    const aplicacion = configConManifiesto.modResults.manifest.application?.[0];
    if (aplicacion) {
      aplicacion.$['android:usesCleartextTraffic'] = 'true';
    }
    return configConManifiesto;
  });
};
