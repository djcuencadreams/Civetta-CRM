/**
 * Civetta Shipping Form Loader
 * Script para cargar automáticamente el formulario de etiquetas de envío desde el CRM
 * 
 * Instrucciones de uso:
 * 1. Incluir este script en la página de Civetta.com donde se quiere mostrar el formulario
 * 2. Añadir un elemento div con id="civetta-shipping-form"
 * 3. El script detectará automáticamente la ruta correcta y cargará el formulario
 */

// Script de carga de formulario de envío Civetta
// Versión WordPress: Compatible con editores de bloques
// v2.0 - Optimizado para evitar problemas con manejo de script en WordPress
var CivettaShippingFormLoader = CivettaShippingFormLoader || {};

(function() {
    // Configuración del cargador
    var config = {
        // Dominio principal del CRM (no modificar esta línea)
        crmDomain: 'https://clothing-sales-tracker-jaradanny.replit.app',
        
        // Rutas alternativas para el formulario
        formPaths: [
            '/wordpress-embed',  // Nueva ruta optimizada para WordPress
            '/forms/shipping',
            '/public/shipping-form'
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
            
            // Verificar que la URL está disponible
            fetch(url, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        // La URL funciona, cargar el iframe
                        loadIframe(url);
                    } else {
                        // Esta URL no funciona, intentar la siguiente
                        currentPathIndex++;
                        tryNextPath();
                    }
                })
                .catch(_error => {
                    // Error de red, intentar la siguiente URL
                    currentPathIndex++;
                    tryNextPath();
                });
        }
        
        // Función para cargar el iframe cuando encontramos una URL funcional
        function loadIframe(url) {
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.width = '100%';
            iframe.style.height = '800px'; // Altura predeterminada, ajustar según necesidad
            iframe.style.border = 'none';
            iframe.style.overflow = 'hidden';
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('scrolling', 'no');
            
            // Limpiar el contenedor y añadir el iframe
            container.innerHTML = '';
            container.appendChild(iframe);
            
            // Ajustar la altura del iframe automáticamente (requiere que ambos dominios permitan comunicación)
            iframe.onload = function() {
                try {
                    // Intentar ajustar la altura automáticamente
                    iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
                    
                    // Ajustar altura cuando cambia el tamaño de la ventana
                    window.addEventListener('resize', function() {
                        iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
                    });
                } catch (e) {
                    // Si hay restricciones de CORS, usar una altura fija
                    console.warn('No se pudo ajustar la altura automáticamente:', e);
                }
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