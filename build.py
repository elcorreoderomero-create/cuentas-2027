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

replace_once('{id:"seconds",label:"Segundos",icon:"◈"}', '{id:"directory",label:"Fichas de clientes",icon:"▤"},{id:"seconds",label:"Segundos",icon:"◈"}')
replace_once('function EF({session:r}){', 'function EF({session:r}){const[crmSeed,setCRMSeed]=he.useState(null);function openCRM(job){setCRMSeed(job);o("directory")}')
replace_once('tt=i!=="resumen"&&i!=="ajustes"?i:null', 'tt=i!=="resumen"&&i!=="ajustes"&&i!=="directory"?i:null')
replace_once('i==="ajustes"?"Tu acceso, tus datos y tu aplicación.":', 'i==="directory"?"La información de cada cliente, siempre a mano.":i==="ajustes"?"Tu acceso, tus datos y tu aplicación.":')
replace_once('R.jsxs("div",{className:"period-bar"', 'i!=="directory"&&R.jsxs("div",{className:"period-bar"')
replace_once('lt&&i==="ajustes"&&', 'lt&&i==="directory"&&R.jsx(CRMDirectory,{jobs:t.clients,online:N,onEditJob:job=>j({table:"clients",entry:job}),seed:crmSeed,onSeedUsed:()=>setCRMSeed(null)}),lt&&i==="ajustes"&&')
replace_once('table:tt,entry:W,onEdit:', 'table:tt,entry:W,onProfile:()=>openCRM(W),onEdit:')
replace_once('function DF({table:r,entry:t,onEdit:e,onDelete:i,disabled:o})', 'function DF({table:r,entry:t,onEdit:e,onDelete:i,disabled:o,onProfile})')
replace_once('className:"record-actions",children:[', 'className:"record-actions",children:[r==="clients"&&onProfile&&R.jsx("button",{className:"btn subtle",onClick:onProfile,children:"Ficha"}),')
replace_once('tb.createRoot(document.getElementById("root"))', (root / 'client-directory.js').read_text() + '\ntb.createRoot(document.getElementById("root"))')

digest = hashlib.sha256(source.encode()).hexdigest()[:12]
js_name = f'cuentas-clientes-{digest}.js'
(root / js_name).write_text(source)
style = (root / 'index-CTKD7Jnd.css').read_text() + '\n' + (root / 'client-directory.css').read_text()
css_name = f'cuentas-clientes-{hashlib.sha256(style.encode()).hexdigest()[:12]}.css'
(root / css_name).write_text(style)
html = (root / 'index.html').read_text()
import re
html = re.sub(r'src="/cuentas-2027/[^\"]+\.js"', f'src="/cuentas-2027/{js_name}"', html)
html = re.sub(r'href="/cuentas-2027/[^\"]+\.css"', f'href="/cuentas-2027/{css_name}"', html)
(root / 'index.html').write_text(html)
print(js_name)
print(css_name)
