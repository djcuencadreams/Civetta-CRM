/**
 * Civetta Shipping Form Loader
 * Script para cargar automáticamente el formulario de etiquetas de envío desde el CRM
 * 
 * Instrucciones de uso:
 * 1. Incluir este script en la página de Civetta.com donde se quiere mostrar el formulario
 * 2. Añadir un elemento div con id="civetta-shipping-form"
 * 3. El script detectará automáticamente la ruta correcta y cargará el formulario
 * 
 * Recomendaciones de instalación en WordPress:
 * - Usar el bloque HTML personalizado para insertar este script y el div contenedor
 * - Si usa Elementor, insertar como HTML personalizado o widget de HTML
 * - Para Divi Builder, usar módulo de código o HTML personalizado
 * - Si hay problemas con la carga, pruebe añadir este script al final de la página
 */

// Script de carga de formulario de envío Civetta
// Versión WordPress: Compatible con editores de bloques, Elementor, Divi y otros
// v3.2 - Optimizado para WordPress con mejor compatibilidad CORS
var CivettaShippingFormLoader = CivettaShippingFormLoader || {};

(function() {
    // Configuración del cargador
    var config = {
        // Dominio principal del CRM (no modificar esta línea)
        crmDomain: 'https://clothing-sales-tracker-jaradanny.replit.app',
        
        // Múltiples rutas para mejorar compatibilidad con diferentes configuraciones de WordPress
        formPaths: [
            '/wordpress-embed',       // Ruta principal optimizada para WordPress
            '/shipping-form',         // Ruta alternativa 1
            '/forms/shipping',        // Ruta alternativa 2
            '/public/shipping-form'   // Ruta alternativa 3
        ],
        
        // ID del contenedor donde se cargará el formulario
        containerId: 'civetta-shipping-form',
        
        // Mensaje de error si no se puede cargar el formulario
        errorMessage: 'No se pudo cargar el formulario de etiquetas. Por favor inténtelo más tarde.'
    };
    
    // Función principal que se ejecuta cuando el DOM está listo
    function init() {
        const container = document.getElementById(config.containerId);
        
        if (!container) {
            console.error('No se encontró el contenedor para el formulario de etiquetas:', config.containerId);
            return;
        }
        
        // Mostrar mensaje de carga
        container.innerHTML = '<div style="text-align:center;padding:20px;"><p>Cargando formulario...</p></div>';
        
        // Intentar cargar el formulario desde cada ruta hasta que funcione
        loadFormFromAvailablePath();
    }
    
    // Función para intentar cargar el formulario desde una ruta disponible
    function loadFormFromAvailablePath() {
        const container = document.getElementById(config.containerId);
        let currentPathIndex = 0;
        
        function tryNextPath() {
            if (currentPathIndex >= config.formPaths.length) {
                // Si ya intentamos todas las rutas y ninguna funcionó
                container.innerHTML = `<div style="text-align:center;padding:20px;color:#b91c1c;background-color:#fee2e2;border:1px solid #fca5a5;border-radius:4px;">
                    <p>${config.errorMessage}</p>
                    <button onclick="window.location.reload()" style="margin-top:10px;padding:5px 10px;background-color:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;">
                        Reintentar
                    </button>
                </div>`;
                return;
            }
            
            const path = config.formPaths[currentPathIndex];
            const url = `${config.crmDomain}${path}`;
            
            // Verificar que la URL está disponible usando GET en lugar de HEAD 
            // HEAD puede causar problemas con ciertos servidores WordPress
            // Si estamos en un navegador antiguo que no soporta fetch, usamos un enfoque alternativo
            if (typeof fetch === 'undefined') {
                // Enfoque compatible con navegadores antiguos
                loadIframe(url);
                return;
            }

            fetch(url, { 
                method: 'GET',
                // Asegurar que ignoramos restricciones CORS al verificar disponibilidad
                mode: 'no-cors',
                // Añadir caché para mejorar rendimiento
                cache: 'default'
            })
                .then(response => {
                    // Con mode: 'no-cors', response.ok siempre está en undefined
                    // En este caso, asumimos que la respuesta es válida y cargamos el iframe
                    loadIframe(url);
                })
                .catch(_error => {
                    console.error('Error al cargar la URL:', url, _error);
                    // Error de red, intentar la siguiente URL
                    currentPathIndex++;
                    tryNextPath();
                });
        }
        
        // Función para cargar el iframe cuando encontramos una URL funcional
        function loadIframe(url) {
            // Crear iframe con configuración optimizada para WordPress
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.width = '100%';
            iframe.style.height = '1200px'; // Altura mayor para asegurar visibilidad en móvil
            iframe.style.border = 'none';
            iframe.style.overflow = 'hidden';
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('scrolling', 'no');
            
            // Añadir atributo title para accesibilidad
            iframe.setAttribute('title', 'Formulario de etiquetas de envío Civetta');
            
            // Añadir atributo sandbox para mejorar seguridad pero permitir formularios
            iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin');
            
            // Limpiar el contenedor y añadir el iframe
            container.innerHTML = '';
            container.appendChild(iframe);
            
            // Mejorar la gestión de errores
            iframe.onerror = function() {
                container.innerHTML = `<div style="text-align:center;padding:20px;color:#b91c1c;background-color:#fee2e2;border:1px solid #fca5a5;border-radius:4px;">
                    <p>Error al cargar el formulario. Por favor recargue la página o intente más tarde.</p>
                    <button onclick="window.location.reload()" style="margin-top:10px;padding:8px 15px;background-color:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">
                        Reintentar
                    </button>
                </div>`;
            };
            
            // Función para verificar si el iframe cargó correctamente
            function checkIframeLoaded() {
                try {
                    // Verificar si el contenido ha cargado correctamente
                    if (iframe.contentWindow.document.body) {
                        var formHeight = Math.max(
                            iframe.contentWindow.document.body.scrollHeight,
                            iframe.contentWindow.document.documentElement.scrollHeight
                        );
                        
                        // Si se detecta un formulario real (no una página de error), ajustar altura
                        if (formHeight > 300) {
                            iframe.style.height = (formHeight + 50) + 'px';
                        }
                    }
                } catch (e) {
                    // Error de seguridad cross-origin, mantener la altura original
                    console.log('No se pudo determinar altura del iframe automáticamente (restricción de seguridad)');
                }
            }
            
            // Verificar carga cuando el iframe termine de cargar
            iframe.onload = function() {
                checkIframeLoaded();
                
                // Re-verificar después de un momento para asegurar que todo haya cargado
                setTimeout(checkIframeLoaded, 1000);
            };
        }
        
        // Comenzar el proceso de detección
        tryNextPath();
    }
    
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();