/**
 * @file probabilidad.js
 * @module Core/Probabilidad
 * @description Módulo de funciones estocásticas para Agromaguey Pro (VADE Software).
 *
 * Implementa la función de densidad de probabilidad (PDF) de la distribución
 * normal (Gauss), utilizada para modelar la incertidumbre de variables
 * agroclimáticas — particularmente la distribución de temperaturas —
 * que impactan la viabilidad del cultivo de agave.
 *
 * La campana de Gauss resultante permite visualizar la probabilidad de
 * escenarios de helada (temperaturas negativas) frente a escenarios
 * seguros, fundamentando la provisión de riesgo financiero aplicada
 * en el módulo de finanzas.
 */

/**
 * Calcula el valor de la función de densidad de probabilidad (PDF)
 * de una distribución normal para un punto dado.
 *
 * En el contexto de negocio, esta función se utiliza para generar la
 * curva de distribución de temperaturas históricas de la región de
 * Santa María Albarradas. El área bajo la curva en el rango de
 * temperaturas negativas (x < 0) representa la probabilidad acumulada
 * de helada, lo que justifica cuantitativamente la provisión de riesgo
 * climático aplicada a los ingresos proyectados.
 *
 * Fórmula aplicada:
 *   f(x) = (1 / (σ √(2π))) · e^(-(x - μ)² / (2σ²))
 *
 * @param {number} x     - Valor de la variable aleatoria (temperatura en °C).
 * @param {number} mu    - Media (μ) de la distribución (temperatura promedio histórica en °C).
 * @param {number} sigma - Desviación estándar (σ) de la distribución (dispersión térmica en °C).
 * @returns {number} Valor de la densidad de probabilidad en el punto x (sin unidades, ≥ 0).
 */
export function calcularGauss(x, mu, sigma) {
    const coeficiente = 1 / (sigma * Math.sqrt(2 * Math.PI));
    const exponente = -Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2));
    return coeficiente * Math.exp(exponente);
}