let registrosBD = [];
let chartInstance;

// DATOS BASADOS EN TUS PDFs
const REGLAS_NEGOCIO = {
    costoJornal: 300,
    personalLote: 5,
    costoLenaProporcional: 1500, // Basado en el lote de $9000
    precioVentaBotella: 450
};

function registrarOperacion() {
    const variedad = document.getElementById("tipo-agave").value;
    const kg = document.getElementById("input-kg").value;
    const botellas = document.getElementById("input-botellas").value;

    if (!kg || !botellas) {
        alert("⚠️ Datos incompletos");
        return;
    }

    // Cálculos Financieros
    const ingresoTotal = botellas * REGLAS_NEGOCIO.precioVentaBotella;
    const costoTotal = REGLAS_NEGOCIO.costoLenaProporcional + (REGLAS_NEGOCIO.costoJornal * REGLAS_NEGOCIO.personalLote);

    const data = {
        id: registrosBD.length + 1,
        variedad: variedad === 'espadin' ? 'Espadín' : 'Silvestre',
        peso: kg,
        unidades: parseInt(botellas),
        ingreso: ingresoTotal,
        costo: costoTotal
    };

    registrosBD.push(data);

    // Notificación
    const status = document.getElementById("status-msg");
    status.innerHTML = `<p style="color: var(--primary); font-size: 0.8rem; margin-top:10px">✔ Registro #${data.id} guardado</p>`;
    
    // Reset inputs
    document.getElementById("input-kg").value = "";
    document.getElementById("input-botellas").value = "";

    if (document.getElementById("rolSelect").value === "supervisor") actualizarDashboard();
}

function gestionarAcceso() {
    const rol = document.getElementById("rolSelect").value;
    const admin = document.getElementById("seccion-admin");
    const tit = document.getElementById("header-title");
    const desc = document.getElementById("header-desc");

    if (rol === "supervisor") {
        admin.classList.remove("hidden");
        tit.innerText = "Panel Administrativo";
        desc.innerText = "Análisis financiero y balance de producción.";
        actualizarDashboard();
    } else {
        admin.classList.add("hidden");
        tit.innerText = "Operaciones de Almacén";
        desc.innerText = "Registro de entrada y control de producción.";
    }
}

function actualizarDashboard() {
    let ingresosTotal = 0, gastosTotal = 0;
    const tbody = document.getElementById("tabla-body");
    tbody.innerHTML = "";

    registrosBD.forEach(r => {
        ingresosTotal += r.ingreso;
        gastosTotal += r.costo;
        const utilidad = r.ingreso - r.costo;

        tbody.innerHTML += `
            <tr>
                <td>#${r.id}</td>
                <td>${r.variedad}</td>
                <td>${r.peso} kg</td>
                <td>${r.unidades} u.</td>
                <td class="${utilidad >= 0 ? 'txt-green' : 'txt-red'}">$${utilidad}</td>
            </tr>`;
    });

    // Actualizar KPIs
    document.getElementById("ingresos-val").innerText = `$${ingresosTotal.toLocaleString()}`;
    document.getElementById("costos-val").innerText = `$${gastosTotal.toLocaleString()}`;
    
    const balance = ingresosTotal - gastosTotal;
    const balEl = document.getElementById("balance-val");
    balEl.innerText = `$${balance.toLocaleString()}`;
    balEl.className = balance >= 0 ? "txt-green" : "txt-red";

    actualizarGrafico(ingresosTotal, gastosTotal);
}

function actualizarGrafico(i, g) {
    const ctx = document.getElementById('graficaDonut').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{
                data: [i, g],
                backgroundColor: ['#10b981', '#f43f5e'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#9ca3af' } }
            },
            cutout: '75%'
        }
    });
} 
