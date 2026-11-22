# Verificación de Mi Música 1.2

Las pruebas de navegador se realizaron en Chromium de escritorio, con un servidor en localhost y la PWA alojada bajo una subruta. Para las pruebas de interfaz móvil se emularon anchos de 360 y 390 píxeles.

| Fase | Pruebas realizadas |
| --- | --- |
| Audio y almacenamiento | Importación y reproducción de dos WAV de 12 s y un MP3 sintético de 4 s. Lectura de título, artista y álbum ID3v2. Reimportación del mismo WAV y detección de duplicado. Consulta de almacenamiento, exportación y restauración de un respaldo de prueba con audio y carpeta. |
| Reproductor y biblioteca | Pausa, avance al siguiente, control de posición y comportamiento en dos pulsaciones de Anterior. Menú de opciones, almacenamiento de favoritos, envío de una pista a continuación, selección de repetición, aleatorio y programación del temporizador. Apertura y cierre del reproductor y envío a la cola por deslizamiento en vista móvil. |
| Cuenta y sincronización | Vista local con Firebase desactivado. Pruebas automatizadas de fusión de cambios independientes, conflictos de edición, borrado contra edición y elección explícita de precedencia. |
| Catálogos | Consulta real de Audius e iTunes Store y comparación de un resultado con enlaces oficiales. Pruebas automatizadas para ISRC, coincidencia por metadatos, versiones alternativas y resultados no confirmados. |
| Migración y desconexión | Actualización de una 1.1 original a la 1.2 en la misma URL. Se conservaron una carpeta, su canción y el orden por fecha. Tras restaurar un respaldo y detener el servidor, la app abrió en pausa en 0:04, avanzó con audio al reproducir y permitió buscar en la biblioteca local. Se verificaron los recursos relativos, el manifiesto y la sintaxis de JavaScript. |

## Verificaciones pendientes del propietario

- En un Android físico, probar instalación o actualización desde el ícono, gestos táctiles y funcionamiento en modo avión.
- Con un proyecto Firebase configurado, verificar inicio de sesión, reconexión de dos dispositivos y aislamiento por UID en Firestore. Las reglas y el cliente se entregan; la prueba con cuentas reales sigue pendiente.

