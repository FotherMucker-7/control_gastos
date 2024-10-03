let datos = {};
let mesActual;

function obtenerMesActual() {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
}

function inicializarMes(mes) {
    if (!datos[mes]) {
        datos[mes] = {
            ingresos: [{ descripcion: '', valor: '' }],
            gastos: [{ descripcion: '', valor: '' }]
        };
    }
}

function cargarDatos() {
    const datosGuardados = localStorage.getItem('controlGastos');
    if (datosGuardados) {
        datos = JSON.parse(datosGuardados);
    }
    mesActual = obtenerMesActual();
    inicializarMes(mesActual);
    actualizarInterfaz();
}

function guardarDatos() {
    localStorage.setItem('controlGastos', JSON.stringify(datos));
}

function renderizarItems(listId, items) {
    const list = document.getElementById(listId);
    list.innerHTML = '';
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <input type="text" value="${item.descripcion}" placeholder="Descripción" class="descripcion-${listId === 'ingresos-list' ? 'ingreso' : 'gasto'}">
            <input type="text" value="${formatearNumeroEnTiempoReal(item.valor.toString())}" placeholder="Valor" class="valor-${listId === 'ingresos-list' ? 'ingreso' : 'gasto'}">
            <img src="icons/delete.svg" alt="Delete Icon" class="delete-icon">
        `;
        list.appendChild(div);

        const valorInput = div.querySelector('input[type="text"].valor-' + (listId === 'ingresos-list' ? 'ingreso' : 'gasto'));
        valorInput.addEventListener('input', (e) => {
            let formateado = formatearNumeroEnTiempoReal(e.target.value);
            e.target.value = formateado;
            item.valor = desformatearNumero(formateado);
            actualizarTotales();
            guardarDatos();
        });

        div.querySelector('input[type="text"].descripcion-' + (listId === 'ingresos-list' ? 'ingreso' : 'gasto')).addEventListener('input', (e) => {
            item.descripcion = e.target.value;
            guardarDatos();
        });

        div.querySelector('.delete-icon').addEventListener('click', () => {
            items.splice(index, 1);
            renderizarItems(listId, items);
            actualizarTotales();
            guardarDatos();
        });
    });
}

function formatearNumero(numero) {
    return '$' + numero.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatearNumeroEnTiempoReal(numero) {
    let valor = numero.replace(/\D/g, '');
    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function desformatearNumero(numeroFormateado) {
    return numeroFormateado.replace(/\./g, '');
}

function actualizarTotales() {
    let totalIngresos = datos[mesActual].ingresos.reduce((sum, item) => sum + (parseInt(item.valor) || 0), 0);
    let totalGastos = datos[mesActual].gastos.reduce((sum, item) => sum + (parseInt(item.valor) || 0), 0);

    document.getElementById('total-ingresos').textContent = formatearNumero(totalIngresos);
    document.getElementById('total-gastos').textContent = formatearNumero(totalGastos);
    
    const balance = totalIngresos - totalGastos;
    document.getElementById('balance').textContent = formatearNumero(balance);
    document.getElementById('balance').style.color = balance >= 0 ? 'green' : 'red';
}

function agregarItem(tipo) {
    datos[mesActual][tipo].push({ descripcion: '', valor: '' });
    renderizarItems(`${tipo}-list`, datos[mesActual][tipo]);
    actualizarTotales();
    guardarDatos();
}

function cambiarMes(direccion) {
    const [año, mes] = mesActual.split('-').map(Number);
    let nuevaFecha = new Date(año, mes - 1 + direccion, 1);
    mesActual = `${nuevaFecha.getFullYear()}-${(nuevaFecha.getMonth() + 1).toString().padStart(2, '0')}`;
    inicializarMes(mesActual);
    actualizarInterfaz();
}

function actualizarInterfaz() {
    document.getElementById('current-month').textContent = formatearMes(mesActual);
    renderizarItems('ingresos-list', datos[mesActual].ingresos);
    renderizarItems('gastos-list', datos[mesActual].gastos);
    actualizarTotales();
}

function formatearMes(mesString) {
    const [año, mes] = mesString.split('-');
    const fecha = new Date(año, mes - 1, 1);
    return fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    
    document.getElementById('agregar-ingreso').addEventListener('click', () => agregarItem('ingresos'));
    document.getElementById('agregar-gasto').addEventListener('click', () => agregarItem('gastos'));
    
    document.getElementById('prev-month').addEventListener('click', () => cambiarMes(-1));
    document.getElementById('next-month').addEventListener('click', () => cambiarMes(1));
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.log('Falló el registro del Service Worker:', error);
            });
    });
}