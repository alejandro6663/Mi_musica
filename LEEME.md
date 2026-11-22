# Mi Música 1.1

Prototipo web progresivo de la biblioteca musical. Conserva las cuatro pantallas y la demo visual del reproductor. El proyecto usa HTML, CSS y JavaScript sin dependencias de ejecución.

## Probar en computador

1. Extrae el ZIP y abre una terminal en la carpeta que contiene `index.html`.
2. Con Python 3, ejecuta `python -m http.server 8000 --bind 127.0.0.1`.
3. Abre `http://127.0.0.1:8000/` en Chrome. Mantén fija la dirección y el puerto si ya tienes carpetas guardadas en ese origen.
4. Para revisar la instalación, abre **Herramientas de desarrollo → Application → Manifest** y **Service Workers**. Verifica que el manifiesto cargue y que el trabajador esté activo. Si Chrome ofrece instalar la app, usa el menú del navegador.
5. Para revisar el diseño de teléfono, activa la barra de dispositivos y prueba, por ejemplo, 360 × 800, 412 × 915 y orientación horizontal. Revisa también con la barra desactivada.
6. Después de una primera carga online y de que el trabajador quede activo, activa **Offline** en las herramientas de desarrollo y vuelve a cargar. La interfaz, el catálogo ficticio y los controles visuales se pueden abrir con la caché. Detén el servidor con Ctrl+C al terminar.

Abrir `index.html` directamente sirve para revisar la interfaz. Para probar la instalación y la caché, usa el servidor local anterior o un sitio HTTPS.

## Publicar e instalar en Android

1. Cuando autorices la publicación, elige un alojamiento estático HTTPS. Una opción gratis es **GitHub Pages** con repositorio público en GitHub Free. Copia el contenido del ZIP a la raíz de la rama `main`. En **Settings → Pages → Build and deployment** selecciona **Deploy from a branch**, `main` y `/ (root)`. Activa **Enforce HTTPS** cuando esté disponible. [Configurar Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [Configurar HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
2. En el teléfono, abre la URL HTTPS publicada en Chrome. En el menú **⋮**, busca **Instalar aplicación** o **Instalar y crear acceso directo → Instalar**. El texto depende de la versión de Chrome. [Ayuda de Chrome para Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid)
3. Abre **Mi Música** desde su ícono. Comprueba la apertura en modo independiente, crea una carpeta de prueba, recarga y confirma que siga ahí. Prueba los cuatro apartados y el reproductor, y repite con el teléfono sin conexión después de la primera carga.

Una dirección HTTP de la red local, como `http://192.168.x.x:8000`, sirve para ver la interfaz en otro dispositivo. En Android, usa HTTPS para probar la instalación desde otro equipo.

## Datos y actualizaciones

Las carpetas, el orden y la última canción elegida siguen usando la clave `mi-musica-v1`. Si actualizas en el mismo origen y perfil de navegador, la 1.1 reutiliza los datos de la 1.0. Al pasar de un archivo local o de un servidor de prueba a otra dirección HTTPS, el nuevo origen empieza con sus propios datos.

El service worker guarda solo recursos de la aplicación. El reproductor sigue siendo una demo sin audio. En futuras actualizaciones, cambia la versión de caché en `sw.js` junto con los archivos modificados. Cuando todas las ventanas de la versión anterior se cierren, el nuevo trabajador podrá activarse y retirar la caché antigua.

## Archivos

- `index.html`, `estilos.css` y `app.js` conservan la estructura del prototipo original.
- `manifest.webmanifest`, `iconos/` y `sw.js` habilitan la instalación y la caché.
- `vinilo-movil.webp` y `vinilo-escritorio.webp` son versiones optimizadas del mismo arte de la 1.0.

