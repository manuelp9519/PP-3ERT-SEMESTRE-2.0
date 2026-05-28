/**
 * @file finanzas.js
 * @module Core/Finanzas
 * @description Módulo de proyecciones financieras y agrícolas para Agromaguey Pro (VADE Software).
 *
 * Contiene funciones puras que calculan la proyección cronológica de costos,
 * ingresos y biomasa cosechada, así como el flujo neto global considerando
 * CAPEX, OPEX acumulado y provisión de riesgo agroclimático.
 *
 * Estas funciones no acceden ni modifican el DOM; reciben datos estructurados
 * y retornan resultados que son consumidos por la capa de interfaz de usuario.
 */

import { COSTOS_FIJOS, DATOS_AGAVE, FINANZAS_EXTERNAS } from '../config/constantes.js';

/**
 * Genera la proyección anualizada de producción agrícola, costos directos e ingresos.
 *
 * Itera sobre el horizonte temporal del proyecto simulando año por año:
 * 1. Aplica una tasa de merma del 5% sobre el inventario vivo, reflejando
 *    pérdidas por mortalidad natural, plagas o condiciones adversas.
 * 2. Calcula los costos de mantenimiento proporcionales al inventario vivo.
 *    Si se activan cultivos intercalados, el costo se reduce en un 30%
 *    debido a la sinergia agroecológica y el ingreso complementario.
 * 3. Para cada año que coincide con una cosecha programada, calcula la
 *    biomasa extraída y los ingresos según el modelo de negocio:
 *    - "solo-cultivo": venta de piña de agave crudo por kilogramo.
 *    - "con-palenque": destilación y venta de mezcal por litro.
 * 4. Acumula las métricas globales de producción (litros y kg totales)
 *    necesarias para los análisis de mercado posteriores.
 *
 * @param {Object} proyecto - Objeto de estado del proyecto activo.
 * @param {number}   proyecto.plantasTotales      - Cantidad total de plantas en inventario inicial.
 * @param {string}   proyecto.variedad             - Variedad de agave ('espadin' o 'silvestre').
 * @param {number}   proyecto.aniosProyecto        - Horizonte temporal de la simulación (años).
 * @param {boolean}  proyecto.cultivosIntercalados  - Indica si los cultivos intercalados están activos.
 * @param {string}   proyecto.modelo               - Modelo de negocio ('solo-cultivo' o 'con-palenque').
 * @param {Array<Object>} proyecto.inventario      - Lotes de inventario con año de cosecha programado.
 * @param {number}   proyecto.inventario[].aniosFaltantes - Año en que el lote alcanza madurez y se cosecha.
 * @param {number}   proyecto.inventario[].plantas        - Cantidad de plantas en el lote.
 *
 * @returns {Object} Resultado de la proyección:
 *   @returns {Array<Object>} desglosePorAnio          - Detalle año por año.
 *   @returns {number} desglosePorAnio[].anio          - Número del año en la proyección.
 *   @returns {number} desglosePorAnio[].inventario    - Plantas vivas al final del año.
 *   @returns {number} desglosePorAnio[].ingresos      - Ingresos brutos del año (MXN).
 *   @returns {number} desglosePorAnio[].costos        - Costos directos del año (MXN).
 *   @returns {number} desglosePorAnio[].kgCosechados  - Kilogramos de agave cosechados en el año.
 *   @returns {number} ingresosBrutosTotales           - Suma de ingresos brutos de todos los años (MXN).
 *   @returns {number} costosDirectosTotales           - Suma de costos directos de todos los años (MXN).
 *   @returns {number} litrosTotales                   - Litros de mezcal producidos acumulados.
 *   @returns {number} kgTotales                       - Kilogramos de agave cosechados acumulados.
 */
export function generarProyeccionesAgricolas(proyecto) {
    let desglosePorAnio = [];
    let ingresosBrutosTotales = 0;
    let costosDirectosTotales = 0;
    let inventarioVivo = proyecto.plantasTotales;
    let litrosTotales = 0;
    let kgTotales = 0;

    const datosVariedad = DATOS_AGAVE[proyecto.variedad];

    for (let i = 1; i <= proyecto.aniosProyecto; i++) {
        let ingresosAnio = 0;
        let costosAnio = 0;
        let mermasAnio = Math.floor(inventarioVivo * 0.05); 
        
        inventarioVivo -= mermasAnio;

        costosAnio += COSTOS_FIJOS.costoMantenimientoPlanta * inventarioVivo;
        if (proyecto.cultivosIntercalados) {
            costosAnio *= 0.70; 
        }

        let loteCosechado = proyecto.inventario.find(l => l.aniosFaltantes === i);
        let kgCosechadosAnio = 0;

        if (loteCosechado) {
            kgCosechadosAnio = loteCosechado.plantas * datosVariedad.kgPorPlanta;
            kgTotales += kgCosechadosAnio;
            
            let litrosProducidos = kgCosechadosAnio / 10; 
            litrosTotales += litrosProducidos;
            
            if (proyecto.modelo === 'solo-cultivo') {
                ingresosAnio = kgCosechadosAnio * datosVariedad.precioKgCrudo;
            } else {
                ingresosAnio = litrosProducidos * COSTOS_FIJOS.ventaPromedioMezcal;
                costosAnio += COSTOS_FIJOS.lenaPorLote + (COSTOS_FIJOS.jornal * COSTOS_FIJOS.empleados);
            }
            
            inventarioVivo -= loteCosechado.plantas; 
            if(inventarioVivo < 0) inventarioVivo = 0;
        }

        ingresosBrutosTotales += ingresosAnio;
        costosDirectosTotales += costosAnio;

        desglosePorAnio.push({
            anio: i,
            inventario: inventarioVivo,
            ingresos: ingresosAnio,
            costos: costosAnio,
            kgCosechados: kgCosechadosAnio
        });
    }

    return { desglosePorAnio, ingresosBrutosTotales, costosDirectosTotales, litrosTotales, kgTotales };
}

/**
 * Calcula el flujo neto global del proyecto considerando la estructura
 * completa de egresos (CAPEX + OPEX acumulado + costos directos) y los
 * ingresos ajustados por la provisión de riesgo agroclimático.
 *
 * El flujo neto acumulado indica la posición financiera neta del proyecto:
 * un valor positivo señala rentabilidad acumulada, mientras que un valor
 * negativo indica riesgo de quiebra estructural.
 *
 * El punto de equilibrio porcentual expresa qué proporción de los ingresos
 * ajustados es absorbida por los egresos totales. Un valor superior al 100%
 * indica que el proyecto opera a pérdida.
 *
 * @param {number} ingresosProyectadosTotales - Ingresos brutos totales proyectados (MXN).
 * @param {number} costosDirectosTotales      - Costos directos acumulados de producción (MXN).
 * @param {number} aniosProyecto              - Horizonte temporal del proyecto (años).
 *
 * @returns {Object} Resultado del análisis financiero global:
 *   @returns {number} opexTotalAcumulado          - OPEX acumulado durante todo el horizonte temporal (MXN).
 *   @returns {number} ingresosAjustados           - Ingresos netos después de descontar la provisión de riesgo (MXN).
 *   @returns {number} flujoNetoAcumulado          - Diferencia entre ingresos ajustados y egresos totales (MXN).
 *   @returns {number} puntoEquilibrioPorcentual   - Proporción de egresos sobre ingresos ajustados (%).
 */
export function calcularFlujoNetoGlobal(ingresosProyectadosTotales, costosDirectosTotales, aniosProyecto) {
    const opexTotalAcumulado = FINANZAS_EXTERNAS.opexAnual * aniosProyecto;
    
    const egresosTotales = FINANZAS_EXTERNAS.capex + opexTotalAcumulado + costosDirectosTotales;
    
    const ingresosAjustados = ingresosProyectadosTotales * (1 - FINANZAS_EXTERNAS.provisionRiesgo);
    
    const flujoNetoAcumulado = ingresosAjustados - egresosTotales;
    
    let puntoEquilibrioPorcentual = 0;
    if (ingresosAjustados > 0) {
        puntoEquilibrioPorcentual = (egresosTotales / ingresosAjustados) * 100;
    }

    return {
        opexTotalAcumulado,
        ingresosAjustados,
        flujoNetoAcumulado,
        puntoEquilibrioPorcentual
    };
}