/**
 * @file app.js
 * @module Controlador/Principal
 * @description Punto de entrada y orquestador principal de Agromaguey Pro (VADE Software).
 *
 * Este módulo ES6 actúa como el único punto de carga del sistema de módulos.
 * Importa todas las funciones necesarias de las capas de Vista y Core,
 * gestiona el estado global de la aplicación, y expone las funciones
 * requeridas por los atributos onclick del HTML al objeto global window.
 *
 * Responsabilidades:
 * - Mantener el estado mutable del proyecto activo y el historial de simulaciones.
 * - Activar escenarios alternativos (destilación, cultivos intercalados).
 * - Inicializar y vincular los eventos del módulo microeconómico.
 * - Servir de puente entre los módulos ES6 y el scope global del DOM.
 */

// =====================================================================
// IMPORTACIONES
// =====================================================================

import {
    irAlWizard,
    irAInformativa,
    irPaso,
    toggleTipoCosecha,
    prepararPaso3,
    crearProyecto,
    renderizarEscenarioBase,
    renderizarMicroeconomia,
    generarEstadoResultados,
    cerrarEstadoResultados
} from './src/ui/dashboard.js';

// =====================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// =====================================================================

/**
 * Estado mutable del proyecto de simulación actualmente activo.
 * Es poblado por el asistente de configuración (wizard) y consultado
 * por todas las funciones de cálculo y renderizado.
 * @type {Object}
 */
const proyectoActual = {};

/**
 * Registro acumulado de simulaciones ejecutadas durante la sesión.
 * Permite al usuario comparar resultados entre diferentes escenarios.
 * @type {Array<Object>}
 */
const historialSimulaciones = [];

// =====================================================================
// FUNCIONES DEL CONTROLADOR
// =====================================================================

/**
 * Activa el escenario de destilación de mezcal y recalcula la simulación.
 *
 * Modifica el modelo de negocio del proyecto activo a "con-palenque",
 * lo que redirige los ingresos del canal de venta de materia prima cruda
 * al canal de producto terminado (mezcal destilado), con sus costos
 * de procesamiento asociados.
 *
 * @returns {void}
 */
function simularMezcal() {
    proyectoActual.modelo = "con-palenque";
    renderizarEscenarioBase(proyectoActual);
}

/**
 * Activa el escenario de cultivos intercalados y recalcula la simulación.
 *
 * Los cultivos intercalados (milpa, frijol, calabaza) reducen el costo
 * de mantenimiento por planta en un 30% debido a la sinergia agroecológica:
 * mejora de la retención de humedad, control natural de plagas y generación
 * de ingresos complementarios durante el período de maduración del agave.
 *
 * @returns {void}
 */
function simularCultivos() {
    proyectoActual.cultivosIntercalados = true;
    renderizarEscenarioBase(proyectoActual);
}

/**
 * Inicializa los controles interactivos del módulo de análisis microeconómico.
 *
 * Vincula los eventos del switch de palenque propio y el slider de precio
 * de venta con la función de renderizado del modelo de oferta y demanda.
 * Ejecuta un renderizado inicial para sincronizar el estado visual con
 * los datos del proyecto activo.
 *
 * @returns {void}
 */
function inicializarMicroeconomia() {
    document.getElementById('togglePalenque').addEventListener('change', () => {
        renderizarMicroeconomia(proyectoActual);
    });

    document.getElementById('sliderPrecio').addEventListener('input', (e) => {
        document.getElementById('valorPrecio').innerText = `$${e.target.value}`;
        renderizarMicroeconomia(proyectoActual);
    });
    
    renderizarMicroeconomia(proyectoActual);
}

// =====================================================================
// INICIALIZACIÓN DE EVENTOS DEL DOM
// =====================================================================

/**
 * Vincula de manera programática todos los event listeners del DOM,
 * eliminando la necesidad de bindings onclick/onchange inline en el HTML.
 * Implementa delegación de eventos para componentes creados dinámicamente.
 *
 * @returns {void}
 */
function inicializarEventos() {
    // 1. Navegación e inicio
    const btnIrWizard = document.getElementById('btn-ir-wizard');
    if (btnIrWizard) btnIrWizard.addEventListener('click', irAlWizard);

    const btnIrInformativa = document.getElementById('btn-ir-informativa');
    if (btnIrInformativa) btnIrInformativa.addEventListener('click', irAInformativa);

    // 2. Navegación del Asistente (Wizard)
    const btnStep1Next = document.getElementById('btn-wizard-step1-next');
    if (btnStep1Next) btnStep1Next.addEventListener('click', () => irPaso(2));

    const wEstado = document.getElementById('w-estado');
    if (wEstado) wEstado.addEventListener('change', toggleTipoCosecha);

    const btnStep2Back = document.getElementById('btn-wizard-step2-back');
    if (btnStep2Back) btnStep2Back.addEventListener('click', () => irPaso(1));

    const btnStep2Next = document.getElementById('btn-wizard-step2-next');
    if (btnStep2Next) btnStep2Next.addEventListener('click', prepararPaso3);

    const btnStep3Back = document.getElementById('btn-wizard-step3-back');
    if (btnStep3Back) btnStep3Back.addEventListener('click', () => irPaso(2));

    const btnCrearProyecto = document.getElementById('btn-wizard-crear-proyecto');
    if (btnCrearProyecto) {
        btnCrearProyecto.addEventListener('click', () => crearProyecto(proyectoActual, inicializarMicroeconomia));
    }

    // 3. Vista de Estado de Resultados
    const btnCerrarEr = document.getElementById('btn-cerrar-er');
    if (btnCerrarEr) btnCerrarEr.addEventListener('click', cerrarEstadoResultados);

    // 4. Delegación de eventos para elementos dinámicos en la tabla de inventario
    const tablaBody = document.getElementById('tabla-body');
    if (tablaBody) {
        tablaBody.addEventListener('click', (e) => {
            const btnVerLote = e.target.closest('.btn-ver-lote');
            if (btnVerLote) {
                const anio = parseInt(btnVerLote.getAttribute('data-anio'));
                generarEstadoResultados(anio, proyectoActual);
            }
        });
    }

    // 5. Delegación de eventos para el botón en el Estado Vacío (Empty State)
    const vistaTabla = document.getElementById('vista-tabla');
    if (vistaTabla) {
        vistaTabla.addEventListener('click', (e) => {
            if (e.target.id === 'btn-empty-state-wizard') {
                irAlWizard();
            }
        });
    }

    // 6. Delegación de eventos para el banner de alerta de quiebra estructural
    const headerDesc = document.getElementById('header-desc');
    if (headerDesc) {
        headerDesc.addEventListener('click', (e) => {
            if (e.target.id === 'btn-activar-intercalados') {
                simularCultivos();
            } else if (e.target.id === 'btn-activar-destilacion') {
                simularMezcal();
            }
        });
    }
}

// Ejecutar vinculación de eventos al cargar el módulo
inicializarEventos();