# Pruebas de Mi Música 1.3

| Prueba | Resultado |
| --- | --- |
| Recuperación de una biblioteca anterior | En Chromium se inició con dos claves de prueba. «Motivación» estaba solo en `mi-musica-v1`; la biblioteca activa contenía otra carpeta. Se recuperó «Motivación» con su canción y la carpeta actual siguió visible tras recargar. La prueba automatizada también verificó la copia en caso de ID en conflicto y la ausencia de duplicados al repetir la recuperación. |
| Búsqueda externa | Se obtuvieron resultados reales de Audius e iTunes Store. Los resultados de iTunes mostraron enlaces y las pistas aptas de Audius mostraron el botón de reproducción. |
| Audio en línea | Se reprodujo una pista pública de Audius y se comprobó que avanzó el tiempo real de audio. El reproductor completo mostró su origen y permitió volver a la cola local. Las pruebas automatizadas cubrieron acceso completo, vista previa informada y pistas con acceso no autorizado. |
| Reproducción sin conexión | Se importó un WAV de 12 segundos. Con el servidor detenido, la PWA volvió a abrir y reprodujo el WAV desde IndexedDB. El audio continuó al cambiar de pantalla. |
| Adaptación y volumen | Se revisaron los controles a 1280 píxeles en escritorio y a 360 y 390 píxeles en pantallas móviles emuladas. Se cambió el volumen y se comprobó que el valor se recuperó al volver a abrir el reproductor. |
| Media Session | Prueba automatizada de registro de acciones, metadatos, estado y posición mediante una sesión de prueba. |
| Spotify | La interfaz sin credenciales mostró el campo y el aviso de configuración, con el botón de importación inactivo. El logotipo oficial cargó desde el paquete. Pruebas automatizadas de PKCE/S256, rechazo por `state` incorrecto, limpieza del retorno OAuth, estilos de respuesta actual y anterior, paginación, rechazo de destinos ajenos, omisión de entradas no compatibles y control de acceso 403. |
| Entrega estática | Se verificaron la sintaxis JavaScript, los recursos HTTP y las rutas bajo un subdirectorio. |

**Pendiente en dispositivos y cuentas reales**. Completar OAuth y una importación real con una aplicación registrada de Spotify, probar las portadas en una playlist autorizada y comprobar Android físico, Bluetooth y los controles de bloqueo del sistema. La comprobación de «Motivación» usó datos ficticios; no se inspeccionó el almacenamiento de la versión publicada.

