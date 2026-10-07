# Cuentas 2027

[Abrir Cuentas](https://elcorreoderomero-create.github.io/cuentas-2027/)

Control personal de ingresos, gastos, clientes y segundos fotógrafos. Acceso privado con Google. Los datos se guardan en Firebase; este repositorio contiene únicamente el programa público.

En iPhone y iPad: abrir en Safari → Compartir → Añadir a pantalla de inicio. Usar la misma cuenta de Google en todos los dispositivos.

Permite registrar datos desde 2026 y seleccionar cada año por separado. Incluye añadir, editar, eliminar, filtros por año y mes, beneficio, pendientes y exportación CSV en Ajustes. Los pendientes no generan ingresos/gastos automáticamente: registrar el movimiento cuando se cobre o pague.

GitHub Pages y Firebase Spark gratuitos. Sin tarjeta ni prueba. No activar planes de pago. Si se agota una cuota gratuita, el servicio puede limitarse temporalmente; no se generan cargos. Hace falta internet para cargar y guardar los datos.

## Fichas de clientes

La sección **Fichas de clientes** guarda nombre o razón social, contacto o representante, DNI/NIF, teléfono, email, dirección y observaciones. Desde una ficha se pueden vincular varios trabajos de la sección Clientes, consultar sus importes de todos los años y editar esos trabajos. El botón **Ficha** de cada trabajo abre su ficha o prepara una nueva. Las fichas tienen su propio buscador y exportación CSV.

Las fichas se guardan en `accounts/{uid}/profiles/{id}`, con el mismo propietario privado que los registros contables. Vincular o desvincular un trabajo no modifica sus importes. No se copian automáticamente datos personales de las notas ni se crean fichas de demostración en producción.

## Mantenimiento

El repositorio original solo incluía los archivos compilados. `build.py` conserva como base `index-HdJXluQP.js` y `index-CTKD7Jnd.css`, e integra la extensión legible en `client-directory.js` y `client-directory.css`. Ejecutar `python3 build.py` genera archivos con nombres derivados de su contenido y actualiza `index.html`. No editar la base compilada sin revisar los puntos de integración del script.

Pruebas: `node --test client-directory.test.cjs`. `python3 preview.py` crea una vista temporal en `/tmp/cuentas-clientes-preview` con datos ficticios en memoria, sin acceder a los datos reales. Las nuevas reglas se proporcionan en `profiles.rules.fragment`: se insertan dentro de `match /databases/{database}/documents`, conservando las reglas anteriores y su función `owner`.
