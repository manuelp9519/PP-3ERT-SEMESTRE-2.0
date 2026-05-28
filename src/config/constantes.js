/**
 * @file constantes.js
 * @module Config/Constantes
 * @description Módulo de configuración centralizada para Agromaguey Pro (VADE Software).
 *
 * Define las constantes de negocio, parámetros de mercado y reglas financieras
 * que rigen las simulaciones agrícolas y de destilación. Todos los valores
 * representan condiciones base del mercado de maguey y mezcal en la región
 * de Santa María Albarradas, Oaxaca.
 *
 * Estas constantes son consumidas por los módulos del Core Matemático
 * (finanzas.js, mercado.js) y no deben modificarse en tiempo de ejecución.
 */

/**
 * Costos fijos operativos de la unidad productiva.
 * Representan los gastos recurrentes asociados a la mano de obra,
 * el procesamiento artesanal y el mantenimiento del inventario vegetal.
 *
 * @constant {Object} COSTOS_FIJOS
 * @property {number} jornal              - Pago diario por jornalero (MXN).
 * @property {number} empleados           - Número de jornaleros por lote de producción.
 * @property {number} lenaPorLote         - Costo de leña por lote de destilación (MXN).
 * @property {number} ventaPromedioMezcal - Precio promedio de venta por botella de mezcal de 750 ml (MXN).
 * @property {number} costoMantenimientoPlanta - Costo anual de mantenimiento por planta de agave (MXN).
 */
export const COSTOS_FIJOS = {
    jornal: 300,
    empleados: 5,
    lenaPorLote: 1500,
    ventaPromedioMezcal: 450,
    costoMantenimientoPlanta: 15
};

/**
 * Datos agronómicos por variedad de agave.
 * Cada variedad tiene un rendimiento de biomasa y un precio de venta
 * en el mercado de materia prima cruda (sin destilar).
 *
 * @constant {Object} DATOS_AGAVE
 * @property {Object} espadin            - Variedad Agave angustifolia (Espadín).
 * @property {number} espadin.precioKgCrudo  - Precio de mercado por kilogramo de piña cruda (MXN).
 * @property {number} espadin.kgPorPlanta    - Rendimiento promedio en kg de piña por planta madura.
 * @property {Object} silvestre          - Variedad Agave potatorum (Silvestre / Tobalá).
 * @property {number} silvestre.precioKgCrudo - Precio de mercado por kilogramo de piña cruda (MXN).
 * @property {number} silvestre.kgPorPlanta   - Rendimiento promedio en kg de piña por planta madura.
 */
export const DATOS_AGAVE = {
    espadin: { precioKgCrudo: 10, kgPorPlanta: 50 },
    silvestre: { precioKgCrudo: 25, kgPorPlanta: 15 }
};

/**
 * Parámetros del modelo microeconómico de oferta y demanda.
 * Define las ordenadas al origen de las curvas lineales de demanda y
 * los costos marginales de producción para ambos mercados:
 * mezcal destilado y maguey vendido en crudo.
 *
 * Estos valores permiten calcular el punto de equilibrio del mercado,
 * los excedentes del productor y del consumidor bajo un modelo
 * de competencia perfecta simplificado.
 *
 * @constant {Object} PARAMETROS_MERCADO
 *
 * @property {Object} demandaMezcal                   - Parámetros de la curva de demanda del mezcal.
 * @property {number} demandaMezcal.ordenadaLitro      - Precio máximo teórico por litro (ordenada al origen de la curva de demanda, MXN).
 *
 * @property {Object} costosMezcal                     - Estructura de costos de producción del mezcal.
 * @property {number} costosMezcal.agavePorLitro       - Costo de materia prima (agave) por litro producido (MXN).
 * @property {number} costosMezcal.envasado            - Costo de envasado por botella (MXN).
 * @property {number} costosMezcal.maquila             - Costo de maquila por litro cuando no se dispone de palenque propio (MXN).
 * @property {number} costosMezcal.operacionPalenque   - Costo operativo por litro al utilizar palenque propio (MXN).
 *
 * @property {Object} produccion                       - Parámetros de producción del mezcal.
 * @property {number} produccion.litrosEquilibrio      - Volumen de producción en el punto de equilibrio operativo (litros).
 *
 * @property {Object} demandaMaguey                    - Parámetros de la curva de demanda del maguey crudo.
 * @property {number} demandaMaguey.ordenadaKg         - Precio máximo teórico por kg (ordenada al origen de la curva de demanda, MXN).
 *
 * @property {Object} costosMaguey                     - Estructura de costos de producción del maguey crudo.
 * @property {number} costosMaguey.produccionKg        - Costo base estimado de producción por kilogramo (MXN).
 */
export const PARAMETROS_MERCADO = {
    demandaMezcal: { 
        ordenadaLitro: 2160 
    },
    costosMezcal: {
        agavePorLitro: 125,
        envasado: 60,
        maquila: 425,
        operacionPalenque: 77.45
    },
    produccion: {
        litrosEquilibrio: 800
    },
    
    demandaMaguey: { 
        ordenadaKg: 35
    }, 
    costosMaguey: { 
        produccionKg: 5
    }  
};

/**
 * Parámetros financieros externos al flujo operativo directo.
 * Representan la estructura de capital y la provisión de riesgo
 * aplicada sobre los ingresos proyectados.
 *
 * @constant {Object} FINANZAS_EXTERNAS
 * @property {number} capex           - Gasto de capital inicial (infraestructura y equipamiento, MXN).
 * @property {number} opexAnual       - Gasto operativo anual fijo no vinculado directamente a la producción (MXN).
 * @property {number} provisionRiesgo - Factor de provisión integrada para riesgos agroclimáticos y fitosanitarios (0.12 = 12%).
 *                                      Se aplica como descuento sobre los ingresos brutos proyectados para obtener
 *                                      los ingresos ajustados al riesgo, reflejando la incertidumbre inherente
 *                                      a las condiciones climáticas y la exposición a plagas.
 */
export const FINANZAS_EXTERNAS = {
    capex: 65257,
    opexAnual: 201000,
    provisionRiesgo: 0.12
};