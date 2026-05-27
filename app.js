// =====================================================================
// 1. VARIABLES GLOBALES Y DE NEGOCIO (ESTADO DE LA APLICACIÓN)
// =====================================================================
let proyectoActual = {}; 
let chartRef;
let historialSimulaciones = [];
let chartExcedentes = null; 

const COSTOS_FIJOS = {
    jornal: 300,
    empleados: 5,
    lenaPorLote: 1500,
    ventaPromedioMezcal: 450,
    costoMantenimientoPlanta: 15
};

const DATOS_AGAVE = {
    espadin: { precioKgCrudo: 10, kgPorPlanta: 50 },
    silvestre: { precioKgCrudo: 25, kgPorPlanta: 15 }
};

const PARAMETROS_MERCADO = {
    demanda: { ordenadaLitro: 2160 }, // Precio máximo por litro según PDF
    costos: {
        agavePorLitro: 125,
        envasado: 60,
        maquila: 425, // Si NO tiene palenque
        operacionPalenque: 77.45 // Si SÍ tiene palenque
    },
    produccion: {
        litrosEquilibrio: 800 // Nuestro lote base de 10 Toneladas
    }
};

// =====================================================================
// 2. NAVEGACIÓN SPA (Single Page Application)
// =====================================================================
function irAlWizard() {
    document.getElementById("seccion-informativa").classList.add("hidden");
    document.getElementById("seccion-wizard").classList.remove("hidden");
    document.getElementById("seccion-gestion").classList.add("hidden");
    irPaso(1);
    window.scrollTo(0, 0);
}

function irAInformativa() {
    document.getElementById("seccion-gestion").classList.add("hidden");
    document.getElementById("seccion-wizard").classList.add("hidden");
    document.getElementById("seccion-informativa").classList.remove("hidden");
    window.scrollTo(0, 0);
}

// =====================================================================
// 3. LÓGICA DEL ASISTENTE (WIZARD)
// =====================================================================
function irPaso(paso) {
    document.getElementById("step-1").classList.add("hidden");
    document.getElementById("step-2").classList.add("hidden");
    document.getElementById("step-3").classList.add("hidden");
    document.getElementById(`step-${paso}`).classList.remove("hidden");

    for (let i = 1; i <= 3; i++) {
        document.getElementById(`dot-${i}`).style.background = i <= paso ? 'var(--primary)' : '#333';
    }
}

function toggleTipoCosecha() {
    const estado = document.getElementById("w-estado").value;
    const containerCosecha = document.getElementById("container-cosecha");
    if (estado === "nueva") {
        containerCosecha.classList.add("hidden");
    } else {
        containerCosecha.classList.remove("hidden");
    }
}

function prepararPaso3() {
    const estado = document.getElementById("w-estado").value;
    const tipoCosecha = estado === "nueva" ? "unica" : document.getElementById("w-tipo-cosecha").value;
    const contenedor = document.getElementById("inventario-dinamico");
    contenedor.innerHTML = ""; 

    if (tipoCosecha === "unica") {
        contenedor.innerHTML = `
            <div class="input-group">
                <label>Plantas Totales (Unidades)</label>
                <input type="number" id="inv-plantas-totales" placeholder="Ej. 2000">
            </div>
            <div class="input-group">
                <label>Años estimados para la cosecha</label>
                <input type="number" id="inv-anios" placeholder="Ej. 8">
            </div>
        `;
    } else {
        let htmlEscalonado = `
            <div style="grid-column: 1 / -1; background: var(--dark-bg); padding: 15px; border-radius: 10px; border: 1px solid #333;">
                <label style="color: var(--primary); margin-bottom: 10px; display: block;">Inventario Escalonado</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
        `;
        for (let i = 1; i <= 8; i++) {
            htmlEscalonado += `
                <div class="input-group">
                    <label style="font-size: 0.7rem;">Faltan ${i} año(s)</label>
                    <input type="number" class="input-escalonada" data-anio="${i}" placeholder="0 plantas">
                </div>
            `;
        }
        htmlEscalonado += `</div></div>`;
        contenedor.innerHTML = htmlEscalonado;
    }
    irPaso(3);
}

// =====================================================================
// 4. CREACIÓN DE PROYECTO Y MOTOR MATEMÁTICO CHRONOLOGICAL
// =====================================================================
function crearProyecto() {
    proyectoActual.nombre = document.getElementById("w-nombre").value || "Proyecto Sin Nombre";
    proyectoActual.modelo = document.getElementById("w-modelo").value;
    proyectoActual.estado = document.getElementById("w-estado").value;
    proyectoActual.tipoCosecha = proyectoActual.estado === "nueva" ? "unica" : document.getElementById("w-tipo-cosecha").value;
    proyectoActual.variedad = document.getElementById("w-variedad").value;
    proyectoActual.presupuesto = parseFloat(document.getElementById("w-presupuesto").value);
    proyectoActual.inventario = [];
    proyectoActual.cultivosIntercalados = false; 

    let plantasTotales = 0;

    if (proyectoActual.tipoCosecha === "unica") {
        plantasTotales = parseFloat(document.getElementById("inv-plantas-totales").value) || 0;
        const anios = parseFloat(document.getElementById("inv-anios").value) || 0;
        proyectoActual.inventario.push({ aniosFaltantes: anios, plantas: plantasTotales });
    } else {
        const inputsEscalonados = document.querySelectorAll('.input-escalonada');
        inputsEscalonados.forEach(input => {
            const cantidad = parseFloat(input.value) || 0;
            if (cantidad > 0) {
                proyectoActual.inventario.push({ aniosFaltantes: parseInt(input.getAttribute('data-anio')), plantas: cantidad });
                plantasTotales += cantidad;
            }
        });
    }

    if (plantasTotales === 0 || isNaN(proyectoActual.presupuesto)) {
        alert("⚠️ Por favor, ingresa al menos una cantidad de plantas y tu presupuesto.");
        return;
    }

    proyectoActual.plantasTotales = plantasTotales;

    // --- ORDENACIÓN DE DATOS CIENCIA DE DATOS ---
    // Ordenamos el inventario cronológicamente por año de cosecha (del Año 1 al Año 8)
    proyectoActual.inventario.sort((a, b) => a.aniosFaltantes - b.aniosFaltantes);

    // --- Simulación de Flujo de Efectivo Dinámico Real (3 Años) ---
    let alertaLiquidez = false;
    let liquidezProyectada = proyectoActual.presupuesto;
    let costoMantenimientoAnual = plantasTotales * COSTOS_FIJOS.costoMantenimientoPlanta;

    for (let año = 1; año <= 3; año++) {
        liquidezProyectada -= costoMantenimientoAnual;
        let loteCosechado = proyectoActual.inventario.find(l => l.aniosFaltantes === año);
        if (loteCosechado) {
            // En el flujo de efectivo efectivo, sumamos el valor de la venta al 100% de madurez
            let ingresosLote = loteCosechado.plantas * DATOS_AGAVE[proyectoActual.variedad].kgPorPlanta * DATOS_AGAVE[proyectoActual.variedad].precioKgCrudo;
            liquidezProyectada += ingresosLote;
        }
        if (liquidezProyectada < 0) {
            alertaLiquidez = true;
            break;
        }
    }

    document.getElementById("seccion-wizard").classList.add("hidden");
    document.getElementById("seccion-gestion").classList.remove("hidden");
    document.getElementById("header-title").innerText = `Panel: ${proyectoActual.nombre}`;
    
    calcularEscenarioBase(alertaLiquidez);
    inicializarMicroeconomia();
}

function calcularEscenarioBase(alertaActiva) {
    const metricas = DATOS_AGAVE[proyectoActual.variedad];
    const tablaBody = document.getElementById("tabla-body");
    tablaBody.innerHTML = ""; 

    let ingresosGlobalesTotales = 0, costosGlobalesTotales = 0, utilidadGlobalTotal = 0;
    let acumuladoUtilidadEvolutiva = 0; 
    
    // Arrays para guardar la data que pintará la gráfica temporal
    let labelsGrafica = [];
    let dataGraficaAcumulada = [];

    // Cambiamos los encabezados de la tabla dinámicamente para reflejar la acumulación contable
    const tableHeader = document.querySelector(".table-box table thead tr");
    if(tableHeader) {
        tableHeader.innerHTML = `<th>Año Cosecha</th><th>Morfología / Destino</th><th>Biomasa Cosechada</th><th>Margen del Año</th><th>Utilidad Acumulada</th>`;
    }

    proyectoActual.inventario.forEach((lote) => {
        const aniosFaltantes = parseInt(lote.aniosFaltantes);
        const plantas = lote.plantas;

        // 🎯 MATEMÁTICAS EN TIEMPO DE COSECHA: Las plantas llegan al 100% de su peso óptimo
        const pesoEstimadoCosecha = plantas * metricas.kgPorPlanta;
        
        let ingresosLote = 0, costosLote = 0, produccionStr = "-";
        let destinoStr = proyectoActual.modelo === "solo-cultivo" ? "Venta en Pie" : "Destilación";

        if (proyectoActual.modelo === "solo-cultivo") {
            ingresosLote = pesoEstimadoCosecha * metricas.precioKgCrudo;
            // Solo calculamos el costo de los años que le restan para madurar
            costosLote = plantas * COSTOS_FIJOS.costoMantenimientoPlanta * aniosFaltantes; 
        } else {
            const botellas = Math.floor(pesoEstimadoCosecha / 10);
            ingresosLote = botellas * COSTOS_FIJOS.ventaPromedioMezcal;
            costosMantenimiento = plantas * COSTOS_FIJOS.costoMantenimientoPlanta * aniosFaltantes;
            const factorPalenque = botellas > 0 ? Math.ceil(botellas / 50) : 0; 
            costosProcesamiento = factorPalenque * (COSTOS_FIJOS.lenaPorLote + (COSTOS_FIJOS.jornal * COSTOS_FIJOS.empleados));
            costosLote = costosMantenimiento + costosProcesamiento;
        }

        if (proyectoActual.cultivosIntercalados) {
            costosLote *= 0.30; 
            destinoStr += " (Intercalado)";
        }

        const margenLote = ingresosLote - costosLote;
        
        // Sumamos al acumulador evolutivo de riqueza
        acumuladoUtilidadEvolutiva += margenLote;

        ingresosGlobalesTotales += ingresosLote;
        costosGlobalesTotales += costosLote;

        // Guardamos los datos para los ejes de la gráfica
        labelsGrafica.push(`Año ${aniosFaltantes}`);
        dataGraficaAcumulada.push(acumuladoUtilidadEvolutiva);

        tablaBody.innerHTML += `
            <tr onclick="generarEstadoResultados(${aniosFaltantes})" 
                style="cursor: pointer; transition: background 0.2s;" 
                onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'" 
                onmouseout="this.style.background='transparent'"
                title="Haz clic para ver el Estado de Resultados de este año">
                <td style="font-weight: bold; color: #e5e7eb;">📅 Año +${aniosFaltantes}</td>
                <td>${proyectoActual.variedad.toUpperCase()} / ${destinoStr}</td>
                <td>${pesoEstimadoCosecha.toLocaleString('es-MX')} kg</td>
                <td class="${margenLote >= 0 ? 'text-green' : 'text-red'}">$${margenLote.toLocaleString('es-MX')}</td>
                <td style="font-weight: bold;" class="${acumuladoUtilidadEvolutiva >= 0 ? 'text-green' : 'text-red'}">$${acumuladoUtilidadEvolutiva.toLocaleString('es-MX')}</td>
            </tr>
        `;
    });

    utilidadGlobalTotal = ingresosGlobalesTotales - costosGlobalesTotales;

    // Control de Mensajes e Inyección de Simuladores Rápidos
    const headerDesc = document.getElementById("header-desc");
    if (alertaActiva) {
        headerDesc.innerHTML = `⚠️ <strong>Riesgo de Liquidez en ciclo temprano:</strong> El presupuesto inicial no cubre los costos operativos antes de tus primeras cosechas. <br>
            <div style="margin-top: 12px; display: flex; gap: 10px;">
                ${!proyectoActual.cultivosIntercalados ? `<button class="btn-save" style="padding: 8px 15px; width: auto; background: #10b981; font-size: 0.85rem;" onclick="simularCultivos()">🌱 Activar Cultivos Intercalados</button>` : ''}
                ${proyectoActual.modelo === 'solo-cultivo' ? `<button class="btn-save" style="padding: 8px 15px; width: auto; background: #3b82f6; font-size: 0.85rem;" onclick="simularMezcal()">🥃 Activar Destilación (Mezcal)</button>` : ''}
            </div>`;
        headerDesc.style.color = "#f59e0b";
    } else {
        headerDesc.innerHTML = "✔️ Estructura de Cosecha Escalonada Financieramente Sostenible. Flujo de efectivo saludable.";
        headerDesc.style.color = "var(--primary)";
    }

    // KPIs globales consolidados al final del horizonte de inversión
    document.getElementById("ingresos-val").innerText = `$${ingresosGlobalesTotales.toLocaleString('es-MX')}`;
    document.getElementById("costos-val").innerText = `$${costosGlobalesTotales.toLocaleString('es-MX')}`;
    const balEl = document.getElementById("balance-val");
    balEl.innerText = `$${utilidadGlobalTotal.toLocaleString('es-MX')}`;
    balEl.className = utilidadGlobalTotal >= 0 ? 'text-green' : 'text-red';

    cerrarEstadoResultados();
    
    // Mandamos los datos a la nueva función de gráficas de evolución temporal
    renderGraficaEvolutiva(labelsGrafica, dataGraficaAcumulada);
}

// =====================================================================
// 5. SIMULADORES RÁPIDOS
// =====================================================================
function simularMezcal() {
    proyectoActual.modelo = "con-palenque";
    calcularEscenarioBase(false); 
}

function simularCultivos() {
    proyectoActual.cultivosIntercalados = true;
    calcularEscenarioBase(false);
}

// =====================================================================
// 6. ESTADO DE RESULTADOS (CARD FLIP) - CORREGIDO PARA 100% MADUREZ
// =====================================================================
function generarEstadoResultados(aniosFaltantes) {
    const metricas = DATOS_AGAVE[proyectoActual.variedad];
    const lote = proyectoActual.inventario.find(l => parseInt(l.aniosFaltantes) === aniosFaltantes);
    
    if (!lote) return;

    const plantas = lote.plantas;
    
    // 🎯 CORRECCIÓN: Eliminamos el factor de madurez actual. 
    // Proyectamos el peso al momento exacto de la cosecha (100% de biomasa).
    const pesoEstimadoCosecha = plantas * metricas.kgPorPlanta;
    
    let ingresos = 0, costosMantenimiento = 0, costosProcesamiento = 0;

    if (proyectoActual.modelo === "solo-cultivo") {
        ingresos = pesoEstimadoCosecha * metricas.precioKgCrudo;
        // Costo de mantenimiento acumulado por los años que restan
        costosMantenimiento = plantas * COSTOS_FIJOS.costoMantenimientoPlanta * aniosFaltantes;
        if (proyectoActual.cultivosIntercalados) costosMantenimiento *= 0.30;
    } else {
        const botellas = Math.floor(pesoEstimadoCosecha / 10);
        ingresos = botellas * COSTOS_FIJOS.ventaPromedioMezcal;
        
        costosMantenimiento = plantas * COSTOS_FIJOS.costoMantenimientoPlanta * aniosFaltantes;
        if (proyectoActual.cultivosIntercalados) costosMantenimiento *= 0.30;
        
        // Costos de palenque calculados sobre el 100% de la producción futura
        const factorPalenque = botellas > 0 ? Math.ceil(botellas / 50) : 0; 
        costosProcesamiento = factorPalenque * (COSTOS_FIJOS.lenaPorLote + (COSTOS_FIJOS.jornal * COSTOS_FIJOS.empleados));
    }

    const utilidadNetaLote = ingresos - (costosMantenimiento + costosProcesamiento);

    // Animación y cambio de vista
    document.getElementById("titulo-caja-derecha").innerText = "📊 Estado de Resultados Proforma";
    document.getElementById("vista-tabla").classList.add("hidden");
    document.getElementById("vista-er").classList.remove("hidden");
    
    // Actualizamos el subtítulo para indicar que es una proyección a cosecha
    document.getElementById("er-titulo-lote").innerHTML = `Análisis del Lote T-${aniosFaltantes} <span style="color:var(--text-dim); font-size:0.85rem;">(Proyección a Cosecha Óptima)</span>`;
    document.getElementById("er-ingresos").innerText = `$${ingresos.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    document.getElementById("er-costos").innerText = `-$${costosMantenimiento.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    document.getElementById("er-procesamiento").innerText = `-$${costosProcesamiento.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    
    const utilEl = document.getElementById("er-utilidad");
    utilEl.innerText = `$${utilidadNetaLote.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    utilEl.className = utilidadNetaLote >= 0 ? 'text-green' : 'text-red';
}

function cerrarEstadoResultados() {
    const vistaEr = document.getElementById("vista-er");
    const vistaTabla = document.getElementById("vista-tabla");
    
    // Evita errores si la vista aún no está renderizada en el DOM
    if(vistaEr && vistaTabla) {
        document.getElementById("titulo-caja-derecha").innerText = "📋 Resumen de Inventario Vivo";
        vistaEr.classList.add("hidden");
        vistaTabla.classList.remove("hidden");
    }
}

// =====================================================================
// 7. GRÁFICAS ADAPTADAS A LÍNEA DE TIEMPO (CHART.JS)
// =====================================================================
function renderGraficaEvolutiva(labels, datosAcumulados) {
    const ctx = document.getElementById('graficaFinanciera').getContext('2d');
    if (chartRef) chartRef.destroy();

    // Actualizamos el título de la caja de la gráfica
    document.querySelector(".chart-box h3").innerText = "📈 Curva de Acumulación de Riqueza";

    // Creamos una gráfica de línea de área rellena, ideal para presupuestos y flujos contables acumulados
    chartRef = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Utilidad Neta Acumulada ($ MXN)',
                data: datosAcumulados,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 3,
                pointBackgroundColor: '#10b981',
                pointRadius: 5
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { 
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
                    ticks: { color: '#9ca3af' },
                    title: { display: true, text: 'Patrimonio Neto ($)', color: '#9ca3af' }
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { color: '#e5e7eb', font: { weight: 'bold' } },
                    title: { display: true, text: 'Horizonte de Tiempo de Cosecha', color: '#9ca3af' }
                }
            }
        }
    });
}

// =====================================================================
// 8. MODELO MICROECONÓMICO: OFERTA, DEMANDA Y EXCEDENTES
// =====================================================================

function inicializarMicroeconomia() {
    document.getElementById('togglePalenque').addEventListener('change', calcularMicroeconomia);
    document.getElementById('sliderPrecio').addEventListener('input', (e) => {
        document.getElementById('valorPrecio').innerText = `$${e.target.value}`;
        calcularMicroeconomia();
    });
    
    calcularMicroeconomia();
}

function calcularMicroeconomia() {
    const tienePalenque = document.getElementById('togglePalenque').checked;
    const precioBotella = parseFloat(document.getElementById('sliderPrecio').value);

    // A. Calcular parámetros por BOTELLA (750ml)
    const botellasEquilibrio = Math.floor(PARAMETROS_MERCADO.produccion.litrosEquilibrio / 0.75); // ~1,066 botellas
    const precioMaximoBotella = PARAMETROS_MERCADO.demanda.ordenadaLitro * 0.75; // $1,620

    // B. Determinar Costo Base por Litro y pasarlo a Botella
    let costoBaseLitro = PARAMETROS_MERCADO.costos.agavePorLitro + PARAMETROS_MERCADO.costos.envasado;
    costoBaseLitro += tienePalenque ? PARAMETROS_MERCADO.costos.operacionPalenque : PARAMETROS_MERCADO.costos.maquila;
    
    const costoBaseBotella = costoBaseLitro * 0.75; // Costo exacto por botella de 750ml

    // C. Calcular Alturas para Excedentes (Evitamos que se inviertan si el costo supera al precio)
    const alturaProductor = Math.max(0, precioBotella - costoBaseBotella);
    const alturaConsumidor = Math.max(0, precioMaximoBotella - precioBotella);

    // D. Calcular Áreas (Base = 1,066 botellas)
    const excedenteProductor = (botellasEquilibrio * alturaProductor) / 2;
    const excedenteConsumidor = (botellasEquilibrio * alturaConsumidor) / 2;

    actualizarGraficaExcedentes(costoBaseBotella, precioBotella, precioMaximoBotella, botellasEquilibrio, excedenteProductor, excedenteConsumidor);
}

function actualizarGraficaExcedentes(costoBase, precioBotella, precioMaximo, botellasEquilibrio, exProductor, exConsumidor) {
    const ctx = document.getElementById('graficaExcedentes').getContext('2d');
    if (chartExcedentes) chartExcedentes.destroy();

    // Coordenadas (x=0 hasta x=1066 botellas)
    const dataDemanda = [{x: 0, y: precioMaximo}, {x: botellasEquilibrio, y: precioBotella}];
    const dataOferta = [{x: 0, y: costoBase}, {x: botellasEquilibrio, y: Math.max(costoBase, precioBotella)}];
    const dataPrecioEquilibrio = [{x: 0, y: precioBotella}, {x: botellasEquilibrio, y: precioBotella}];

    chartExcedentes = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Curva de Demanda',
                    data: dataDemanda,
                    borderColor: '#3b82f6', // Azul
                    borderWidth: 2,
                    fill: { target: 2, above: 'rgba(59, 130, 246, 0.2)' },
                    pointRadius: 0, tension: 0
                },
                {
                    label: 'Curva de Oferta',
                    data: dataOferta,
                    borderColor: '#f43f5e', // Rojo
                    borderWidth: 2,
                    fill: { target: 2, below: 'rgba(16, 185, 129, 0.3)' },
                    pointRadius: 0, tension: 0
                },
                {
                    label: 'Precio de Mercado ($/Botella)',
                    data: dataPrecioEquilibrio,
                    borderColor: '#9ca3af', // Gris
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false, pointRadius: 0
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                title: {
                    display: true,
                    text: `Excedente Productor (Marca): $${Math.round(exProductor).toLocaleString('es-MX')} | Excedente Consumidor: $${Math.round(exConsumidor).toLocaleString('es-MX')}`,
                    color: '#e5e7eb',
                    font: { size: 14 }
                },
                legend: { labels: { color: '#9ca3af' } },
                tooltip: {
                    callbacks: {
                        label: function(context) { return `${context.dataset.label}: $${context.raw.y.toFixed(2)}`; }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0, max: botellasEquilibrio,
                    title: { display: true, text: 'Cantidad de Botellas Vendidas (750ml)', color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                },
                y: {
                    min: 0, max: precioMaximo + 100, // Topa la gráfica arribita del precio máximo
                    title: { display: true, text: 'Precio por Botella ($ MXN)', color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}