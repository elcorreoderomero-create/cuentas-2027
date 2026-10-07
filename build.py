"""Rebuild the published app with the client-directory extension, without new dependencies.

The original project contains only compiled assets. Retain the original SDKs and
app as the fixed input; keep the extension readable in client-directory.js for future changes.
"""
from pathlib import Path
import hashlib

root = Path(__file__).resolve().parent
source = (root / 'index-HdJXluQP.js').read_text()

def replace_once(old, new):
    global source
    assert source.count(old) == 1, f'Integration point changed: {old[:80]}'
    source = source.replace(old, new, 1)

replace_once('{id:"seconds",label:"Segundos",icon:"◈"}', '{id:"directory",label:"Fichas de clientes",icon:"▤"},{id:"payments",label:"Pagos",icon:"↳"},{id:"seconds",label:"Segundos",icon:"◈"}')
replace_once('function EF({session:r}){', 'function EF({session:r}){const[crmSeed,setCRMSeed]=he.useState(null);const[paymentSeed,setPaymentSeed]=he.useState(null);function openCRM(job){setCRMSeed(job);o("directory")}function openPayment(job){setPaymentSeed(job);o("payments")}')
replace_once('tt=i!=="resumen"&&i!=="ajustes"?i:null', 'tt=i!=="resumen"&&i!=="ajustes"&&i!=="directory"&&i!=="payments"?i:null')
replace_once('i==="ajustes"?"Tu acceso, tus datos y tu aplicación.":', 'i==="payments"?"Señales, anticipos y pagos finales, en un solo lugar.":i==="directory"?"La información de cada cliente, siempre a mano.":i==="ajustes"?"Tu acceso, tus datos y tu aplicación.":')
replace_once('R.jsxs("div",{className:"period-bar"', 'i!=="directory"&&i!=="payments"&&R.jsxs("div",{className:"period-bar"')
replace_once('lt&&i==="ajustes"&&', 'lt&&i==="directory"&&R.jsx(CRMDirectory,{jobs:t.clients,online:N,onEditJob:job=>j({table:"clients",entry:job}),onPayment:openPayment,seed:crmSeed,onSeedUsed:()=>setCRMSeed(null)}),lt&&i==="payments"&&R.jsx(Payments,{income:t.income,jobs:t.clients,online:N,onEditJob:job=>j({table:"clients",entry:job}),seed:paymentSeed,onSeedUsed:()=>setPaymentSeed(null)}),lt&&i==="ajustes"&&')
replace_once('table:tt,entry:W,onEdit:', 'table:tt,entry:W,onProfile:()=>openCRM(W),onPayment:()=>openPayment(W),onEdit:')
replace_once('function DF({table:r,entry:t,onEdit:e,onDelete:i,disabled:o})', 'function DF({table:r,entry:t,onEdit:e,onDelete:i,disabled:o,onProfile,onPayment})')
replace_once('className:"record-actions",children:[', 'className:"record-actions",children:[r==="clients"&&onPayment&&R.jsx("button",{className:"btn subtle",onClick:onPayment,disabled:o,children:"Registrar pago"}),r==="clients"&&onProfile&&R.jsx("button",{className:"btn subtle",onClick:onProfile,children:"Ficha"}),')
replace_once('x&&R.jsx(yF,{table:x.table', 'x&&R.jsx(PaymentAwareEditor,{jobs:t.clients,table:x.table')
replace_once('El beneficio se calcula con Ingresos y Gastos. Los pendientes se controlan por separado: al cobrar a un cliente o pagar a un segundo, registra también el ingreso o gasto correspondiente.', 'El beneficio se calcula con Ingresos y Gastos. Los cobros registrados en Pagos generan su ingreso y actualizan el trabajo vinculado. Al pagar a un segundo, registra el gasto correspondiente.')
replace_once('El periodo se filtra por la fecha del trabajo. Estos registros no generan ingresos ni gastos automáticamente.', 'El periodo se filtra por la fecha del trabajo. Usa Pagos para registrar cobros de clientes y sus ingresos. Los pagos a segundos requieren registrar su gasto.')
replace_once('z("Cobrado (€)","paid_cents",!0),', 'z("Cobrado (€)","paid_cents",!0),t?.payment_total_cents>0&&R.jsx("p",{className:"small muted",children:`Incluye ${$n(t.payment_total_cents)} de Pagos. Registra los nuevos cobros desde esa pestaña; este campo permite ajustar cobros anteriores.`}),')
replace_once('tb.createRoot(document.getElementById("root"))', (root / 'client-directory.js').read_text() + '\n' + (root / 'payments.js').read_text() + '\ntb.createRoot(document.getElementById("root"))')

digest = hashlib.sha256(source.encode()).hexdigest()[:12]
js_name = f'cuentas-clientes-{digest}.js'
(root / js_name).write_text(source)
style = (root / 'index-CTKD7Jnd.css').read_text() + '\n' + (root / 'client-directory.css').read_text() + '\n' + (root / 'payments.css').read_text()
css_name = f'cuentas-clientes-{hashlib.sha256(style.encode()).hexdigest()[:12]}.css'
(root / css_name).write_text(style)
html = (root / 'index.html').read_text()
import re
html = re.sub(r'src="/cuentas-2027/[^\"]+\.js"', f'src="/cuentas-2027/{js_name}"', html)
html = re.sub(r'href="/cuentas-2027/[^\"]+\.css"', f'href="/cuentas-2027/{css_name}"', html)
(root / 'index.html').write_text(html)
print(js_name)
print(css_name)
