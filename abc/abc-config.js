"use strict";

// Configuración pública de ABC – Abastecimiento.
// Todo lo que pongas aquí queda visible en la web publicada: no escribas contraseñas ni claves privadas.
globalThis.abcConfig = {
  // UID de tu cuenta de Google en Firebase (Firebase → Authentication → Users → User UID).
  // Mientras esté vacío, o mientras cloud-config.js siga en null, ABC funciona en «modo configuración»
  // y la portada se muestra completa en cualquier dispositivo.
  adminUid: "",

  // Datos del responsable del tratamiento (Ley 1581 de 2012). Rellénalos y sube la versión de caché en sw.js.
  responsable: {
    nombre: "",
    documento: "", // NIT o cédula
    correo: "",
    telefono: "",
    direccion: ""
  },

  // Tiendas que se pueden abrir con un enlace directo: #tienda/<clave>
  tiendas: {
    ferreteria: { nombre: "Ferretería", descripcion: "Herramientas, materiales y suministros." }
  }
};
