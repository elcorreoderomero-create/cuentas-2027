"""Create a disposable, in-memory preview. Never touches the real Firebase data."""
from pathlib import Path
import re
root = Path(__file__).resolve().parent
target = Path('/tmp/cuentas-clientes-preview/cuentas-2027')
target.mkdir(parents=True, exist_ok=True)
html = (root / 'index.html').read_text()
js = re.search(r'src="/cuentas-2027/([^\"]+\.js)"',html)[1]
css = re.search(r'href="/cuentas-2027/([^\"]+\.css)"',html)[1]
source = (root / js).read_text()
mock = '''
const previewJobs=[
 {id:'demo1',date:'2026-10-01',name:'Cliente de ejemplo',type:'Sesión de fotografía',notes:'Datos ficticios de prueba.',total_cents:130000,paid_cents:26000,updated_at:'v1'},
 {id:'demo2',date:'2027-03-19',name:'Cliente de ejemplo',type:'Fallas',notes:'Segundo trabajo de prueba.',total_cents:90000,paid_cents:90000,updated_at:'v1'}
];
let previewProfiles=[], profileListener=null, dataListener=null;
const previewData=()=>({income:[],expenses:[],clients:previewJobs,seconds:[]});
oF=async()=>previewData();
lF=callback=>{dataListener=callback;callback(previewData());return()=>{dataListener=null}};
CRMServices.subscribe=callback=>{profileListener=callback;callback([...previewProfiles]);return()=>{profileListener=null}};
CRMServices.save=async(data,entry)=>{
 if(entry){const index=previewProfiles.findIndex(item=>item.id===entry.id);previewProfiles[index]={...data,id:entry.id,updated_at:'v2'}}
 else previewProfiles.push({...data,id:'profile'+previewProfiles.length,updated_at:'v1'});
 if(profileListener)profileListener([...previewProfiles]);
};
uF=async(table,data,entry)=>{if(table!=='clients')throw Error('Solo trabajos de prueba');const index=previewJobs.findIndex(item=>item.id===entry.id);previewJobs[index]={...entry,...data};if(dataListener)dataListener(previewData())};
'''
source = source[:source.index('"serviceWorker"in navigator')]
source = source.replace('iF=r=>TN(nu,t=>r(t?{user:{id:t.uid,email:t.email}}:null))', "iF=callback=>{callback({user:{id:'demo',email:'demo@example.com'}});return()=>{}}")
source = source.replace('tb.createRoot(document.getElementById("root"))',mock+'\ntb.createRoot(document.getElementById("root"))')
(target / js).write_text(source)
(target / css).write_text((root / css).read_text())
(target / 'index.html').write_text(html.replace('<title>Cuentas 2027</title>','<title>Cuentas · Prueba local</title>'))
print(target)
