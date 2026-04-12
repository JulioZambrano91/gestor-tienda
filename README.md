# 🏪 Gestor de Tienda Local

Bienvenido al **Gestor de Tienda Local**, una aplicación profesional diseñada para digitalizar y simplificar la administración de tu negocio. Este sistema centraliza el inventario, las ventas, el control de créditos (fiados) y la salud financiera en una interfaz moderna y fácil de usar.

---

## 🚀 Cómo empezar

Si es la primera vez que usas el sistema o estás en una computadora nueva, sigue estos pasos:

1.  **Instalar Node.js**: Descarga e instala la versión **LTS** desde [nodejs.org](https://nodejs.org/). (Es el motor que hace que la aplicación funcione).
2.  **Doble Clic**: Ejecuta el archivo `IniciarTienda.bat`.
    *   El sistema instalará automáticamente lo necesario la primera vez.
    *   Se abrirá tu navegador automáticamente en `http://localhost:3000`.
3.  **¡Listo!**: Ya puedes empezar a cargar tus productos.

---

## 🛠️ Módulos Principales

### 📦 Inventario
- Registro de productos con nombre, descripción, costo y precio de venta.
- Control de stock con alertas visuales cuando queda poca mercancía.
- Edición rápida y eliminación de productos.

### 🧾 Cajero (Punto de Venta)
- Carrito de compras intuitivo.
- Selección de método de pago: **Efectivo, Pago Móvil o Punto de Venta**.
- Opción de **Fiado**: Permite anotar el monto a la cuenta de un cliente específico.

### 💸 Fiados y Deudores
- Lista completa de clientes con saldo pendiente.
- Historial de compras fiadas por cada cliente.
- Sistema de abonos: Registra pagos parciales hasta saldar la deuda.

### 🏦 Finanzas y Caja
- **Efectivo en Caja**: Control estricto de cuánto dinero físico debería haber en tu gaveta.
- **Registro de Gastos**: Anota salidas de dinero para reposición de mercancía, pago de servicios o retiro de ganancias.
- **Gráficas**: Visualiza tus ingresos vs gastos mensuales y el valor total de tu mercancía en almacén.

---

## 💾 Ubicación de los Datos

Para tu seguridad, todos los datos se guardan **localmente** en esta carpeta:
- **Base de Datos**: `prisma/dev.db` (Aquí se guardan ventas, clientes y productos).
- **Imágenes**: Se recomienda guardar las fotos de productos en la carpeta `public/images`.

*Nota: Se recomienda hacer una copia de seguridad del archivo `prisma/dev.db` periódicamente (ej. una vez a la semana en un pendrive).*

---

## 🌙 Modo Oscuro y Claro
El sistema incluye un botón de **Luna/Sol** en la barra superior para cambiar el diseño según tu preferencia o la iluminación de tu local.

---
*Desarrollado con ❤️ para comercios locales.*
