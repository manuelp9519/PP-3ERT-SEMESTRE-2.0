/**
 * @file charts.js
 * @module UI/Charts
 * @description Módulo de visualización gráfica para Agromaguey Pro (VADE Software).
 *
 * Gestiona la creación, actualización y destrucción de las gráficas de Chart.js
 * utilizadas en el panel de gestión:
 * - Curva de acumulación de riqueza (utilidad neta acumulada año con año).
 * - Gráfica de excedentes de mercado (curvas de oferta y demanda con áreas sombreadas).
 * - Campana de Gauss de riesgo climático (distribución de temperaturas).
 *
 * Cada función recibe datos preprocesados por los módulos del Core Matemático
 * y se limita a renderizar la representación visual correspondiente.
 *
 * @requires Chart.js (cargado globalmente)
 */

import { calcularGauss } from '../core/probabilidad.js';

/**
 * Referencia a la instancia activa de la gráfica de acumulación de riqueza.
 * Se destruye y recrea en cada renderizado para evitar superposición de datos.
 * @type {Chart|undefined}
 */
let chartRef;

/**
 * Referencia a la instancia activa de la gráfica de excedentes de mercado.
 * Se destruye y recrea en cada actualización del modelo microeconómico.
 * @type {Chart|null}
 */
let chartExcedentes = null; 

/**
 * Renderiza la gráfica de línea con área rellena que muestra la evolución
 * de la utilidad neta acumulada a lo largo del horizonte temporal del proyecto.
 *
 * Esta visualización permite al usuario identificar el punto de inflexión
 * donde la utilidad acumulada pasa de negativa a positiva, indicando
 * la recuperación de la inversión inicial.
 *
 * @param {string[]} labels          - Etiquetas del eje horizontal (e.g., "Año 1", "Año 2", ...).
 * @param {number[]} datosAcumulados - Valores de utilidad neta acumulada por período (MXN).
 * @returns {void}
 */
export function renderGraficaEvolutiva(labels, datosAcumulados) {
    const ctx = document.getElementById('graficaFinanciera').getContext('2d');
    if (chartRef) chartRef.destroy();

    document.querySelector(".chart-box h3").innerText = "📈 Curva de Acumulación de Riqueza";

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

/**
 * Renderiza la gráfica de excedentes de mercado con las curvas de oferta
 * y demanda, y el precio de equilibrio como línea punteada horizontal.
 *
 * Las áreas sombreadas representan visualmente:
 * - Excedente del consumidor (azul): diferencia entre la disposición a pagar
 *   y el precio efectivo, multiplicada por el volumen transado.
 * - Excedente del productor (verde): diferencia entre el precio recibido
 *   y el costo marginal mínimo, multiplicada por el volumen transado.
 *
 * @param {number} costoBase          - Costo marginal mínimo de producción (piso de la curva de oferta, MXN).
 * @param {number} precioBotella      - Precio de venta actual fijado por el productor (MXN).
 * @param {number} precioMaximo       - Precio máximo teórico de demanda (ordenada al origen, MXN).
 * @param {number} botellasEquilibrio - Volumen de producción en el punto de equilibrio (unidades).
 * @param {number} exProductor        - Valor monetario del excedente del productor (MXN).
 * @param {number} exConsumidor       - Valor monetario del excedente del consumidor (MXN).
 * @returns {void}
 */
export function actualizarGraficaExcedentes(costoBase, precioBotella, precioMaximo, botellasEquilibrio, exProductor, exConsumidor) {
    const ctx = document.getElementById('graficaExcedentes').getContext('2d');
    if (chartExcedentes) chartExcedentes.destroy();

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
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    fill: { target: 2, above: 'rgba(59, 130, 246, 0.2)' },
                    pointRadius: 0, tension: 0
                },
                {
                    label: 'Curva de Oferta',
                    data: dataOferta,
                    borderColor: '#f43f5e',
                    borderWidth: 2,
                    fill: { target: 2, below: 'rgba(16, 185, 129, 0.3)' },
                    pointRadius: 0, tension: 0
                },
                {
                    label: 'Precio de Mercado ($/Botella)',
                    data: dataPrecioEquilibrio,
                    borderColor: '#9ca3af',
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
                    min: 0, max: precioMaximo + 100,
                    title: { display: true, text: 'Precio por Botella ($ MXN)', color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

/**
 * Renderiza la campana de Gauss que visualiza la distribución de probabilidad
 * de temperaturas en la región de Santa María Albarradas.
 *
 * La gráfica segmenta la distribución en dos zonas codificadas por color:
 * - Zona roja (x < 0°C): representa la probabilidad acumulada de helada,
 *   que corresponde a la provisión de riesgo financiero aplicada al modelo.
 * - Zona verde (x ≥ 0°C): representa el escenario de operación segura
 *   donde las condiciones térmicas no comprometen la supervivencia del cultivo.
 *
 * Parámetros de la distribución:
 * - μ (media) = 7.4°C: temperatura promedio histórica de la región.
 * - σ (desviación estándar) = 2.9°C: dispersión térmica observada.
 *
 * @returns {void}
 */
export function renderizarGraficaRiesgo() {
    const canvas = document.getElementById('graficaProbabilidad');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    if (window.chartCampanaRiesgo) {
        window.chartCampanaRiesgo.destroy();
    }

    const mu = 7.4;
    const sigma = 2.9;
    
    const labels = [];
    const dataRiesgo = [];
    const dataViable = [];

    for (let i = -50; i <= 150; i++) {
        const xVal = i / 10;
        labels.push(xVal);
        
        const yVal = calcularGauss(xVal, mu, sigma);

        if (xVal < 0) {
            dataRiesgo.push(yVal);
            dataViable.push(null);
        } else if (xVal === 0) {
            dataRiesgo.push(yVal);
            dataViable.push(yVal);
        } else {
            dataRiesgo.push(null);
            dataViable.push(yVal);
        }
    }

    window.chartCampanaRiesgo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Provisión de Riesgo (< 0°C)',
                    data: dataRiesgo,
                    borderColor: 'rgba(244, 63, 94, 1)', 
                    backgroundColor: 'rgba(244, 63, 94, 0.3)',
                    fill: true,
                    pointRadius: 0,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Escenario Seguro (> 0°C)',
                    data: dataViable,
                    borderColor: 'rgba(16, 185, 129, 1)', 
                    backgroundColor: 'rgba(16, 185, 129, 0.3)',
                    fill: true,
                    pointRadius: 0,
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { labels: { color: '#e5e7eb' } },
                tooltip: {
                    callbacks: {
                        title: (context) => `Temperatura: ${context[0].label}°C`,
                        label: (context) => `Densidad: ${context.raw.toFixed(4)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af', maxTicksLimit: 15 },
                    title: { display: true, text: 'Temperatura (°C)', color: '#9ca3af' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { display: false }, 
                    title: { display: true, text: 'Densidad de Probabilidad', color: '#9ca3af' }
                }
            }
        }
    });
}