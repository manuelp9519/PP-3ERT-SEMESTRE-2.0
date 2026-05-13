// --- NAVEGACIÓN SPA ---
function irALAlmacen() {
    document.getElementById("seccion-informativa").classList.add("hidden");
    document.getElementById("seccion-gestion").classList.remove("hidden");
    window.scrollTo(0, 0);
}

function irAInformativa() {
    document.getElementById("seccion-gestion").classList.add("hidden");
    document.getElementById("seccion-informativa").classList.remove("hidden");
    window.scrollTo(0, 0);
}

// --- LÓGICA DE NEGOCIO (DATOS PDF) ---
let baseDeDatos = [];
let chartRef;

const COSTOS_FIJOS = {
    jornal: 300,
    empleados: 5,
    lenaPorLote: 1500, // Proporción de los $9000
    ventaPromedio: 450
};

function registrarOperacion() {
    const variedad = document.getElementById("tipo-agave").value;
    const kg = document.getElementById("input-kg").value;
    const botellas = document.getElementById("input-botellas").value;

    if (!kg || !botellas) {
        alert("⚠️ Completa los datos");
        return;
    }

    const ingresos = parseInt(botellas) * COSTOS_FIJOS.ventaPromedio;
    const costos = COSTOS_FIJOS.lenaPorLote + (COSTOS_FIJOS.jornal * COSTOS_FIJOS.empleados);

    baseDeDatos.push({
        id: baseDeDatos.length + 1,
        variedad: variedad === 'espadin' ? 'Espadín' : 'Silvestre',
        peso: kg,
        unidades: botellas,
        ingreso: ingresos,
        costo: costos
    });

    const fb = document.getElementById("feedback-operacion");
    fb.innerHTML = `<p style="color:var(--primary); font-size:0.8rem; margin-top:10px;">✔ Lote #${baseDeDatos.length} guardado</p>`;
    
    document.getElementById("input-kg").value = "";
    document.getElementById("input-botellas").value = "";

    if (document.getElementById("rolSelect").value === "supervisor") actualizarDashboard();
}

function gestionarAcceso() {
    const rol = document.getElementById("rolSelect").value;
    const admin = document.getElementById("seccion-admin");
    
    if (rol === "supervisor") {
        admin.classList.remove("hidden");
        actualizarDashboard();
    } else {
        admin.classList.add("hidden");
    }
}

function actualizarDashboard() {
    let tIng = 0, tCos = 0;
    const tabla = document.getElementById("tabla-body");
    tabla.innerHTML = "";

    baseDeDatos.forEach(r => {
        tIng += r.ingreso;
        tCos += r.costo;
        const ganancia = r.ingreso - r.costo;

        tabla.innerHTML += `
            <tr>
                <td>#${r.id}</td>
                <td>${r.variedad}</td>
                <td>${r.peso}kg</td>
                <td>${r.unidades}u.</td>
                <td class="${ganancia >= 0 ? 'text-green' : 'text-red'}">$${ganancia}</td>
            </tr>`;
    });

    document.getElementById("ingresos-val").innerText = `$${tIng.toLocaleString()}`;
    document.getElementById("costos-val").innerText = `$${tCos.toLocaleString()}`;
    const bal = tIng - tCos;
    const balEl = document.getElementById("balance-val");
    balEl.innerText = `$${bal.toLocaleString()}`;
    balEl.className = bal >= 0 ? 'text-green' : 'text-red';

    renderGrafica(tIng, tCos);
}

function renderGrafica(i, c) {
    const ctx = document.getElementById('graficaFinanciera').getContext('2d');
    if (chartRef) chartRef.destroy();

    chartRef = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ventas', 'Gastos'],
            datasets: [{
                data: [i, c],
                backgroundColor: ['#10b981', '#f43f5e'],
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af' } } },
            cutout: '75%'
        }
    });
}  