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
let previewProfiles=[{id:'profileDemo',name:'Cliente de ejemplo',contact_name:'Contacto de prueba',job_ids:['demo1','demo2']},{id:'profileNoJob',name:'Cliente sin trabajo',job_ids:[]}], profileListener=null, dataListener=null, previewVersion=1;
let previewIncome=[{id:'old1',date:'2026-10-02',client:'Cliente de prueba',concept:'Anticipo ya registrado',category:'Fallas',amount_cents:12500,updated_at:'v1'}];
const previewData=()=>({income:previewIncome,expenses:[],clients:previewJobs,seconds:[]});
oF=async()=>previewData();
lF=callback=>{dataListener=callback;callback(previewData());return()=>{dataListener=null}};
CRMServices.subscribe=callback=>{profileListener=callback;callback([...previewProfiles]);return()=>{profileListener=null}};
CRMServices.save=async(data,entry)=>{
 if(entry){const index=previewProfiles.findIndex(item=>item.id===entry.id);previewProfiles[index]={...data,id:entry.id,updated_at:'v2'}}
 else previewProfiles.push({...data,id:'profile'+previewProfiles.length,updated_at:'v1'});
 if(profileListener)profileListener([...previewProfiles]);
};
uF=async(table,data,entry)=>{if(table!=='clients')throw Error('Solo trabajos de prueba');const index=previewJobs.findIndex(item=>item.id===entry.id);previewJobs[index]={...entry,...data};if(dataListener)dataListener(previewData())};
PaymentServices.newId=()=>crypto.randomUUID();
PaymentServices.save=async(data,entry,id,included=false)=>{
 validatePaymentProfile(data,previewProfiles.find(p=>p.id===data.profile_id));
 const previous=previewIncome.find(p=>p.id===(entry?.id||id));
 if(entry&&previous.updated_at!==entry.updated_at)throw vw();
 const changes=paymentJobChanges(new Map(previewJobs.map(j=>[j.id,j])),isClientPayment(previous)?previous:null,data,included);
 for(const [jobId,job] of changes){const index=previewJobs.findIndex(j=>j.id===jobId);previewJobs[index]={...job,updated_at:'v'+(++previewVersion)};}
 const result={...previous,...data,id:entry?.id||id,updated_at:'v'+(++previewVersion)};
 if(previous)previewIncome=previewIncome.map(p=>p.id===result.id?result:p);else previewIncome=[result,...previewIncome];
 if(dataListener)dataListener(previewData());
};
PaymentServices.remove=async(entry)=>{
 const changes=paymentJobChanges(new Map(previewJobs.map(j=>[j.id,j])),entry,null);
 for(const [jobId,job] of changes){const index=previewJobs.findIndex(j=>j.id===jobId);previewJobs[index]={...job,updated_at:'v'+(++previewVersion)};}
 previewIncome=previewIncome.filter(p=>p.id!==entry.id);if(dataListener)dataListener(previewData());
};
'''
source = source[:source.index('"serviceWorker"in navigator')]
source = source.replace('iF=r=>TN(nu,t=>r(t?{user:{id:t.uid,email:t.email}}:null))', "iF=callback=>{callback({user:{id:'demo',email:'demo@example.com'}});return()=>{}}")
source = source.replace('tb.createRoot(document.getElementById("root"))',mock+'\ntb.createRoot(document.getElementById("root"))')
(target / js).write_text(source)
(target / css).write_text((root / css).read_text())
(target / 'index.html').write_text(html.replace('<title>Cuentas 2027</title>','<title>Cuentas · Prueba local</title>'))
print(target)
