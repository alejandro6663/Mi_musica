# Mi Música 1.3 · Versión de prueba

La 1.3 parte de la 1.2 y conserva la biblioteca local, los favoritos, las carpetas, el reproductor con vinilos y las preferencias existentes. Los enlaces de Spotify se importan en una vista específica de playlists. Buscar mantiene los catálogos existentes y añade reproducción dentro de Mi Música para las pistas autorizadas por Audius.

## Probar sin tocar la versión publicada

1. Extrae el ZIP. Abre una terminal en la carpeta que contiene `index.html`.
2. Con Python 3, ejecuta `python -m http.server 8000 --bind 127.0.0.1`.
3. En Chrome abre `http://127.0.0.1:8000/`. Para simular un teléfono, usa la barra de dispositivos de las herramientas de desarrollo.
4. Para instalar o probar OAuth en un Android real, usa un entorno de pruebas HTTPS bajo tu control y su propia URL de retorno. `127.0.0.1` en el teléfono se refiere al propio teléfono.
5. Tras la primera carga y activación del service worker, importa una pista local, desactiva la red y vuelve a abrir la aplicación. El audio local se lee desde IndexedDB.

## Spotify y permisos

1. Registra o selecciona una aplicación en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) y habilita **Web API**. En modo de desarrollo, el titular debe mantener Spotify Premium activo y autorizar las cuentas de prueba. Spotify indica un máximo de cinco usuarios para aplicaciones nuevas en ese modo.
2. En `spotify-config.js`, reemplaza el valor vacío por el **Client ID público**. PKCE usa un verificador aleatorio y un desafío S256. Las credenciales de sesión se guardan en `sessionStorage` y quedan fuera del código, los respaldos y Firebase. Mantén cualquier Client Secret, clave privada o token fuera del repositorio y del navegador.
3. Añade en Redirect URIs la URL exacta de la carpeta donde se sirve la app. Para la prueba anterior usa `http://127.0.0.1:8000/`. En un subdirectorio usa, por ejemplo, `https://tu-dominio-de-prueba.example/mi-musica/`. Incluye la barra final. Spotify exige HTTPS salvo direcciones loopback explícitas, y rechaza el alias `localhost`. Tras editar `spotify-config.js`, cambia la versión de caché en `sw.js` para que un cliente con una instalación previa lea la configuración nueva.
4. Abre **Biblioteca → Importar playlist de Spotify**. Pega el enlace completo de `open.spotify.com` o una URI `spotify:playlist:…`. Autoriza lectura de playlists privadas y colaborativas y la identificación de la cuenta. Vuelve a la misma pestaña donde se inició el flujo.
5. Prueba primero una playlist propia y luego una colaborativa o ajena. En desarrollo, Spotify limita el contenido de playlists a las que la cuenta posee o en las que colabora. El servidor puede responder 403 o 404 para otras listas. Las pistas locales de Spotify, entradas eliminadas y episodios se omiten. La importación conserva el orden y las repeticiones del listado.

Títulos, artistas, álbumes, duración, enlaces y portadas provienen de la API de Spotify. Las portadas conservan su encuadre y van acompañadas del logotipo y un enlace oficial. La copia local de metadatos dura hasta 24 horas y se vuelve a consultar con **Importar y actualizar**. Las copias de la cuenta se retiran del dispositivo al desconectar. La revocación global del acceso se gestiona desde la cuenta de Spotify.

**La reproducción de Spotify se abre en Spotify.** El Web Playback SDK requiere que la cuenta que escucha tenga Spotify Premium y que el uso cumpla las condiciones de Spotify. Esta versión mantiene su importador de metadatos separado del catálogo y el reproductor de Audius. La API puede indicar una vista previa de Spotify, pero su disponibilidad depende del catálogo. Esta versión utiliza el enlace oficial para escucharla.

[Guía de restricciones de desarrollo](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) · [Flujo PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) · [URI de retorno](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) · [Política de Spotify](https://developer.spotify.com/policy) · [Atribución y logotipos](https://developer.spotify.com/documentation/design) · [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started)

## Buscar y reproducir

- En **Buscar**, escribe el título, el artista o ambos. La búsqueda local funciona sin red. Los catálogos externos son Audius e iTunes Store. **Comparar** mantiene la distinción entre grabación confirmada por ISRC, coincidencia de metadatos, versiones alternativas y resultados no confirmados.
- **Canción encontrada** indica que hay un enlace oficial. **Vista previa disponible** aparece para una muestra que entrega la API de Audius. **Reproducción completa disponible** se muestra cuando Audius indica que la pista es pública, está disponible, se puede transmitir y carece de restricciones de acceso. Con esos permisos puedes reproducirla o agregarla a la cola en línea. Si la transmisión falla, queda el enlace a Audius.
- El reproductor completo incluye volumen, progreso, anterior, pausa y siguiente. Durante una reproducción de Audius aparece **Volver a mi cola local**. La transición conserva la selección y la posición local en pausa. El audio de Audius requiere conexión y se transmite por su integración oficial.
- La salida de audio la selecciona el sistema. Para usar Bluetooth, conecta el dispositivo y selecciónalo en Windows o Android. Si el sistema controla el volumen, usa también sus botones físicos. En navegadores compatibles, Media Session anuncia el título y habilita los controles multimedia del sistema. Si Chrome bloquea el inicio automático, pulsa **Reproducir**.

[API oficial de Audius](https://docs.audius.co/api/) · [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)

## Recuperar «Motivación»

En la 1.2, cuando existía una biblioteca bajo `mi-musica-v2`, la app cargaba esa biblioteca y dejaba de consultar `mi-musica-v1`. Si «Motivación» existía solo en la última copia 1.1, podía quedar fuera de la vista. También pueden existir bibliotecas diferentes según el origen, el perfil del navegador o el dispositivo. La causa en tus datos reales requiere revisar el origen donde se creó la carpeta o un respaldo de ese origen.

1. Haz primero un respaldo de tu biblioteca actual mediante **Biblioteca → Almacenamiento y respaldo → Exportar respaldo**.
2. Si la 1.3 puede acceder a los datos del origen antiguo, abre **Recuperar carpetas antiguas**. Busca «Motivación», márcala y pulsa **Recuperar selección**. La herramienta examina la biblioteca anterior y las copias locales de sincronización disponibles. Si una carpeta comparte ID con otra que tiene cambios distintos, se conserva como copia.
3. Si la 1.3 está en otro origen de pruebas, restaura un respaldo `.mimusica`. Si la 1.1 sigue accesible en Chrome en el dispositivo original, puedes copiar el valor de `mi-musica-v1` desde **DevTools → Application → Local Storage → origen original** a un archivo `.json` e importarlo en **Restaurar respaldo**. El archivo JSON permite recuperar carpetas.
4. La 1.3 mantiene `mi-musica-v2` como biblioteca activa y conserva `mi-musica-v1`. El respaldo `.mimusica` incluye audio local y preferencias; conserva las carpetas locales y crea copias al detectar colisiones. Los archivos de música originales quedan en su ubicación.

## Actualizar más adelante

Conserva el ZIP de la 1.2 y respalda el repositorio desplegado antes de publicar. Mantén el mismo hostname, ruta, manifiesto y archivo del service worker para conservar instalación y datos. Conserva el `cloud-config.js` de producción si ya configuraste Firebase. Despliega los archivos juntos y cierra las ventanas anteriores para que se active la caché nueva. Comprueba primero la recuperación y las funciones en un origen de prueba. La entrega deja GitHub Pages y la versión 1.2 publicada intactos.

