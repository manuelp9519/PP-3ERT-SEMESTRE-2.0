/**
 * @file dashboard.js
 * @module UI/Dashboard
 * @description Módulo de interfaz de usuario y renderizado del panel de gestión
 * para Agromaguey Pro (VADE Software).
 *
 * Gestiona la navegación SPA (Single Page Application), el asistente de
 * configuración (wizard) de tres pasos, la creación de proyectos, el
 * renderizado de tablas y tarjetas financieras, el Estado de Resultados
 * Proforma por lote, y el módulo interactivo de análisis microeconómico.
 *
 * Todas las funciones de este módulo operan exclusivamente sobre el DOM,
 * delegando los cálculos financieros y estadísticos al Core Matemático.
 */

import { COSTOS_FIJOS, DATOS_AGAVE, FINANZAS_EXTERNAS } from '../config/constantes.js';
import { generarProyeccionesAgricolas, calcularFlujoNetoGlobal } from '../core/finanzas.js';
import { calcularEquilibrioYExcedentes } from '../core/mercado.js';
import { renderGraficaEvolutiva, actualizarGraficaExcedentes, renderizarGraficaRiesgo } from './charts.js';

// =====================================================================
// 1. NAVEGACIÓN SPA (Single Page Application)
// =====================================================================

/**
 * Navega a la sección del asistente de configuración (wizard).
 * Oculta las demás secciones de la aplicación y posiciona la vista
 * en el paso inicial del asistente.
 *
 * @returns {void}
 */
export function irAlWizard() {
    document.getElementById("seccion-informativa").classList.add("hidden");
    document.getElementById("seccion-wizard").classList.remove("hidden");
    document.getElementById("seccion-gestion").classList.add("hidden");
    irPaso(1);
    window.scrollTo(0, 0);
}

/**
 * Navega de regreso a la sección informativa principal (landing).
 * Oculta las secciones de gestión y wizard.
 *
 * @returns {void}
 */
export function irAInformativa() {
    document.getElementById("seccion-gestion").classList.add("hidden");
    document.getElementById("seccion-wizard").classList.add("hidden");
    document.getElementById("seccion-informativa").classList.remove("hidden");
    window.scrollTo(0, 0);
}

// =====================================================================
// 2. LÓGICA DEL ASISTENTE DE CONFIGURACIÓN (WIZARD)
// =====================================================================

/**
 * Avanza el asistente de configuración al paso indicado.
 * Actualiza los indicadores visuales de progreso (dots) y muestra
 * únicamente el panel del paso solicitado.
 *
 * @param {number} paso - Número del paso a mostrar (1, 2 o 3).
 * @returns {void}
 */
export function irPaso(paso) {
    document.getElementById("step-1").classList.add("hidden");
    document.getElementById("step-2").classList.add("hidden");
    document.getElementById("step-3").classList.add("hidden");
    document.getElementById(`step-${paso}`).classList.remove("hidden");

    for (let i = 1; i <= 3; i++) {
        document.getElementById(`dot-${i}`).style.background = i <= paso ? 'var(--primary)' : '#333';
    }
}

/**
 * Controla la visibilidad del selector de tipo de cosecha en función
 * del estado de la plantación. Si la plantación es nueva, no se ofrece
 * la opción de cosecha escalonada, ya que todas las plantas comparten
 * el mismo ciclo de maduración.
 *
 * @returns {void}
 */
export function toggleTipoCosecha() {
    const estado = document.getElementById("w-estado").value;
    const containerCosecha = document.getElementById("container-cosecha");
    if (estado === "nueva") {
        containerCosecha.classList.add("hidden");
    } else {
        containerCosecha.classList.remove("hidden");
    }
}

/**
 * Prepara y renderiza el formulario dinámico del paso 3 del asistente,
 * adaptándolo al tipo de cosecha seleccionado por el usuario.
 *
 * Para cosecha única, genera campos de cantidad total de plantas
 * y años estimados hasta la cosecha.
 *
 * Para cosecha escalonada, genera una cuadrícula de 8 campos que
 * permiten distribuir el inventario según los años restantes hasta
 * la madurez de cada lote, soportando plantaciones con múltiples
 * edades simultáneas.
 *
 * @returns {void}
 */
export function prepararPaso3() {
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
// 3. CREACIÓN DE PROYECTO Y SIMULACIÓN INICIAL
// =====================================================================

/**
 * Recopila los datos del asistente de configuración, construye el objeto
 * de estado del proyecto y ejecuta la primera simulación financiera.
 *
 * El proceso incluye:
 * 1. Lectura y validación de los campos del formulario (nombre, modelo,
 *    variedad, presupuesto, inventario).
 * 2. Construcción del inventario según el tipo de cosecha (única o escalonada).
 * 3. Ordenamiento cronológico del inventario por año de cosecha.
 * 4. Simulación de liquidez a 3 años: verifica que el presupuesto inicial
 *    sea suficiente para cubrir los costos de mantenimiento antes de que
 *    los primeros ingresos por cosecha se materialicen.
 * 5. Transición al panel de gestión y ejecución del renderizado completo:
 *    escenario base, módulo microeconómico y gráfica de riesgo climático.
 *
 * @param {Object} proyectoActual          - Referencia al estado global mutable del proyecto.
 * @param {Function} inicializarMicroeconomia - Callback del controlador para vincular los eventos del módulo microeconómico.
 * @returns {void}
 */
export function crearProyecto(proyectoActual, inicializarMicroeconomia) {
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

    proyectoActual.inventario.sort((a, b) => a.aniosFaltantes - b.aniosFaltantes);
	proyectoActual.aniosProyecto = proyectoActual.inventario[proyectoActual.inventario.length - 1].aniosFaltantes;

    // Simulación de flujo de efectivo a 3 años para validación de liquidez inicial
    let alertaLiquidez = false;
    let liquidezProyectada = proyectoActual.presupuesto;
    let costoMantenimientoAnual = plantasTotales * COSTOS_FIJOS.costoMantenimientoPlanta;

    for (let año = 1; año <= 3; año++) {
        liquidezProyectada -= costoMantenimientoAnual;
        let loteCosechado = proyectoActual.inventario.find(l => l.aniosFaltantes === año);
        if (loteCosechado) {
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
    
    renderizarEscenarioBase(proyectoActual); 
    inicializarMicroeconomia();
    renderizarGraficaRiesgo();
}

// =====================================================================
// 4. RENDERIZADO DEL ESCENARIO BASE
// =====================================================================

/**
 * Renderiza el panel de gestión completo a partir del estado actual del proyecto.
 *
 * Ejecuta la proyección agrícola a través del Core Matemático, construye
 * la tabla de inventario vivo con el desglose anual de ingresos y costos,
 * actualiza las tarjetas resumen superiores (ingresos, costos, balance),
 * alimenta la gráfica evolutiva de riqueza acumulada, calcula el flujo
 * neto global (incluyendo CAPEX, OPEX y provisión de riesgo) y actualiza
 * los KPIs financieros y el módulo microeconómico.
 *
 * Esta función es el punto central de sincronización entre el estado
 * del proyecto y la interfaz de usuario.
 *
 * @param {Object} proyectoActual - Referencia al estado global mutable del proyecto.
 * @returns {void}
 */
export function renderizarEscenarioBase(proyectoActual) {
    if (!proyectoActual || !proyectoActual.inventario || proyectoActual.inventario.length === 0) {
        const vistaTabla = document.getElementById("vista-tabla");
        if (vistaTabla) {
            vistaTabla.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🌱</div>
                    <p>Aún no hay datos configurados. Vuelve al asistente para planear tu cultivo.</p>
                    <button id="btn-empty-state-wizard">Planear Cultivo</button>
                </div>
            `;
        }
        document.getElementById("ingresos-val").innerText = "$0";
        document.getElementById("costos-val").innerText = "-$0";
        document.getElementById("balance-val").innerText = "$0";
        document.getElementById("balance-val").className = "";
        return;
    }

    const proyeccion = generarProyeccionesAgricolas(proyectoActual);

    const tablaBody = document.getElementById("tabla-body");
    tablaBody.innerHTML = ""; 

    const labelsEvolutiva = [];
    const datosEvolutiva = [];
    let utilidadAcumulada = 0;

    proyeccion.desglosePorAnio.forEach(fila => {
        const modeloTexto = proyectoActual.modelo === 'solo-cultivo' ? 'Venta Crudo' : 'Destilación';
        
        const botonDetalles = fila.kgCosechados > 0 
            ? `<button class="btn-ver-lote" data-anio="${fila.anio}" style="background: var(--primary); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">Ver Lote →</button>`
            : `<span style="color:var(--text-dim)">-</span>`;
            
        const biomasaTexto = fila.kgCosechados > 0 
            ? `${fila.kgCosechados.toLocaleString('es-MX')} kg`
            : `<span style="color:var(--text-dim)">En crecimiento 🌱</span>`;

        tablaBody.innerHTML += `
            <tr>
                <td>Año ${fila.anio}</td>
                <td>
                    <strong>${proyectoActual.variedad.toUpperCase()}</strong><br>
                    <small style="color:var(--text-dim)">(${modeloTexto})</small>
                </td>
                <td>${biomasaTexto}</td>
                <td>
                    <span class="text-green">+$${fila.ingresos.toLocaleString('es-MX')}</span><br>
                    <span class="text-red">-$${fila.costos.toLocaleString('es-MX')}</span>
                </td>
                <td>${botonDetalles}</td>
            </tr>
        `;
        
        labelsEvolutiva.push(`Año ${fila.anio}`);
        utilidadAcumulada += (fila.ingresos - fila.costos);
        datosEvolutiva.push(utilidadAcumulada);
    });

    document.getElementById("ingresos-val").innerText = `$${proyeccion.ingresosBrutosTotales.toLocaleString('es-MX')}`;
    document.getElementById("costos-val").innerText = `-$${proyeccion.costosDirectosTotales.toLocaleString('es-MX')}`;
    
    const balanceNeto = proyeccion.ingresosBrutosTotales - proyeccion.costosDirectosTotales;
    document.getElementById("balance-val").innerText = `$${balanceNeto.toLocaleString('es-MX')}`;
    document.getElementById("balance-val").className = balanceNeto >= 0 ? 'text-green' : 'text-red';

    renderGraficaEvolutiva(labelsEvolutiva, datosEvolutiva);

    const calculoFinanciero = calcularFlujoNetoGlobal(
        proyeccion.ingresosBrutosTotales, 
        proyeccion.costosDirectosTotales, 
        proyectoActual.aniosProyecto
    );

    actualizarKPIs(calculoFinanciero, proyectoActual);
    
    renderizarMicroeconomia(proyectoActual);
}

// =====================================================================
// 5. ESTADO DE RESULTADOS PROFORMA POR LOTE
// =====================================================================

/**
 * Genera y renderiza el Estado de Resultados Proforma para un lote específico
 * de cosecha, proyectado al 100% de madurez biológica.
 *
 * El cálculo proyecta los ingresos y costos al momento exacto de la cosecha
 * óptima, sin aplicar factores parciales de madurez. Esto permite al productor
 * evaluar la rentabilidad esperada de cada lote individual antes de que
 * alcance su punto de cosecha.
 *
 * La estructura del estado de resultados incluye:
 * - Ingresos: calculados según el modelo de negocio (venta cruda o destilación).
 * - Costos de mantenimiento: acumulados por los años restantes hasta la cosecha.
 * - Costos de procesamiento: aplicables solo en el modelo de destilación,
 *   calculados sobre el total de lotes de producción necesarios.
 * - Utilidad neta del lote: diferencia entre ingresos y costos totales.
 *
 * @param {number} aniosFaltantes - Año de cosecha del lote a analizar (coincide con el campo aniosFaltantes del inventario).
 * @param {Object} proyectoActual - Referencia al estado global mutable del proyecto.
 * @returns {void}
 */
export function generarEstadoResultados(aniosFaltantes, proyectoActual) {
    const metricas = DATOS_AGAVE[proyectoActual.variedad];
    const lote = proyectoActual.inventario.find(l => parseInt(l.aniosFaltantes) === aniosFaltantes);
    
    if (!lote) return;

    const plantas = lote.plantas;
    
    const pesoEstimadoCosecha = plantas * metricas.kgPorPlanta;
    
    let ingresos = 0, costosMantenimiento = 0, costosProcesamiento = 0;

    if (proyectoActual.modelo === "solo-cultivo") {
        ingresos = pesoEstimadoCosecha * metricas.precioKgCrudo;
        costosMantenimiento = plantas * COSTOS_FIJOS.costoMantenimientoPlanta * aniosFaltantes;
        if (proyectoActual.cultivosIntercalados) costosMantenimiento *= 0.30;
    } else {
        const botellas = Math.floor(pesoEstimadoCosecha / 10);
        ingresos = botellas * COSTOS_FIJOS.ventaPromedioMezcal;
        
        costosMantenimiento = plantas * COSTOS_FIJOS.costoMantenimientoPlanta * aniosFaltantes;
        if (proyectoActual.cultivosIntercalados) costosMantenimiento *= 0.30;
        
        const factorPalenque = botellas > 0 ? Math.ceil(botellas / 50) : 0; 
        costosProcesamiento = factorPalenque * (COSTOS_FIJOS.lenaPorLote + (COSTOS_FIJOS.jornal * COSTOS_FIJOS.empleados));
    }

    const utilidadNetaLote = ingresos - (costosMantenimiento + costosProcesamiento);

    document.getElementById("titulo-caja-derecha").innerText = "📊 Estado de Resultados Proforma";
    document.getElementById("vista-tabla").classList.add("hidden");
    document.getElementById("vista-er").classList.remove("hidden");
    
    document.getElementById("er-titulo-lote").innerHTML = `Análisis del Lote T-${aniosFaltantes} <span style="color:var(--text-dim); font-size:0.85rem;">(Proyección a Cosecha Óptima)</span>`;
    document.getElementById("er-ingresos").innerText = `$${ingresos.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    document.getElementById("er-costos").innerText = `-$${costosMantenimiento.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    document.getElementById("er-procesamiento").innerText = `-$${costosProcesamiento.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    
    const utilEl = document.getElementById("er-utilidad");
    utilEl.innerText = `$${utilidadNetaLote.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    utilEl.className = utilidadNetaLote >= 0 ? 'text-green' : 'text-red';
}

/**
 * Cierra la vista del Estado de Resultados Proforma y restaura
 * la vista de la tabla de inventario vivo.
 *
 * @returns {void}
 */
export function cerrarEstadoResultados() {
    const vistaEr = document.getElementById("vista-er");
    const vistaTabla = document.getElementById("vista-tabla");
    
    if(vistaEr && vistaTabla) {
        document.getElementById("titulo-caja-derecha").innerText = "📋 Resumen de Inventario Vivo";
        vistaEr.classList.add("hidden");
        vistaTabla.classList.remove("hidden");
    }
}

// =====================================================================
// 6. MODELO MICROECONÓMICO INTERACTIVO
// =====================================================================

/**
 * Recalcula y renderiza el módulo interactivo de análisis microeconómico
 * de oferta, demanda y excedentes de mercado.
 *
 * Adapta dinámicamente los controles del slider de precio según el
 * modelo de negocio activo (maguey crudo vs. mezcal destilado),
 * ajustando los rangos, pasos e incrementos.
 *
 * Ejecuta el cálculo de equilibrio de mercado a través del Core Matemático
 * y delega la visualización de las curvas y excedentes al módulo UI/Charts.
 *
 * @param {Object} proyectoActual - Referencia al estado global mutable del proyecto.
 * @returns {void}
 */
export function renderizarMicroeconomia(proyectoActual) {
    const proyeccion = generarProyeccionesAgricolas(proyectoActual);
    const esAgave = proyectoActual.modelo === 'solo-cultivo';
    const slider = document.getElementById("sliderPrecio");
    const labelPrecio = document.querySelector('label[for="sliderPrecio"]');
    
    if (esAgave) {
        slider.min = 5;
        slider.max = 35;
        slider.step = 1;
        if (slider.value > 35) slider.value = DATOS_AGAVE[proyectoActual.variedad].precioKgCrudo;
        labelPrecio.innerHTML = `Precio de Venta Agave Crudo (por Kg): <strong id="valorPrecio" style="color: var(--primary); font-size: 1.1rem;">$${slider.value}</strong>`;
    } else {
        slider.min = 300;
        slider.max = 1600;
        slider.step = 10;
        if (slider.value < 300) slider.value = COSTOS_FIJOS.ventaPromedioMezcal;
        labelPrecio.innerHTML = `Precio de Venta Mezcal (Botella 750ml): <strong id="valorPrecio" style="color: var(--primary); font-size: 1.1rem;">$${slider.value}</strong>`;
    }

    const precioActual = parseFloat(slider.value);
    const tienePalenque = document.getElementById("togglePalenque").checked;
    const volumen = esAgave ? proyeccion.kgTotales : proyeccion.litrosTotales;
    
    const analisisMercado = calcularEquilibrioYExcedentes(precioActual, volumen, proyectoActual.modelo, tienePalenque);

    if (!analisisMercado.viable) {
        console.warn("Precio fuera de límites rentables.");
        return;
    }

    actualizarGraficaExcedentes(
        analisisMercado.pMin, 
        precioActual, 
        analisisMercado.pMax, 
        volumen, 
        analisisMercado.excedenteProductor, 
        analisisMercado.excedenteConsumidor
    );
}

// =====================================================================
// 7. INDICADORES CLAVE DE DESEMPEÑO (KPIs)
// =====================================================================

/**
 * Actualiza las tarjetas de indicadores financieros clave (KPIs) en el
 * panel de gestión con los resultados del análisis de flujo neto global.
 *
 * Los indicadores mostrados son:
 * - CAPEX: gasto de capital inicial (valor fijo de configuración).
 * - OPEX acumulado: gasto operativo acumulado durante el horizonte temporal.
 * - Flujo neto acumulado: posición financiera neta del proyecto.
 * - Punto de equilibrio porcentual: proporción de egresos sobre ingresos ajustados.
 *
 * Adicionalmente, evalúa si el proyecto presenta riesgo de quiebra estructural
 * (flujo neto negativo) y renderiza las alertas y acciones correctivas
 * correspondientes (activación de cultivos intercalados o destilación).
 *
 * @param {Object} calculo - Resultado del análisis financiero global.
 * @param {number} calculo.opexTotalAcumulado        - OPEX acumulado (MXN).
 * @param {number} calculo.flujoNetoAcumulado         - Flujo neto acumulado (MXN).
 * @param {number} calculo.puntoEquilibrioPorcentual  - Punto de equilibrio (%).
 * @param {Object} proyectoActual - Referencia al estado global mutable del proyecto.
 * @returns {void}
 */
function actualizarKPIs(calculo, proyectoActual) {
    document.getElementById('kpi-capex').innerText = `$${FINANZAS_EXTERNAS.capex.toLocaleString('es-MX')}`;
    document.getElementById('kpi-opex').innerText = `$${calculo.opexTotalAcumulado.toLocaleString('es-MX')} (${proyectoActual.aniosProyecto} años)`;
    
    const flujoEl = document.getElementById('kpi-flujo-neto');
    flujoEl.innerText = `$${calculo.flujoNetoAcumulado.toLocaleString('es-MX', {maximumFractionDigits: 0})}`;
    flujoEl.className = calculo.flujoNetoAcumulado >= 0 ? 'text-green' : 'text-red';
    
    const peEl = document.getElementById('kpi-punto-equilibrio');
    peEl.innerText = `${calculo.puntoEquilibrioPorcentual.toFixed(2)}%`;
    peEl.style.color = calculo.puntoEquilibrioPorcentual > 100 ? '#f43f5e' : '#10b981'; 

    const headerDesc = document.getElementById("header-desc");
    if (calculo.flujoNetoAcumulado < 0) {
        headerDesc.innerHTML = `⚠️ <strong>Peligro de Quiebra Estructural:</strong> El flujo de efectivo libre es negativo. Los ingresos ajustados al riesgo no cubren el CAPEX y OPEX.<br>
            <div style="margin-top: 12px; display: flex; gap: 10px;">
                ${!proyectoActual.cultivosIntercalados ? `<button id="btn-activar-intercalados" class="btn-save" style="padding: 8px 15px; width: auto; background: #10b981; font-size: 0.85rem;">🌱 Activar Cultivos Intercalados</button>` : ''}
                ${proyectoActual.modelo === 'solo-cultivo' ? `<button id="btn-activar-destilacion" class="btn-save" style="padding: 8px 15px; width: auto; background: #3b82f6; font-size: 0.85rem;">🥃 Activar Destilación</button>` : ''}
            </div>`;
        headerDesc.style.color = "#f43f5e";
    } else {
        headerDesc.innerHTML = "Análisis financiero activo.";
        headerDesc.style.color = "var(--text-dim)";
    }
}