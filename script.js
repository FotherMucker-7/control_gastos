let datos = {};
let mesActual;

// Sistema de versiones para migración de datos
const VERSION_ACTUAL = 1;

// Categorías disponibles
const CATEGORIAS_GASTOS = [
  "Vivienda",
  "Alimentación",
  "Transporte",
  "Salud",
  "Servicios",
  "Educación",
  "Ocio",
  "Compras",
  "Financiero",
  "Otros",
];

const CATEGORIAS_INGRESOS = ["Sueldo", "Freelance", "Inversiones", "Otros"];

function generarId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
}

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
          if (!gasto.hasOwnProperty("id")) {
            gasto.id = generarId();
            necesitaMigracion = true;
          }
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
          if (!ingreso.hasOwnProperty("id")) {
            ingreso.id = generarId();
            necesitaMigracion = true;
          }
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



function obtenerMesActual() {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${(fecha.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function inicializarMes(mes) {
  if (!datos[mes]) {
    datos[mes] = {
      ingresos: [],
      gastos: [],
    };
  }

  // Asegurar que siempre haya una línea vacía al final de ingresos
  const ingresos = datos[mes].ingresos;
  if (ingresos.length === 0 || ingresos[ingresos.length - 1].descripcion.trim() !== "" || ingresos[ingresos.length - 1].valor !== "") {
    ingresos.push({
      id: generarId(),
      descripcion: "",
      valor: "",
      categoria: CATEGORIAS_INGRESOS[CATEGORIAS_INGRESOS.length - 1],
      notas: "",
      fechaCreacion: "",
    });
  }

  // Asegurar que siempre haya una línea vacía al final de gastos
  const gastos = datos[mes].gastos;
  if (gastos.length === 0 || gastos[gastos.length - 1].descripcion.trim() !== "" || gastos[gastos.length - 1].valor !== "") {
    gastos.push({
      id: generarId(),
      descripcion: "",
      valor: "",
      recurrente: false,
      categoria: CATEGORIAS_GASTOS[CATEGORIAS_GASTOS.length - 1],
      notas: "",
      fechaCreacion: "",
    });
  }
}

let syncTimeout = null;

async function sincronizarConSupabase() {
  if (typeof supabaseClient === 'undefined') return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  if (syncTimeout) clearTimeout(syncTimeout);
  
  syncTimeout = setTimeout(async () => {
    try {
      const user_id = session.user.id;
      const transaccionesToUpsert = [];
      
      Object.keys(datos).forEach(mes => {
        if (mes === "version") return;
        
        if (datos[mes].ingresos) {
          datos[mes].ingresos.forEach(item => {
            if (item.id && item.descripcion.trim() !== "" && item.valor.toString().trim() !== "") {
              transaccionesToUpsert.push({
                id: item.id,
                user_id: user_id,
                mes: mes,
                tipo: 'ingreso',
                descripcion: item.descripcion,
                valor: parseInt(item.valor) || 0,
                categoria: item.categoria,
                notas: item.notas || "",
                recurrente: false,
                fecha_creacion: item.fechaCreacion || new Date().toISOString()
              });
            }
          });
        }
        
        if (datos[mes].gastos) {
          datos[mes].gastos.forEach(item => {
            if (item.id && item.descripcion.trim() !== "" && item.valor.toString().trim() !== "") {
              transaccionesToUpsert.push({
                id: item.id,
                user_id: user_id,
                mes: mes,
                tipo: 'gasto',
                descripcion: item.descripcion,
                valor: parseInt(item.valor) || 0,
                categoria: item.categoria,
                notas: item.notas || "",
                recurrente: item.recurrente || false,
                fecha_creacion: item.fechaCreacion || new Date().toISOString()
              });
            }
          });
        }
      });

      if (transaccionesToUpsert.length > 0) {
        const { error } = await supabaseClient
          .from('transacciones')
          .upsert(transaccionesToUpsert, { onConflict: 'id' });
          
        if (error) throw error;
        console.log("Sincronizado con Supabase");
      }
    } catch (error) {
      console.error("Error sincronizando:", error);
    }
  }, 1500); // 1.5s debounce para no saturar la base de datos
}

async function cargarDatosDesdeNube() {
  if (typeof supabaseClient === 'undefined') return false;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return false;
  
  try {
    // Si hay datos locales, forzamos una subida inicial por si hay cambios offline
    // Esto asume la política de "el último que guarda, gana", pero evita pérdida de datos locales no subidos
    const datosGuardados = localStorage.getItem("controlGastos");
    if (datosGuardados) {
      await sincronizarConSupabase(); 
    }
    
    const { data, error } = await supabaseClient
      .from('transacciones')
      .select('*')
      .eq('user_id', session.user.id);
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      let datosNube = { version: VERSION_ACTUAL };
      
      data.forEach(t => {
        if (!datosNube[t.mes]) {
          datosNube[t.mes] = { ingresos: [], gastos: [] };
        }
        
        const item = {
          id: t.id,
          descripcion: t.descripcion,
          valor: t.valor.toString(),
          categoria: t.categoria,
          notas: t.notas,
          fechaCreacion: t.fecha_creacion,
          ...(t.tipo === 'gasto' ? { recurrente: t.recurrente } : {})
        };
        
        if (t.tipo === 'ingreso') {
          datosNube[t.mes].ingresos.push(item);
        } else {
          datosNube[t.mes].gastos.push(item);
        }
      });
      
      datos = datosNube;
      
      Object.keys(datos).forEach(mes => {
        if (mes !== 'version') {
          inicializarMes(mes);
        }
      });
      
      mesActual = obtenerMesActual();
      if(!datos[mesActual]) inicializarMes(mesActual);
      actualizarInterfaz();
      localStorage.setItem("controlGastos", JSON.stringify(datos));
      return true;
    }
  } catch(error) {
    console.error("Error cargando desde la nube:", error);
  }
  return false;
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
  sincronizarConSupabase();
}



function buildCategorySelect(categorias, valorActual) {
  const categoriaSegura = categorias.includes(valorActual)
    ? valorActual
    : categorias[categorias.length - 1];

  const options = categorias
    .map(
      (cat) =>
        `<option value="${cat}" ${
          cat === categoriaSegura ? "selected" : ""
        }>${cat}</option>`
    )
    .join("");

  return `<select class="categoria-select" aria-label="Categoría">
    ${options}
  </select>`;
}

function renderizarItems(listId, items) {
  const list = document.getElementById(listId);
  list.innerHTML = "";
  const esIngreso = listId === "ingresos-list";
  const categorias = esIngreso ? CATEGORIAS_INGRESOS : CATEGORIAS_GASTOS;
  const tipoClass = esIngreso ? "ingreso" : "gasto";

  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="gastos-input">
        <input type="text" value="${item.descripcion}" placeholder="Descripción" class="descripcion-${tipoClass}">
        <input type="text" value="${formatearNumeroEnTiempoReal(item.valor.toString())}" placeholder="Valor" class="valor-${tipoClass}">
      </div>
      ${
        esIngreso
          ? `
        <div class="item-options">
          ${buildCategorySelect(categorias, item.categoria)}
          <img src="icons/delete.svg" alt="Eliminar ingreso" class="delete-icon">
        </div>
      `
          : `
        <div class="gasto-options">
          ${buildCategorySelect(categorias, item.categoria)}
          <label class="recurrente-label">
            <input type="checkbox" class="gasto-recurrente" ${item.recurrente ? "checked" : ""}>
            <span>Fijo</span>
          </label>
          <img src="icons/delete.svg" alt="Eliminar gasto" class="delete-icon">
        </div>
      `
      }
      <div class="item-footer">
        <span class="item-fecha" title="${formatearFecha(item.fechaCreacion, true)}">
          ${item.fechaCreacion ? `Reg: ${formatearFecha(item.fechaCreacion, false)}` : ""}
        </span>
      </div>
    `;
    list.appendChild(div);

    // Función para manejar eventos táctiles y de click
    function addTouchAndClickHandler(element, handler) {
      if (!element) return;
      element.addEventListener("touchstart", (e) => { e.preventDefault(); handler(); }, { passive: false });
      element.addEventListener("click", handler);
    }

    function verificarFechaCreacion() {
      if (item.descripcion.trim() !== "" && item.valor.toString().trim() !== "" && !item.fechaCreacion) {
        item.fechaCreacion = new Date().toISOString();
        const fechaSpan = div.querySelector('.item-fecha');
        if (fechaSpan) {
          fechaSpan.title = formatearFecha(item.fechaCreacion, true);
          fechaSpan.textContent = "Reg: " + formatearFecha(item.fechaCreacion, false);
        }
      }
    }

    const valorInput = div.querySelector(`input[type="text"].valor-${tipoClass}`);
    valorInput.addEventListener("input", (e) => {
      let formateado = formatearNumeroEnTiempoReal(e.target.value);
      e.target.value = formateado;
      item.valor = desformatearNumero(formateado);
      verificarFechaCreacion();
      actualizarTotales();
      guardarDatos();
    });

    div.querySelector(`input[type="text"].descripcion-${tipoClass}`)
      .addEventListener("input", (e) => {
        item.descripcion = e.target.value;
        verificarFechaCreacion();
        guardarDatos();
      });

    div.querySelector(".categoria-select")
      .addEventListener("change", (e) => {
        item.categoria = e.target.value;
        guardarDatos();
      });

    if (!esIngreso) {
      const checkbox = div.querySelector(".gasto-recurrente");
      checkbox.addEventListener("change", (e) => {
        item.recurrente = e.target.checked;
        guardarDatos();
      });
    }

    addTouchAndClickHandler(div.querySelector(".delete-icon"), async () => {
      if (confirm("¿Estás seguro de que deseas eliminar este ítem?")) {
        const itemToDelete = items[index];
        items.splice(index, 1);
        inicializarMes(mesActual);
        renderizarItems(listId, items);
        actualizarTotales();
        guardarDatos();
        
        if (typeof supabaseClient !== 'undefined' && itemToDelete.id) {
          try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && itemToDelete.descripcion.trim() !== "") {
              await supabaseClient.from('transacciones').delete().eq('id', itemToDelete.id);
            }
          } catch(e) {
            console.error("Error eliminando de supabase", e);
          }
        }
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

function formatearFecha(isoString, completa = false) {
  if (!isoString) return "";
  const fecha = new Date(isoString);
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  const horas = fecha.getHours().toString().padStart(2, '0');
  const minutos = fecha.getMinutes().toString().padStart(2, '0');
  
  if (completa) {
    const segundos = fecha.getSeconds().toString().padStart(2, '0');
    return `${dia}/${mes}/${año} ${horas}:${minutos}:${segundos}`;
  }
  return `${dia}/${mes} ${horas}:${minutos}`;
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
    balanceElement.classList.toggle("negativo", balance < 0);
  }

  actualizarResumen();
}

function actualizarResumen() {
  const topGastosList = document.getElementById("top-gastos");
  const totalGastosFijos = document.getElementById("total-gastos-fijos");
  const totalGastosVariables = document.getElementById("total-gastos-variables");
  const porcentajeFijos = document.getElementById("porcentaje-fijos");
  const porcentajeVariables = document.getElementById("porcentaje-variables");
  const categoriasList = document.getElementById("categorias-list");

  if (!topGastosList || !totalGastosFijos || !totalGastosVariables || !porcentajeFijos || !porcentajeVariables) {
    return;
  }

  // Top 5 gastos
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

  // Distribución Fijos / Variables
  const gastosFijos = datos[mesActual].gastos
    .filter((g) => g.recurrente)
    .reduce((sum, g) => sum + (parseInt(g.valor) || 0), 0);

  const gastosVariables = datos[mesActual].gastos
    .filter((g) => !g.recurrente)
    .reduce((sum, g) => sum + (parseInt(g.valor) || 0), 0);

  const totalGastos = gastosFijos + gastosVariables;
  const pctFijos = totalGastos > 0 ? Math.round((gastosFijos / totalGastos) * 100) : 0;
  const pctVariables = totalGastos > 0 ? Math.round((gastosVariables / totalGastos) * 100) : 0;

  totalGastosFijos.textContent = formatearNumero(gastosFijos);
  totalGastosVariables.textContent = formatearNumero(gastosVariables);
  porcentajeFijos.textContent = `(${pctFijos}%)`;
  porcentajeVariables.textContent = `(${pctVariables}%)`;

  // Desglose por categoría
  if (!categoriasList) return;

  const porCategoria = {};
  datos[mesActual].gastos.forEach((g) => {
    const val = parseInt(g.valor) || 0;
    if (val <= 0) return;
    const cat = g.categoria || "Otros";
    porCategoria[cat] = (porCategoria[cat] || 0) + val;
  });

  const sortedCats = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);

  categoriasList.innerHTML = "";
  if (sortedCats.length === 0) {
    categoriasList.innerHTML = `<p class="categorias-empty">Sin gastos registrados aún.</p>`;
    return;
  }

  sortedCats.forEach(([cat, total]) => {
    const pct = totalGastos > 0 ? Math.round((total / totalGastos) * 100) : 0;
    const div = document.createElement("div");
    div.className = "categoria-item";
    div.innerHTML = `
      <div class="categoria-header">
        <span class="categoria-nombre">${cat}</span>
        <span class="categoria-total">${formatearNumero(total)}</span>
        <span class="categoria-pct">${pct}%</span>
      </div>
      <div class="categoria-bar-track">
        <div class="categoria-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    categoriasList.appendChild(div);
  });
}

function agregarItem(tipo) {
  const items = datos[mesActual][tipo];
  const ultimoItem = items[items.length - 1];

  // Validar si el último ítem está vacío
  if (ultimoItem && (ultimoItem.descripcion.trim() === "" || ultimoItem.valor.toString().trim() === "")) {
    const listId = `${tipo}-list`;
    const listElement = document.getElementById(listId);
    const itemElements = listElement.querySelectorAll('.item');
    const ultimoElement = itemElements[itemElements.length - 1];

    if (ultimoElement) {
      ultimoElement.classList.add('item-shake');
      const inputs = ultimoElement.querySelectorAll('input[type="text"]');
      
      if (ultimoItem.descripcion.trim() === "") {
        inputs[0].focus();
        inputs[0].classList.add('input-error');
        setTimeout(() => inputs[0].classList.remove('input-error'), 1000);
      } else {
        inputs[1].focus();
        inputs[1].classList.add('input-error');
        setTimeout(() => inputs[1].classList.remove('input-error'), 1000);
      }
      
      setTimeout(() => ultimoElement.classList.remove('item-shake'), 500);
    }
    return;
  }

  const categorias = tipo === "gastos" ? CATEGORIAS_GASTOS : CATEGORIAS_INGRESOS;
  items.push({
    id: generarId(),
    descripcion: "",
    valor: "",
    categoria: categorias[categorias.length - 1],
    notas: "",
    fechaCreacion: "",
    ...(tipo === "gastos" ? { recurrente: false } : {}),
  });

  renderizarItems(`${tipo}-list`, items);
  actualizarTotales();
  guardarDatos();

  // Enfocar automáticamente el nuevo ítem
  setTimeout(() => {
    const listId = `${tipo}-list`;
    const listElement = document.getElementById(listId);
    const itemElements = listElement.querySelectorAll('.item');
    const nuevoElement = itemElements[itemElements.length - 1];
    if (nuevoElement) {
      nuevoElement.querySelector('input').focus();
    }
  }, 50);
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
          ingresos: [],
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
      Categoría: item.categoria || "Otros",
      Valor: parseInt(item.valor) || 0,
      "Fecha Registro": formatearFecha(item.fechaCreacion, true),
    }));

  // Preparar datos de gastos
  const gastosData = datos[mes].gastos
    .filter((item) => item.descripcion || item.valor)
    .map((item) => ({
      Descripción: item.descripcion || "",
      Categoría: item.categoria || "Otros",
      Valor: parseInt(item.valor) || 0,
      Tipo: item.recurrente ? "Fijo" : "Variable",
      "Fecha Registro": formatearFecha(item.fechaCreacion, true),
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

document.addEventListener("DOMContentLoaded", () => {
  migrarDatos();
  cargarDatos();

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
