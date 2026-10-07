# Cuentas 2027

[Abrir Cuentas](https://elcorreoderomero-create.github.io/cuentas-2027/)

Control personal de ingresos, gastos, clientes y segundos fotógrafos. Acceso privado con Google. Los datos se guardan en Firebase; este repositorio contiene únicamente el programa público.

En iPhone y iPad: abrir en Safari → Compartir → Añadir a pantalla de inicio. Usar la misma cuenta de Google en todos los dispositivos.

Permite registrar datos desde 2026 y seleccionar cada año por separado. Incluye añadir, editar, eliminar, filtros por año y mes, beneficio, pendientes y exportación CSV en Ajustes. Los cobros anotados en **Pagos** generan su ingreso y actualizan el trabajo vinculado. Los pagos a segundos fotógrafos siguen requiriendo su gasto.

GitHub Pages y Firebase Spark gratuitos. Sin tarjeta ni prueba. No activar planes de pago. Si se agota una cuota gratuita, el servicio puede limitarse temporalmente; no se generan cargos. Hace falta internet para cargar y guardar los datos.

## Fichas de clientes

La sección **Fichas de clientes** guarda nombre o razón social, contacto o representante, DNI/NIF, teléfono, email, dirección y observaciones. Desde una ficha se pueden vincular varios trabajos de la sección Clientes, consultar sus importes de todos los años y editar esos trabajos. El botón **Ficha** de cada trabajo abre su ficha o prepara una nueva. Las fichas tienen su propio buscador y exportación CSV.

Las fichas se guardan en `accounts/{uid}/profiles/{id}`, con el mismo propietario privado que los registros contables. Vincular o desvincular un trabajo no modifica sus importes. No se copian automáticamente datos personales de las notas ni se crean fichas de demostración en producción.

## Pagos de clientes

**Pagos** reúne señales, anticipos y pagos finales con fecha, cliente, concepto, importe, categoría, forma de pago y observaciones. Un pago puede quedar sin asignar y enlazarse después con un trabajo de cualquier año. Los filtros y el CSV corresponden a la fecha del cobro.

En **Nuevo pago**, el selector **Cliente registrado** carga las fichas existentes. Al seleccionar una, rellena su nombre y ofrece sus trabajos vinculados. La referencia `profile_id` conserva la elección al editar, aunque el cliente todavía no tenga trabajos. También se admite escribir el nombre de un cliente sin ficha. Cambiar de ficha retira cualquier trabajo que no pertenezca a ella; los pagos antiguos conservan sus datos.

El pago es el mismo documento que su ingreso, identificado con `payment_kind: client_payment`, `job_id`, `payment_method` y `payment_notes`. Crear, editar, reasignar o eliminar un pago actualiza el ingreso y los importes del trabajo en una sola transacción de Firestore. Los formularios detectan cambios concurrentes, los reintentos de creación reutilizan el mismo ID y no se permiten cobros superiores al total del trabajo.

**Vincular ingreso existente** recupera un ingreso sin duplicarlo. Si el importe ya estaba incluido en el campo Cobrado del trabajo, se marca esa casilla al enlazarlo por primera vez. Los trabajos conservan sus cobros anteriores y contabilizan por separado `payment_total_cents`; el cobrado manual no puede bajar de esa suma. Los trabajos con pagos vinculados no se pueden eliminar hasta desvincularlos. Editar un ingreso que procede de Pagos abre el formulario coordinado del pago.

La plantilla `firestore.rules.template` conserva el acceso exclusivo del propietario y añade la validación de esos campos. Sustituir `OWNER_UID` por el UID ya autorizado antes de publicarla; no cambiar la identidad del propietario. El repositorio no contiene datos de clientes ni pagos de demostración en los archivos publicados de la app.

## Mantenimiento

El repositorio original solo incluía los archivos compilados. `build.py` conserva como base `index-HdJXluQP.js` y `index-CTKD7Jnd.css`, e integra la extensión legible en `client-directory.js` y `client-directory.css`. Ejecutar `python3 build.py` genera archivos con nombres derivados de su contenido y actualiza `index.html`. No editar la base compilada sin revisar los puntos de integración del script.

Pruebas: `node --test client-directory.test.cjs payments.test.cjs`. `python3 preview.py` crea una vista temporal en `/tmp/cuentas-clientes-preview` con datos ficticios en memoria, sin acceder a los datos reales. La extensión de pagos reside en `payments.js` y `payments.css`; `build.py` integra ambas extensiones y genera los archivos publicados. La plantilla de reglas incluye las fichas y los pagos.
