# Mi Música 1.2

Actualización de la PWA Mi Música 1.1. Las canciones importadas se reproducen desde IndexedDB y los cuatro vinilos de muestra de la versión anterior se identifican como demos sin audio. El proyecto se aloja como archivos estáticos.

## Probar en local

1. Extrae el ZIP y abre una terminal en la carpeta con `index.html`.
2. Con Python 3, ejecuta `python -m http.server 8000 --bind 127.0.0.1` y abre `http://127.0.0.1:8000/` en Chrome. Para instalar en otro equipo o en Android usa el origen HTTPS publicado. Abre siempre la misma dirección y puerto para recuperar tus datos de prueba.
3. En **Biblioteca → Importar música**, selecciona archivos propios. El navegador verifica cada archivo antes de incorporarlo. La compatibilidad de MP3, WAV, AAC/M4A, FLAC, Ogg/Opus y WebM depende del códec y del dispositivo. Se usan etiquetas ID3v2 compatibles en MP3 y, en su ausencia, se intenta deducir artista y título de `Artista - Título.ext`. El menú de la canción permite editar título, artista y álbum.
4. Toca el título del minirreproductor o deslízalo hacia arriba para ampliar. Desliza hacia abajo desde el encabezado o el vinilo grande para minimizar. Pulsa **Anterior** desde una posición avanzada para volver al comienzo y púlsalo otra vez para volver a la pista previa.
5. Mantén pulsado un vinilo o usa su botón de opciones para añadir a **Me gusta** y a carpetas. Desliza canciones a la derecha para ponerlas a continuación o a la izquierda para quitarlas de la cola. En el reproductor completo, mantén presionado el asidero ⠿ de una fila y arrástrala. Los botones **Subir**, **Bajar** y **Quitar de la cola** son alternativas al gesto.
6. Para comprobar el uso sin red, espera a que el service worker quede activo en las herramientas de desarrollo, importa una pista y abre nuevamente la app con la red desconectada. La biblioteca y el audio local siguen disponibles.

## Datos y copias de seguridad

- Al importar, la app crea una copia local sin tocar el archivo de origen. El identificador SHA‑256 evita duplicar el mismo archivo, aunque cambie su nombre o aparezca en varias carpetas.
- **Biblioteca → Almacenamiento y respaldo** muestra el tamaño de la música, la estimación de datos y caché y la cuota que informa el navegador. Puedes solicitar persistencia, que el navegador puede conceder o denegar.
- Exporta un archivo `.mimusica` para conservar audio, carpetas, favoritos, cola, ajustes y posición. Al restaurar, se valida el contenido del archivo, se añaden los audios ausentes y se conservan carpetas en conflicto como copias. La restauración recupera las preferencias del respaldo y los favoritos se combinan. El respaldo contiene los audios, así que guárdalo en un lugar privado.
- El audio y los datos residen en el origen web del navegador. Borrar datos del sitio, cambiar de navegador o cambiar de origen requiere restaurar un respaldo para recuperar esos datos. Al abrir normalmente, la última pista y posición se recuperan en pausa.

## Activar Google y sincronización

La entrega deja Firebase desactivado hasta que el propietario configure su proyecto. La biblioteca local funciona con esa configuración.

1. Registra una aplicación web en tu proyecto de Firebase y copia su **configuración pública de cliente** en `cloud-config.js`, sustituyendo `null`. Usa los valores que genera Firebase. Guarda las credenciales de servicio y las claves privadas fuera del repositorio.
2. En **Authentication → Sign-in method**, habilita **Google**, selecciona el correo de asistencia y añade el hostname real de GitHub Pages a **Authorized domains**, sin ruta. Añade `localhost` solo si lo necesitas para pruebas.
3. Crea una base **Cloud Firestore** en modo producción. Aplica `firestore.rules` desde la consola. Si el proyecto comparte Firestore con otras apps, integra únicamente el bloque correspondiente y verifica que ninguna regla más amplia permita acceder a `users/{uid}/miMusica/library`.
4. Incrementa la versión de caché de `sw.js` al publicar la configuración. Abre **Cuenta → Iniciar sesión con Google → Sincronizar esta biblioteca**. Si Chrome bloquea la ventana emergente en la PWA, abre el mismo enlace en una pestaña normal de Chrome e inicia sesión allí.
5. Para la validación final, usa dos dispositivos con la misma cuenta. Edita datos sin conexión y reconecta. Los cambios independientes se combinan y los cambios incompatibles aparecen en **Cuenta** para resolverlos. Usa una segunda cuenta de prueba para verificar que Firestore deniegue acceso al documento del primer UID.

La cola, las carpetas, los favoritos y los ajustes sincronizables usan una revisión común almacenada para cada cuenta. La posición, el temporizador y los archivos de audio quedan en el dispositivo. En el segundo dispositivo importa los mismos archivos para resolver las referencias de pistas locales. La sincronización está acotada a un documento por cuenta; una biblioteca de metadatos que supere su tamaño permitido sigue disponible en local y se puede respaldar.

[Google en Firebase Authentication](https://firebase.google.com/docs/auth/web/google-signin) · [Reglas de Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions) · [Transacciones de Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)

## Buscar y comparar

**Buscar** consulta el catálogo local y, si está marcada la opción en línea, Audius e iTunes Store. El país de iTunes se puede modificar. iTunes permite consultar por álbum y Audius aporta portadas cuando las devuelve; las imágenes promocionales de iTunes se reservan para una integración que cumpla sus condiciones de uso. Cada resultado abre su enlace oficial.

**Comparar** consulta el segundo catálogo con el título y artista. Un ISRC compartido identifica una coincidencia exacta. Título, artista, álbum y duración congruentes solo confirman la coincidencia de metadatos. Los cambios reconocibles de versión se indican por separado y el resto se muestra como no confirmado. Una búsqueda vacía no demuestra que la canción esté ausente. La comparación se limita a los proveedores y regiones consultados.

Spotify, Apple Music y YouTube quedan pendientes de una integración autorizada. Spotify exige autorización para su API. Apple Music API exige un token de desarrollador firmado y su gestión debe quedar fuera del cliente público. Los proveedores se pueden añadir a `catalog.js` usando el mismo modelo de metadatos y enlaces.

[API de Audius](https://docs.audius.co/api/) · [API de búsqueda de iTunes Store](https://performance-partners.apple.com/search-api) · [Búsqueda de Spotify](https://developer.spotify.com/documentation/web-api/reference/search) · [Tokens de Apple Music](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)

## Actualizar GitHub Pages sin perder los datos

1. Identifica la rama y la carpeta que publica el repositorio existente. Crea una rama o una etiqueta de respaldo a partir de la versión desplegada. Mantén disponible el ZIP de la 1.1.
2. Copia los archivos web de esta entrega a la **misma carpeta publicada**. Conserva el hostname, la ruta, el nombre del manifiesto y la ruta de `sw.js`. Las reglas de Firestore se aplican en su consola; no se necesita un servidor para servir los archivos de la PWA.
3. Confirma que los recursos nuevos responden desde la misma subruta y que el sitio conserva HTTPS. Súbelos juntos en una sola actualización. El nuevo service worker precarga los recursos y espera a que se cierren las ventanas que usan la versión anterior.
4. Cierra todas las ventanas de Mi Música y vuelve a abrir la PWA. Verifica que figure **Versión 1.2**. La app lee las carpetas y la última selección de `mi-musica-v1` y persiste la nueva estructura en `mi-musica-v2`. Conserva la clave anterior. Evita borrar datos del sitio para forzar la actualización.
5. En un Android real, abre el mismo enlace en Chrome y prueba **⋮ → Instalar y crear acceso directo → Instalar**. Si ya estaba instalada, prueba la actualización desde el ícono original. Comprueba los gestos táctiles, la reproducción sin conexión y el acceso con una cuenta de prueba si Firebase está habilitado.
6. Si necesitas volver a la 1.1, restaura la rama o los archivos anteriores y publica una versión de caché distinta. Exporta primero cualquier biblioteca 1.2 que necesites conservar. La 1.1 puede leer sus datos anteriores; las canciones importadas son una función de la 1.2 y requieren volver a usar esa versión.

[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [Instalación en Chrome para Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=es-419)

