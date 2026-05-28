/**
 * @file mercado.js
 * @module Core/Mercado
 * @description Módulo de análisis microeconómico para Agromaguey Pro (VADE Software).
 *
 * Implementa el modelo de equilibrio parcial de mercado bajo supuestos de
 * competencia perfecta con curvas lineales de oferta y demanda.
 * Calcula los excedentes del productor y del consumidor, métricas fundamentales
 * para evaluar la distribución del bienestar económico generado por la
 * transacción entre productores de maguey/mezcal y compradores.
 *
 * El excedente del consumidor representa la ganancia neta que obtiene el
 * comprador al pagar un precio inferior al máximo que estaría dispuesto a pagar.
 * El excedente del productor representa la ganancia neta del vendedor al
 * recibir un precio superior a su costo marginal mínimo de producción.
 * Ambos se calculan como el área del triángulo formado entre la curva
 * respectiva y la línea de precio de mercado.
 */

import { PARAMETROS_MERCADO } from '../config/constantes.js';

/**
 * Calcula el punto de equilibrio del mercado y los excedentes económicos
 * para el producto seleccionado (maguey crudo o mezcal destilado).
 *
 * El modelo asume curvas lineales donde:
 * - La curva de demanda parte del precio máximo teórico (ordenada al origen)
 *   y desciende hasta el precio de venta en el volumen de equilibrio.
 * - La curva de oferta parte del costo marginal mínimo y asciende hasta
 *   el precio de venta en el volumen de equilibrio.
 *
 * Los excedentes se calculan geométricamente como el área de los triángulos
 * rectángulos delimitados por las curvas y el precio de mercado:
 *   Excedente = ((precio límite - precio de venta) × volumen) / 2
 *
 * Si el precio de venta se encuentra fuera del rango viable (por encima
 * del precio máximo o por debajo del costo mínimo), la operación se
 * considera inviable y la función retorna un indicador de no viabilidad.
 *
 * @param {number}  precioVenta   - Precio unitario de venta establecido por el productor (MXN).
 * @param {number}  volumen       - Volumen total de producción proyectada (litros o kg según el modelo).
 * @param {string}  modelo        - Modelo de negocio activo ('solo-cultivo' para maguey crudo, otro valor para mezcal destilado).
 * @param {boolean} tienePalenque - Indica si el productor dispone de palenque propio para destilación.
 * @returns {Object} Resultado del análisis de mercado:
 *   @returns {boolean} viable              - Indica si la operación es viable al precio dado.
 *   @returns {number}  [excedenteConsumidor] - Excedente del consumidor (MXN). Solo presente si viable = true.
 *   @returns {number}  [excedenteProductor]  - Excedente del productor (MXN). Solo presente si viable = true.
 *   @returns {number}  [pMin]                - Costo marginal mínimo de producción (MXN). Solo presente si viable = true.
 *   @returns {number}  [pMax]                - Precio máximo teórico de demanda (MXN). Solo presente si viable = true.
 *   @returns {number}  [precioOptimo]        - Precio de venta utilizado en el cálculo (MXN). Solo presente si viable = true.
 *   @returns {number}  [volumen]             - Volumen de producción utilizado en el cálculo. Solo presente si viable = true.
 */
export function calcularEquilibrioYExcedentes(precioVenta, volumen, modelo, tienePalenque) {
    const esAgave = modelo === 'solo-cultivo';
    
    const pMax = esAgave ? PARAMETROS_MERCADO.demandaMaguey.ordenadaKg : PARAMETROS_MERCADO.demandaMezcal.ordenadaLitro;
    const pMin = esAgave 
        ? PARAMETROS_MERCADO.costosMaguey.produccionKg 
        : (tienePalenque ? PARAMETROS_MERCADO.costosMezcal.operacionPalenque : PARAMETROS_MERCADO.costosMezcal.maquila);
    
    if (precioVenta >= pMax || precioVenta <= pMin) return { viable: false };

    const excedenteConsumidor = ((pMax - precioVenta) * volumen) / 2;
    const excedenteProductor = ((precioVenta - pMin) * volumen) / 2;
    
    return { viable: true, excedenteConsumidor, excedenteProductor, pMin, pMax, precioOptimo: precioVenta, volumen };
}