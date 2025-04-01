let datos = {};
let mesActual;
let notificacionesPermitidas = false;
let notificacionesProgramadas = new Map();

// Sistema de versiones para migración de datos
const VERSION_ACTUAL = 1;

function migrarDatos() {
  const datosGuardados = localStorage.getItem("controlGastos");
  if (!datosGuardados) return;

  const datosParseados = JSON.parse(datosGuardados);
  let necesitaMigracion = false;

  // Si no tiene versión, es la versión 0 (versión inicial)
  const versionActual = datosParseados.version || 0;

  // Si la versión es la actual, no necesita migración
  if (versionActual >= VERSION_ACTUAL) return;

  // Migración de versión 0 a 1
  if (versionActual < 1) {
    Object.keys(datosParseados).forEach((mes) => {
      if (mes !== "version") {
        // Agregar campos nuevos a los gastos
        datosParseados[mes].gastos.forEach((gasto) => {
          if (!gasto.hasOwnProperty("categoria")) {
            gasto.categoria = "Sin categoría";
            necesitaMigracion = true;
          }
          if (!gasto.hasOwnProperty("notas")) {
            gasto.notas = "";
            necesitaMigracion = true;
          }
          if (!gasto.hasOwnProperty("fechaCreacion")) {
            gasto.fechaCreacion = new Date().toISOString();
            necesitaMigracion = true;
          }
        });

        // Agregar campos nuevos a los ingresos
        datosParseados[mes].ingresos.forEach((ingreso) => {
          if (!ingreso.hasOwnProperty("categoria")) {
            ingreso.categoria = "Sin categoría";
            necesitaMigracion = true;
          }
          if (!ingreso.hasOwnProperty("notas")) {
            ingreso.notas = "";
            necesitaMigracion = true;
          }
          if (!ingreso.hasOwnProperty("fechaCreacion")) {
            ingreso.fechaCreacion = new Date().toISOString();
            necesitaMigracion = true;
          }
        });
      }
    });

    // Actualizar la versión
    datosParseados.version = VERSION_ACTUAL;
    necesitaMigracion = true;
  }

  // Si se realizaron cambios, guardar
  if (necesitaMigracion) {
    localStorage.setItem("controlGastos", JSON.stringify(datosParseados));
    console.log("Datos migrados a la versión", VERSION_ACTUAL);
  }
}

// Solicitar permisos de notificación al cargar la página
async function solicitarPermisosNotificacion() {
  if ("Notification" in window) {
    const permiso = await Notification.requestPermission();
    notificacionesPermitidas = permiso === "granted";
  }
}

function obtenerMesActual() {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${(fecha.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function inicializarMes(mes) {
  if (!datos[mes]) {
    datos[mes] = {
      ingresos: [
        {
          descripcion: "",
          valor: "",
          categoria: "Sin categoría",
          notas: "",
          fechaCreacion: new Date().toISOString(),
        },
      ],
      gastos: [
        {
          descripcion: "",
          valor: "",
          recurrente: false,
          recordatorio: null,
          categoria: "Sin categoría",
          notas: "",
          fechaCreacion: new Date().toISOString(),
        },
      ],
    };
  }
}

function cargarDatos() {
  const datosGuardados = localStorage.getItem("controlGastos");
  if (datosGuardados) {
    datos = JSON.parse(datosGuardados);
  }
  mesActual = obtenerMesActual();
  inicializarMes(mesActual);
  actualizarInterfaz();
}

function guardarDatos() {
  localStorage.setItem("controlGastos", JSON.stringify(datos));
}

function mostrarMensajeConfirmacion(mensaje) {
  const mensajeElement = document.querySelector(".mensaje-confirmacion");
  mensajeElement.textContent = mensaje;
  mensajeElement.classList.add("visible");

  setTimeout(() => {
    mensajeElement.classList.remove("visible");
  }, 1500);
}

function programarNotificacion(gasto, mes) {
  if (!notificacionesPermitidas) return;

  // Verificar que el gasto tenga recordatorio
  if (!gasto.recordatorio) return;

  const fechaRecordatorio = new Date(gasto.recordatorio);
  const ahora = new Date();

  if (fechaRecordatorio > ahora) {
    const tiempoRestante = fechaRecordatorio.getTime() - ahora.getTime();
    const idNotificacion = `${mes}-${
      gasto.descripcion
    }-${fechaRecordatorio.getTime()}`;

    const timeoutId = setTimeout(() => {
      if ("Notification" in window) {
        new Notification("Recordatorio de Pago", {
          body: `Es hora de pagar: ${gasto.descripcion}`,
          icon: "icons/notification.svg",
        });
      }
    }, tiempoRestante);

    notificacionesProgramadas.set(idNotificacion, timeoutId);
  }
}

function cancelarNotificacion(gasto, mes) {
  const idNotificacion = `${mes}-${gasto.descripcion}`;
  const timeoutId = notificacionesProgramadas.get(idNotificacion);
  if (timeoutId) {
    clearTimeout(timeoutId);
    notificacionesProgramadas.delete(idNotificacion);
  }
}

function verificarRecordatorios() {
  // Limpiar notificaciones existentes
  notificacionesProgramadas.forEach((timeoutId) => clearTimeout(timeoutId));
  notificacionesProgramadas.clear();

  // Programar nuevas notificaciones
  Object.entries(datos).forEach(([mes, mesDatos]) => {
    // Verificar que mesDatos y gastos existan
    if (mesDatos && mesDatos.gastos) {
      const gastosFijos = mesDatos.gastos.filter(
        (gasto) => gasto.recurrente && gasto.recordatorio
      );

      gastosFijos.forEach((gasto) => {
        programarNotificacion(gasto, mes);
      });
    }
  });
}

function renderizarItems(listId, items) {
  const list = document.getElementById(listId);
  list.innerHTML = "";
  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
            <div class="gastos-input">
              <input type="text" value="${
                item.descripcion
              }" placeholder="Descripción" class="descripcion-${
      listId === "ingresos-list" ? "ingreso" : "gasto"
    }">
              <input type="text" value="${formatearNumeroEnTiempoReal(
                item.valor.toString()
              )}" placeholder="Valor" class="valor-${
      listId === "ingresos-list" ? "ingreso" : "gasto"
    }">
            </div>
            ${
              listId === "gastos-list"
                ? `
                <div class="gasto-options">
                    <label class="recurrente-label">
                        <input type="checkbox" class="gasto-recurrente" ${
                          item.recurrente ? "checked" : ""
                        }>
                        <span>Fijo</span>
                    </label>
                    <div class="recordatorio-container">
                        <input type="date" class="fecha-recordatorio" value="${
                          item.recordatorio || ""
                        }">
                        <div class="recordatorio-options">
                            <span class="recordatorio-icon ${
                              item.recordatorio ? "activo" : ""
                            }" title="Activar recordatorio">
                                <img src="icons/notification.svg" alt="Notification Icon">
                            </span>
                        </div>
                    </div>
                    <img src="icons/delete.svg" alt="Delete Icon" class="delete-icon">
                </div>
            `
                : `
                <img src="icons/delete.svg" alt="Delete Icon" class="delete-icon">
            `
            }
        `;
    list.appendChild(div);

    // Función para manejar eventos táctiles y de click
    function addTouchAndClickHandler(element, handler) {
      if (!element) return;

      element.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          handler();
        },
        { passive: false }
      );

      element.addEventListener("click", handler);
    }

    const valorInput = div.querySelector(
      'input[type="text"].valor-' +
        (listId === "ingresos-list" ? "ingreso" : "gasto")
    );
    valorInput.addEventListener("input", (e) => {
      let formateado = formatearNumeroEnTiempoReal(e.target.value);
      e.target.value = formateado;
      item.valor = desformatearNumero(formateado);
      actualizarTotales();
      guardarDatos();
    });

    div
      .querySelector(
        'input[type="text"].descripcion-' +
          (listId === "ingresos-list" ? "ingreso" : "gasto")
      )
      .addEventListener("input", (e) => {
        item.descripcion = e.target.value;
        guardarDatos();
      });

    if (listId === "gastos-list") {
      const checkbox = div.querySelector(".gasto-recurrente");
      checkbox.addEventListener("change", (e) => {
        item.recurrente = e.target.checked;
        guardarDatos();
      });

      const fechaInput = div.querySelector(".fecha-recordatorio");
      const recordatorioIcon = div.querySelector(".recordatorio-icon");

      fechaInput.addEventListener("change", (e) => {
        if (e.target.value) {
          item.recordatorio = e.target.value;
          recordatorioIcon.classList.add("activo");
          programarNotificacion(item, mesActual);
          mostrarMensajeConfirmacion("Recordatorio activado");
        } else {
          item.recordatorio = null;
          recordatorioIcon.classList.remove("activo");
          cancelarNotificacion(item, mesActual);
          mostrarMensajeConfirmacion("Recordatorio desactivado");
        }
        guardarDatos();
      });

      addTouchAndClickHandler(recordatorioIcon, () => {
        if (item.recordatorio) {
          fechaInput.value = "";
          item.recordatorio = null;
          recordatorioIcon.classList.remove("activo");
          cancelarNotificacion(item, mesActual);
          mostrarMensajeConfirmacion("Recordatorio desactivado");
          guardarDatos();
        } else {
          fechaInput.focus();
        }
      });
    }

    addTouchAndClickHandler(div.querySelector(".delete-icon"), () => {
      if (confirm("¿Estás seguro de que deseas eliminar este ítem?")) {
        items.splice(index, 1);
        renderizarItems(listId, items);
        actualizarTotales();
        guardarDatos();
      }
    });
  });
}

function formatearNumero(numero) {
  return "$" + numero.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatearNumeroEnTiempoReal(numero) {
  let valor = numero.replace(/\D/g, "");
  return valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function desformatearNumero(numeroFormateado) {
  return numeroFormateado.replace(/\./g, "");
}

function actualizarTotales() {
  let totalIngresos = datos[mesActual].ingresos.reduce(
    (sum, item) => sum + (parseInt(item.valor) || 0),
    0
  );
  let totalGastos = datos[mesActual].gastos.reduce(
    (sum, item) => sum + (parseInt(item.valor) || 0),
    0
  );

  const totalIngresosElement = document.getElementById("total-ingresos");
  const totalGastosElement = document.getElementById("total-gastos");
  const balanceElement = document.getElementById("balance");

  if (totalIngresosElement && totalGastosElement && balanceElement) {
    totalIngresosElement.textContent = formatearNumero(totalIngresos);
    totalGastosElement.textContent = formatearNumero(totalGastos);

    const balance = totalIngresos - totalGastos;
    balanceElement.textContent = formatearNumero(balance);
    balanceElement.style.color = balance >= 0 ? "green" : "red";
  }

  actualizarResumen();
}

function actualizarResumen() {
  // Verificar si los elementos del resumen existen
  const topGastosList = document.getElementById("top-gastos");
  const totalGastosFijos = document.getElementById("total-gastos-fijos");
  const totalGastosVariables = document.getElementById(
    "total-gastos-variables"
  );
  const porcentajeFijos = document.getElementById("porcentaje-fijos");
  const porcentajeVariables = document.getElementById("porcentaje-variables");

  // Si alguno de los elementos no existe, no actualizamos el resumen
  if (
    !topGastosList ||
    !totalGastosFijos ||
    !totalGastosVariables ||
    !porcentajeFijos ||
    !porcentajeVariables
  ) {
    return;
  }

  // Calcular top 5 gastos
  const gastosOrdenados = [...datos[mesActual].gastos]
    .filter((gasto) => parseInt(gasto.valor) > 0)
    .sort((a, b) => parseInt(b.valor) - parseInt(a.valor))
    .slice(0, 5);

  topGastosList.innerHTML = "";

  gastosOrdenados.forEach((gasto) => {
    const div = document.createElement("div");
    div.className = "top-gasto-item";
    div.innerHTML = `
      <span>${gasto.descripcion || "Sin descripción"}</span>
      <span>${formatearNumero(parseInt(gasto.valor))}</span>
    `;
    topGastosList.appendChild(div);
  });

  // Calcular distribución de gastos
  const gastosFijos = datos[mesActual].gastos
    .filter((gasto) => gasto.recurrente)
    .reduce((sum, gasto) => sum + (parseInt(gasto.valor) || 0), 0);

  const gastosVariables = datos[mesActual].gastos
    .filter((gasto) => !gasto.recurrente)
    .reduce((sum, gasto) => sum + (parseInt(gasto.valor) || 0), 0);

  const totalGastos = gastosFijos + gastosVariables;
  const porcentajeFijosValor =
    totalGastos > 0 ? Math.round((gastosFijos / totalGastos) * 100) : 0;
  const porcentajeVariablesValor =
    totalGastos > 0 ? Math.round((gastosVariables / totalGastos) * 100) : 0;

  totalGastosFijos.textContent = formatearNumero(gastosFijos);
  totalGastosVariables.textContent = formatearNumero(gastosVariables);
  porcentajeFijos.textContent = `(${porcentajeFijosValor}%)`;
  porcentajeVariables.textContent = `(${porcentajeVariablesValor}%)`;
}

function agregarItem(tipo) {
  datos[mesActual][tipo].push({
    descripcion: "",
    valor: "",
    ...(tipo === "gastos" ? { recurrente: false } : {}),
  });
  renderizarItems(`${tipo}-list`, datos[mesActual][tipo]);
  actualizarTotales();
  guardarDatos();
}

function cambiarMes(direccion) {
  const [año, mes] = mesActual.split("-").map(Number);
  let nuevaFecha = new Date(año, mes - 1 + direccion, 1);
  const nuevoMes = `${nuevaFecha.getFullYear()}-${(nuevaFecha.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;

  // Copiar gastos fijos al nuevo mes
  if (datos[mesActual] && datos[mesActual].gastos) {
    const gastosFijos = datos[mesActual].gastos.filter(
      (gasto) => gasto.recurrente
    );
    if (gastosFijos.length > 0) {
      if (!datos[nuevoMes]) {
        datos[nuevoMes] = {
          ingresos: [{ descripcion: "", valor: "" }],
          gastos: [],
        };
      }

      // Obtener las descripciones de los gastos fijos existentes en el nuevo mes
      const gastosFijosExistentes = datos[nuevoMes].gastos
        .filter((gasto) => gasto.recurrente)
        .map((gasto) => gasto.descripcion);

      // Agregar solo los gastos fijos que no existen en el nuevo mes
      gastosFijos.forEach((gasto) => {
        if (!gastosFijosExistentes.includes(gasto.descripcion)) {
          datos[nuevoMes].gastos.push({
            descripcion: gasto.descripcion,
            valor: "",
            recurrente: true,
          });
        }
      });
    }
  }

  mesActual = nuevoMes;
  inicializarMes(mesActual);
  actualizarInterfaz();
}

function actualizarInterfaz() {
  document.getElementById("current-month").textContent =
    formatearMes(mesActual);
  renderizarItems("ingresos-list", datos[mesActual].ingresos);
  renderizarItems("gastos-list", datos[mesActual].gastos);
  actualizarTotales();
}

function formatearMes(mesString) {
  const [año, mes] = mesString.split("-");
  const fecha = new Date(año, mes - 1, 1);
  return fecha.toLocaleString("es-ES", { month: "long", year: "numeric" });
}

function exportarAExcel() {
  const tipoExportacion = document.getElementById("export-type").value;
  const wb = XLSX.utils.book_new();

  if (tipoExportacion === "mes") {
    // Exportar solo el mes actual
    exportarMesActual(wb, mesActual);
    XLSX.writeFile(wb, `Control_Gastos_${mesActual}.xlsx`);
  } else {
    // Exportar todos los meses
    const meses = Object.keys(datos).sort();
    meses.forEach((mes) => {
      exportarMesActual(wb, mes);
    });
    XLSX.writeFile(wb, `Control_Gastos_Completo_${mesActual}.xlsx`);
  }
}

function exportarMesActual(wb, mes) {
  // Preparar datos de ingresos
  const ingresosData = datos[mes].ingresos
    .filter((item) => item.descripcion || item.valor)
    .map((item) => ({
      Descripción: item.descripcion || "",
      Valor: parseInt(item.valor) || 0,
    }));

  // Preparar datos de gastos
  const gastosData = datos[mes].gastos
    .filter((item) => item.descripcion || item.valor)
    .map((item) => ({
      Descripción: item.descripcion || "",
      Valor: parseInt(item.valor) || 0,
      Tipo: item.recurrente ? "Fijo" : "Variable",
    }));

  // Calcular totales
  const totalIngresos = ingresosData.reduce((sum, item) => sum + item.Valor, 0);
  const totalGastos = gastosData.reduce((sum, item) => sum + item.Valor, 0);
  const balance = totalIngresos - totalGastos;

  // Crear hoja de resumen
  const resumenData = [
    ["RESUMEN DEL MES", formatearMes(mes)],
    ["Total Ingresos", totalIngresos],
    ["Total Gastos", totalGastos],
    ["Balance", balance],
    [],
    ["DISTRIBUCIÓN DE GASTOS"],
    [
      "Gastos Fijos",
      gastosData
        .filter((item) => item.Tipo === "Fijo")
        .reduce((sum, item) => sum + item.Valor, 0),
    ],
    [
      "Gastos Variables",
      gastosData
        .filter((item) => item.Tipo === "Variable")
        .reduce((sum, item) => sum + item.Valor, 0),
    ],
  ];

  // Crear hojas de Excel
  const wsIngresos = XLSX.utils.json_to_sheet(ingresosData);
  const wsGastos = XLSX.utils.json_to_sheet(gastosData);
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

  // Agregar hojas al libro con el nombre del mes
  const nombreMes = formatearMes(mes).replace(/\s+/g, "_");
  XLSX.utils.book_append_sheet(wb, wsIngresos, `Ingresos_${nombreMes}`);
  XLSX.utils.book_append_sheet(wb, wsGastos, `Gastos_${nombreMes}`);
  XLSX.utils.book_append_sheet(wb, wsResumen, `Resumen_${nombreMes}`);
}

document.addEventListener("DOMContentLoaded", async () => {
  await solicitarPermisosNotificacion();
  migrarDatos();
  cargarDatos();
  verificarRecordatorios();

  // Agregar event listeners solo si los elementos existen
  const agregarIngresoBtn = document.getElementById("agregar-ingreso");
  const agregarGastoBtn = document.getElementById("agregar-gasto");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const exportarExcelBtn = document.getElementById("exportar-excel");

  // Función para manejar eventos táctiles y de click
  function addTouchAndClickHandler(element, handler) {
    if (!element) return;

    // Prevenir comportamiento por defecto del toque
    element.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        handler();
      },
      { passive: false }
    );

    // Mantener el evento click para compatibilidad
    element.addEventListener("click", handler);
  }

  addTouchAndClickHandler(agregarIngresoBtn, () => agregarItem("ingresos"));
  addTouchAndClickHandler(agregarGastoBtn, () => agregarItem("gastos"));
  addTouchAndClickHandler(prevMonthBtn, () => cambiarMes(-1));
  addTouchAndClickHandler(nextMonthBtn, () => cambiarMes(1));
  addTouchAndClickHandler(exportarExcelBtn, exportarAExcel);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("Service Worker registrado con éxito:", registration.scope);
      })
      .catch((error) => {
        console.log("Falló el registro del Service Worker:", error);
      });
  });
}
