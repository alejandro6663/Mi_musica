"use strict";

// Sección Legal (base). TEXTO PROVISIONAL: debe revisarlo un abogado antes de usarlo con clientes reales.
const abcLegal = (() => {
  const draftKey = "abc-legal-responsable";
  const fields = [
    ["nombre", "Nombre o razón social", "text", "organization"],
    ["documento", "NIT o cédula", "text", "off"],
    ["correo", "Correo de contacto", "email", "email"],
    ["telefono", "Teléfono", "tel", "tel"],
    ["direccion", "Dirección", "text", "street-address"]
  ];
  const pages = {
    datos: "Política de tratamiento de datos personales",
    privacidad: "Aviso de privacidad",
    terminos: "Términos y condiciones"
  };
  const esc = (text) => abcShell.escape(text);

  function draft() {
    try { return JSON.parse(localStorage.getItem(draftKey)) ?? {}; } catch { return {}; }
  }

  // Datos del responsable: los publicados (abc-config.js) y, solo para el administrador, el borrador local encima.
  function responsable(context) {
    const published = context.config?.responsable ?? {};
    const local = context.access?.admin && !context.client ? draft() : {};
    const value = {};
    for (const [key, label] of fields) value[key] = (local[key] || published[key] || "").trim()
      || "[" + label + "]";
    return value;
  }

  function banner() {
    return '<p class="abc-draft" role="note"><strong>BORRADOR</strong> Texto provisional pendiente de revisión jurídica. No tiene validez hasta completarse y aprobarse.</p>';
  }

  function datos(r) {
    return '<h2>1. Responsable del tratamiento</h2>'
      + '<p><strong>' + esc(r.nombre) + '</strong>, identificado con NIT o cédula ' + esc(r.documento) + ', con domicilio en ' + esc(r.direccion)
      + ', correo ' + esc(r.correo) + ' y teléfono ' + esc(r.telefono) + '.</p>'
      + '<h2>2. Marco legal</h2><p>Esta política se expide en cumplimiento de la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto Único 1074 de 2015) y las demás normas que los modifiquen o complementen.</p>'
      + '<h2>3. Datos que se recolectan</h2><p>Nombre, documento de identidad, datos de contacto (teléfono, correo y dirección) y la información de los pedidos o consultas que el titular entregue voluntariamente. No se solicitan datos sensibles ni datos de niñas, niños o adolescentes.</p>'
      + '<h2>4. Finalidades</h2><ul><li>Atender cotizaciones, pedidos, entregas y garantías.</li><li>Comunicarse con el titular sobre sus solicitudes.</li><li>Cumplir obligaciones contables, tributarias y legales.</li><li>Enviar información comercial, solo si el titular lo autoriza de forma expresa.</li></ul>'
      + '<h2>5. Derechos del titular</h2><p>Conforme al artículo 8 de la Ley 1581 de 2012, el titular puede:</p><ul>'
      + '<li>Conocer, actualizar y rectificar sus datos personales.</li><li>Solicitar prueba de la autorización otorgada.</li>'
      + '<li>Ser informado sobre el uso que se ha dado a sus datos.</li><li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>'
      + '<li>Revocar la autorización o solicitar la supresión de sus datos cuando no se respeten los principios, derechos y garantías legales.</li>'
      + '<li>Acceder gratuitamente a sus datos personales.</li></ul>'
      + '<h2>6. Consultas y reclamos</h2><p>Las solicitudes se reciben en ' + esc(r.correo) + ' o en el teléfono ' + esc(r.telefono)
      + '. Las consultas se responden en un máximo de diez (10) días hábiles, prorrogables por cinco (5) días hábiles más. Los reclamos se atienden en un máximo de quince (15) días hábiles, prorrogables por ocho (8) días hábiles más, según los artículos 14 y 15 de la Ley 1581 de 2012.</p>'
      + '<h2>7. Seguridad y circulación</h2><p>Se adoptan medidas técnicas y administrativas razonables para proteger los datos. Los datos no se venden ni se ceden a terceros, salvo a encargados necesarios para prestar el servicio (por ejemplo, transporte o alojamiento web) o por orden de autoridad competente.</p>'
      + '<h2>8. Vigencia</h2><p>Esta política rige desde [fecha de publicación]. Las bases de datos se conservarán mientras sea necesario para las finalidades descritas y el cumplimiento de obligaciones legales.</p>';
  }

  function privacidad(r) {
    return '<p><strong>' + esc(r.nombre) + '</strong> (NIT o cédula ' + esc(r.documento) + '), con domicilio en ' + esc(r.direccion)
      + ', es responsable del tratamiento de los datos personales que usted suministre.</p>'
      + '<h2>Tratamiento y finalidad</h2><p>Sus datos se usarán para atender cotizaciones, pedidos, entregas, garantías y comunicaciones relacionadas, y para cumplir obligaciones legales. La información comercial solo se enviará con su autorización expresa.</p>'
      + '<h2>Sus derechos</h2><p>Puede conocer, actualizar, rectificar y suprimir sus datos, solicitar prueba de la autorización, revocarla y presentar quejas ante la Superintendencia de Industria y Comercio. Las respuestas a preguntas sobre datos sensibles o de menores son facultativas.</p>'
      + '<h2>Cómo ejercerlos</h2><p>Escriba a ' + esc(r.correo) + ' o comuníquese al ' + esc(r.telefono) + '.</p>'
      + '<h2>Política completa</h2><p>Consulte la <a href="#legal/datos">Política de tratamiento de datos personales</a>.</p>';
  }

  function terminos(r) {
    return '<h2>1. Quién vende</h2><p>Este sitio es operado por <strong>' + esc(r.nombre) + '</strong>, NIT o cédula ' + esc(r.documento) + ', con domicilio en ' + esc(r.direccion) + '.</p>'
      + '<h2>2. Información de productos</h2><p>Se procura que precios, fotos y descripciones sean exactos. Los precios incluyen los impuestos aplicables, salvo indicación contraria, y pueden cambiar sin previo aviso antes de confirmar un pedido.</p>'
      + '<h2>3. Pedidos</h2><p>Un pedido se considera aceptado cuando se confirma por los canales de contacto indicados. La disponibilidad está sujeta a inventario.</p>'
      + '<h2>4. Garantías, cambios y retracto</h2><p>Se aplican los derechos previstos en la Ley 1480 de 2011 (Estatuto del Consumidor), incluida la garantía legal y, cuando proceda, el derecho de retracto en ventas a distancia.</p>'
      + '<h2>5. Datos personales</h2><p>El tratamiento de datos se rige por la <a href="#legal/datos">Política de tratamiento de datos personales</a>.</p>'
      + '<h2>6. Contacto</h2><p>' + esc(r.correo) + ' · ' + esc(r.telefono) + '</p>';
  }

  function index(context) {
    let html = '<div class="abc-legal-list">' + Object.entries(pages).map(([id, title]) =>
      '<a class="abc-legal-card abc-glass" href="#legal/' + id + '"><strong>' + title + '</strong><small>Borrador</small></a>').join("") + '</div>';
    if (context.access.admin && !context.client) {
      const values = { ...(context.config.responsable ?? {}), ...draft() };
      html += '<section class="abc-glass abc-card"><h2>Datos del responsable</h2>'
        + '<p class="abc-muted">Se guardan como borrador en este dispositivo. Para que los clientes los vean, cópialos en <code>abc/abc-config.js</code>.</p>'
        + '<form id="abc-responsable" class="abc-form">'
        + fields.map(([key, label, type, auto]) => '<label>' + label + '<input name="' + key + '" type="' + type + '" autocomplete="' + auto + '" value="' + esc(values[key] ?? "") + '"></label>').join("")
        + '<div class="abc-form-actions"><button type="submit" class="primary">Guardar borrador</button>'
        + '<button type="button" class="secondary" data-legal="copy">Copiar para abc-config.js</button></div></form></section>'
        + '<section class="abc-glass abc-card"><h2>Prueba de la casilla de autorización</h2>'
        + '<p class="abc-muted">Componente reutilizable: el botón queda bloqueado hasta aceptar.</p>'
        + '<form id="abc-consent-demo" class="abc-form"><label>Nombre<input name="demo" autocomplete="off"></label>'
        + '<div class="abc-form-actions"><button type="submit" class="primary">Enviar</button></div></form></section>';
    }
    return html;
  }

  function render(container, page, context) {
    if (!container) return;
    const r = responsable(context);
    const builders = { datos, privacidad, terminos };
    if (builders[page]) {
      container.innerHTML = '<article class="abc-legal abc-glass">'
        + (context.client ? "" : '<a class="abc-back-link" href="#legal">← Legal</a>')
        + banner() + '<h1>' + pages[page] + '</h1>' + builders[page](r) + '</article>';
    } else {
      container.innerHTML = '<section class="abc-legal-home"><span class="abc-short">Sección</span><h1>Legal</h1>' + banner() + index(context) + '</section>';
      const demo = container.querySelector("#abc-consent-demo");
      if (demo) {
        consent(demo, { purpose: "responder tu solicitud" });
        demo.addEventListener("submit", (event) => { event.preventDefault(); abcShell.toast("Formulario de prueba enviado: la autorización fue aceptada."); });
      }
    }
  }

  // Componente reutilizable: casilla sin marcar que bloquea el envío hasta aceptarla.
  // Uso: abcLegal.consent(formulario, { purpose: "gestionar tu pedido" })
  let counter = 0;
  function consent(form, options = {}) {
    const id = "abc-consent-" + (++counter);
    const wrapper = document.createElement("div");
    wrapper.className = "abc-consent";
    wrapper.innerHTML = '<input type="checkbox" id="' + id + '" name="autorizacion_datos" value="si" required>'
      + '<label for="' + id + '">Autorizo el tratamiento de mis datos personales para ' + esc(options.purpose ?? "atender mi solicitud")
      + ', de acuerdo con la <a href="#legal/datos">Política de tratamiento de datos</a> (Ley 1581 de 2012).</label>';
    const box = wrapper.querySelector("input");
    const actions = form.querySelector(".abc-form-actions");
    form.insertBefore(wrapper, actions ?? null);
    const submits = () => form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])');
    const sync = () => { for (const button of submits()) button.disabled = !box.checked; };
    box.checked = false;
    box.addEventListener("change", sync);
    form.addEventListener("submit", (event) => {
      if (box.checked) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      box.focus();
    }, true);
    sync();
    return box;
  }

  function footer(config, storeName) {
    const name = config.responsable?.nombre?.trim();
    return '<footer class="abc-legal-footer"><nav aria-label="Información legal">'
      + Object.entries(pages).map(([id, title]) => '<a href="#legal/' + id + '">' + title + '</a>').join("")
      + '</nav><small>© ' + new Date().getFullYear() + ' ' + esc(name || storeName || "ABC Abastecimiento") + '</small></footer>';
  }

  document.addEventListener("submit", (event) => {
    if (event.target.id !== "abc-responsable") return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    try {
      localStorage.setItem(draftKey, JSON.stringify(data));
      abcShell.toast("Borrador guardado en este dispositivo.");
    } catch { abcShell.toast("El navegador bloqueó el guardado."); }
  });

  document.addEventListener("click", async (event) => {
    if (event.target.closest('[data-legal="copy"]')) {
      const form = document.querySelector("#abc-responsable");
      const data = Object.fromEntries(new FormData(form));
      const text = "responsable: " + JSON.stringify(data, null, 2).replace(/\n/g, "\n  ") + ",";
      try { await navigator.clipboard.writeText(text); abcShell.toast("Copiado. Pégalo en abc/abc-config.js."); }
      catch { abcShell.toast("No se pudo copiar automáticamente."); }
    }
  });

  return { render, consent, footer, pages };
})();
