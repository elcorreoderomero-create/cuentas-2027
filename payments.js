// A payment and its income are the same Firestore document. Linked job totals
// change in the same transaction, so retries cannot create half a payment.
const isClientPayment = entry => entry?.payment_kind === 'client_payment';
const PAYMENT_METHODS = [...BF,'Banco','Sin especificar'];
function paymentPayload(form) {
  const data = Object.fromEntries(['date','client','concept','category','job_id','payment_method','payment_notes'].map(key => [key,String(form.get(key) || '').trim()]));
  data.amount_cents = fF(form.get('amount_cents'));
  data.payment_kind = 'client_payment';
  if (!xv(data.date)) throw new Error('Elige una fecha válida entre 2026 y 2100.');
  if (!data.amount_cents) throw new Error('El pago debe ser mayor que cero.');
  if (!data.client) throw new Error('Indica quién ha realizado el pago.');
  if (data.client.length > 180 || data.concept.length > 500 || data.payment_notes.length > 2000) throw new Error('Revisa la longitud del nombre, concepto u observaciones.');
  if (!Aw.includes(data.category) || !PAYMENT_METHODS.includes(data.payment_method)) throw new Error('Elige una categoría y una forma de pago.');
  return data;
}
function paymentJobChanges(jobs, oldPayment, nextPayment, alreadyIncluded = false) {
  const changes = new Map();
  const jobFor = id => {
    if (!changes.has(id)) {
      const job = jobs.get(id);
      if (!job) throw new Error('El trabajo ya no existe. Actualiza y elige otro.');
      changes.set(id,{...job,payment_total_cents:Number(job.payment_total_cents || 0)});
    }
    return changes.get(id);
  };
  if (alreadyIncluded && (oldPayment?.job_id || !nextPayment?.job_id)) throw new Error('Solo puedes recuperar un cobro anterior al vincularlo por primera vez.');
  if (oldPayment?.job_id) {
    const job = jobFor(oldPayment.job_id);
    job.paid_cents -= oldPayment.amount_cents;
    job.payment_total_cents -= oldPayment.amount_cents;
  }
  if (nextPayment?.job_id) {
    const job = jobFor(nextPayment.job_id);
    if (alreadyIncluded && nextPayment.amount_cents > job.paid_cents - job.payment_total_cents) throw new Error('El importe supera lo cobrado anteriormente sin detalle de pagos.');
    if (!alreadyIncluded) job.paid_cents += nextPayment.amount_cents;
    job.payment_total_cents += nextPayment.amount_cents;
  }
  for (const job of changes.values()) {
    if (![job.paid_cents,job.payment_total_cents].every(Number.isSafeInteger) || job.payment_total_cents < 0 || job.paid_cents < job.payment_total_cents) throw new Error('Los cobros del trabajo han cambiado. Actualiza antes de guardar.');
    if (job.paid_cents > job.total_cents) throw new Error('El pago supera lo pendiente del trabajo. Revisa el importe o marca que ya estaba incluido en lo cobrado.');
  }
  return changes;
}
function paymentCSV(payments,jobs) {
  const byId = new Map(jobs.map(job=>[job.id,job]));
  const rows = [['Fecha','Cliente','Concepto','Importe EUR','Forma de pago','Categoría','Trabajo vinculado','Observaciones'],
    ...payments.map(p=>[p.date,p.client,p.concept,(p.amount_cents/100).toFixed(2).replace('.',','),p.payment_method,p.category,byId.get(p.job_id)?.name || 'Sin asignar',p.payment_notes])];
  return '\uFEFF'+rows.map(row=>row.map(CF).join(';')).join('\r\n');
}
const PaymentServices = {
  newId: () => vm(tB('income')).id,
  async save(data,entry,id,alreadyIncluded=false) {
    if (!navigator.onLine) throw new Error('Necesitas conexión para guardar.');
    const ref=vm(tB('income'),entry?.id || id), uid=nu.currentUser.uid;
    await _w(Vp,async tx=>{
      const snap=await tx.get(ref), previous=snap.exists()?snap.data():null;
      if (entry && (!previous || Hf(previous.updated_at)!==entry.updated_at)) throw vw();
      if (!entry && previous) {
        if (Object.keys(data).every(key=>previous[key]===data[key])) return;
        throw vw();
      }
      const oldPayment=isClientPayment(previous)?previous:null;
      const ids=[...new Set([oldPayment?.job_id,data.job_id].filter(Boolean))], jobs=new Map(), refs=new Map();
      for (const jobId of ids) {
        const jobRef=vm(tB('clients'),jobId), jobSnap=await tx.get(jobRef);
        refs.set(jobId,jobRef); if(jobSnap.exists())jobs.set(jobId,jobSnap.data());
      }
      const changes=paymentJobChanges(jobs,oldPayment,data,alreadyIncluded);
      for (const [jobId,job] of changes) tx.update(refs.get(jobId),{paid_cents:job.paid_cents,payment_total_cents:job.payment_total_cents,updated_at:Yg()});
      if (previous) tx.update(ref,{...data,updated_at:Yg()});
      else tx.set(ref,{...data,user_id:uid,created_at:Yg(),updated_at:Yg()});
    });
  },
  async remove(entry) {
    if (!navigator.onLine) throw new Error('Necesitas conexión para eliminar.');
    const ref=vm(tB('income'),entry.id);
    await _w(Vp,async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists() || Hf(snap.data().updated_at)!==entry.updated_at) throw vw();
      const payment=snap.data(), jobs=new Map();
      let jobRef;
      if(payment.job_id){jobRef=vm(tB('clients'),payment.job_id);const jobSnap=await tx.get(jobRef);if(jobSnap.exists())jobs.set(payment.job_id,jobSnap.data());}
      const changes=paymentJobChanges(jobs,payment,null);
      for(const job of changes.values())tx.update(jobRef,{paid_cents:job.paid_cents,payment_total_cents:job.payment_total_cents,updated_at:Yg()});
      tx.delete(ref);
    });
  }
};
const paymentBaseSave=uF, paymentBaseRemove=cF;
uF=async(table,data,entry)=>{
  if(table==='income' && isClientPayment(entry)) throw new Error('Edita este cobro desde Pagos para mantener su trabajo actualizado.');
  if(table==='clients' && Number(data.paid_cents)<Number(entry?.payment_total_cents || 0)) throw new Error('Lo cobrado no puede ser menor que los pagos vinculados. Corrige esos cobros desde Pagos.');
  return paymentBaseSave(table,data,entry);
};
cF=async(table,entry)=>{
  if(table==='income' && isClientPayment(entry)) return PaymentServices.remove(entry);
  if(table==='clients' && entry.payment_total_cents>0) throw new Error('Este trabajo tiene pagos vinculados. Desvincúlalos desde Pagos antes de eliminar el trabajo.');
  return paymentBaseRemove(table,entry);
};
function PaymentAwareEditor(props) {
  return props.table==='income' && isClientPayment(props.entry)
    ? crmEl(PaymentEditor,{entry:props.entry,jobs:props.jobs,online:props.online,onClose:props.onClose,onSaved:props.onSaved})
    : crmEl(yF,props);
}
function Payments({income,jobs,online,onEditJob,seed,onSeedUsed}) {
  const h=crmEl, [editor,setEditor]=he.useState(null), [picker,setPicker]=he.useState(false), [removing,setRemoving]=he.useState(null);
  const [busy,setBusy]=he.useState(false),[error,setError]=he.useState(''),[notice,setNotice]=he.useState('');
  const [year,setYear]=he.useState('all'),[month,setMonth]=he.useState('0'),[query,setQuery]=he.useState(''),[status,setStatus]=he.useState('all');
  he.useEffect(()=>{if(seed){setEditor({seed});onSeedUsed();}},[seed]);
  const payments=income.filter(isClientPayment), available=income.filter(entry=>!isClientPayment(entry));
  const byId=new Map(jobs.map(job=>[job.id,job]));
  const years=[...new Set([String(new Date().getFullYear()),...payments.map(p=>p.date.slice(0,4))])].sort().reverse();
  const visible=payments.filter(p=>(year==='all'||p.date.slice(0,4)===year)&&(!Number(month)||Number(p.date.slice(5,7))===Number(month))&&(status==='all'||(status==='unlinked'?!p.job_id:!!p.job_id))&&crmText([p.client,p.concept,p.payment_method,p.payment_notes,byId.get(p.job_id)?.name].join(' ')).includes(crmText(query)));
  function exportCSV(){const url=URL.createObjectURL(new Blob([paymentCSV(visible,jobs)],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='pagos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return h('section',{'aria-label':'Pagos de clientes',className:'payments'},
    h('div',{className:'crm-toolbar'},h('p',{className:'muted'},'Cada cobro queda en Ingresos. Puedes asignarlo a un trabajo ahora o más adelante.'),
      h('div',{className:'actions'},h('button',{className:'btn',onClick:()=>setPicker(true),disabled:!online||!available.length},'Vincular ingreso existente'),h('button',{className:'btn primary',onClick:()=>setEditor({}),disabled:!online},'＋ Nuevo pago'))),
    notice&&h('p',{className:'notice success',role:'status'},notice),error&&h('p',{className:'error',role:'alert'},error),
    h('div',{className:'payment-filters'},
      h(Ll,{label:'Año de pago'},h('select',{value:year,onChange:e=>setYear(e.target.value)},h('option',{value:'all'},'Todos los años'),years.map(y=>h('option',{key:y,value:y},y)))),
      h(Ll,{label:'Mes de pago'},h('select',{value:month,onChange:e=>setMonth(e.target.value)},h('option',{value:'0'},'Todos los meses'),xm.map((m,i)=>h('option',{key:m,value:i+1},m)))),
      h(Ll,{label:'Trabajo'},h('select',{value:status,onChange:e=>setStatus(e.target.value)},h('option',{value:'all'},'Todos'),h('option',{value:'unlinked'},'Sin asignar'),h('option',{value:'linked'},'Vinculados'))),
      h(Ll,{label:'Buscar pagos'},h('input',{type:'search',value:query,onChange:e=>setQuery(e.target.value),placeholder:'Cliente, concepto o trabajo…'}))),
    h('div',{className:'list-summary'},h('span',null,`${visible.length} ${visible.length===1?'pago':'pagos'}`),h('strong',null,'Total: '+$n(Lc(visible))),h('button',{className:'btn',onClick:exportCSV,disabled:!visible.length},'↓ Exportar pagos')),
    h('div',{className:'card record-list'},!visible.length?h('div',{className:'empty'},h('h2',null,payments.length?'No hay pagos con estos filtros':'Tus cobros, paso a paso'),h('p',null,'Registra una señal, un anticipo o un pago final. Si ya lo apuntaste en Ingresos, usa «Vincular ingreso existente».')):
      visible.map(p=>h('article',{key:p.id,className:'record'},
        h('div',{className:'record-main'},h('div',{className:'record-date'},Mv(p.date)),h('h3',null,p.client),h('p',{className:'muted'},p.concept||'Pago a cuenta'),h('p',{className:'small'},`${p.payment_method} · ${p.category}`),h('span',{className:'badge '+(p.job_id?'settled':'pending')},p.job_id?(byId.get(p.job_id)?.name||'Trabajo no disponible'):'Sin trabajo asignado'),p.payment_notes&&h('p',{className:'crm-notes small'},p.payment_notes)),
        h('strong',{className:'record-amount mono green'},$n(p.amount_cents)),
        h('div',{className:'record-actions'},h('button',{className:'btn subtle',disabled:!online,onClick:()=>setEditor({entry:p})},p.job_id?'Editar pago':'Enlazar / editar'),p.job_id&&byId.has(p.job_id)&&h('button',{className:'btn subtle',disabled:!online,onClick:()=>onEditJob(byId.get(p.job_id))},'Ver trabajo'),h('button',{className:'btn subtle danger',disabled:!online,onClick:()=>setRemoving(p)},'Eliminar'))))),
    h('p',{className:'small muted'},'Las cantidades que ya figuraban como cobradas se conservan. Al recuperar un pago antiguo puedes indicar que ya estaba incluido en el trabajo.'),
    picker&&h(IncomePicker,{income:available,onClose:()=>setPicker(false),onPick:entry=>{setPicker(false);setEditor({entry});}}),
    editor&&h(PaymentEditor,{...editor,jobs,online,onClose:()=>setEditor(null),onSaved:()=>{setEditor(null);setYear('all');setMonth('0');setStatus('all');setQuery('');setNotice('Pago guardado. El ingreso y los cobros del trabajo están actualizados.');}}),
    removing&&h(Iw,{title:'Eliminar pago',busy,onClose:()=>!busy&&setRemoving(null)},h('p',null,`Se eliminará el pago de ${$n(removing.amount_cents)} de ${removing.client} y su ingreso. ${removing.job_id?'También se descontará de lo cobrado del trabajo.':''}`),h('p',{className:'small muted'},'Esta acción no se puede deshacer.'),h('div',{className:'modal-footer'},h('button',{className:'btn',disabled:busy,onClick:()=>setRemoving(null)},'Cancelar'),h('button',{className:'btn danger-solid',disabled:busy,onClick:async()=>{setBusy(true);setError('');try{await PaymentServices.remove(removing);setNotice('Pago e ingreso eliminados.');setRemoving(null);}catch(e){setRemoving(null);setError(kl(e));}finally{setBusy(false);}}},busy?'Eliminando…':'Eliminar pago'))));
}
function IncomePicker({income,onClose,onPick}) {
  const h=crmEl,[query,setQuery]=he.useState('');
  const visible=income.filter(p=>crmText(`${p.date} ${p.client} ${p.concept}`).includes(crmText(query)));
  return h(Iw,{title:'Vincular ingreso existente',onClose},h('p',{className:'muted'},'Elige un ingreso ya registrado. Aparecerá también en Pagos sin duplicar su importe.'),h(Ll,{label:'Buscar ingreso'},h('input',{type:'search',value:query,onChange:e=>setQuery(e.target.value),placeholder:'Nombre, concepto o fecha (2026-10)…'})),h('div',{className:'payment-income-list'},visible.map(p=>h('button',{key:p.id,className:'payment-income-option',onClick:()=>onPick(p)},h('strong',null,p.client||p.concept),h('span',null,`${Mv(p.date)} · ${p.concept||p.category} · ${$n(p.amount_cents)}`)))),!visible.length&&h('p',null,'No hay ingresos que coincidan.'));
}
function PaymentEditor({entry,seed,jobs,online,onClose,onSaved}) {
  const h=crmEl,[busy,setBusy]=he.useState(false),[error,setError]=he.useState('');
  const [jobId,setJobId]=he.useState(entry?.job_id||seed?.id||''),[client,setClient]=he.useState(entry?.client||seed?.name||'');
  const [included,setIncluded]=he.useState(false),newId=he.useRef(null);
  if(!newId.current)newId.current=entry?.id||PaymentServices.newId();
  const job=jobs.find(j=>j.id===jobId), canRecover=!!jobId&&!entry?.job_id;
  const defaultCategory=entry?.category||(seed?.type?.toLowerCase().includes('falla')?'Fallas':seed?.type?.toLowerCase().includes('boda')?'Bodas':'Otros');
  async function save(event){event.preventDefault();if(busy)return;setBusy(true);setError('');try{const form=new FormData(event.currentTarget),data=paymentPayload(form);await PaymentServices.save(data,entry,newId.current,included&&canRecover);await onSaved();}catch(e){setError(kl(e));}finally{setBusy(false);}}
  return h(Iw,{title:entry?(isClientPayment(entry)?'Editar pago':'Recuperar pago de un ingreso'):'Nuevo pago',busy,onClose},
    h('form',{onSubmit:save},h('fieldset',{disabled:busy},h('div',{className:'formgrid'},
      h(Ll,{label:'Fecha del pago'},h('input',{type:'date',name:'date',required:true,min:'2026-01-01',max:'2100-12-31',defaultValue:entry?.date||dF(new Date().getFullYear())})),
      h(Ll,{label:'Importe del pago (€)'},h('input',{name:'amount_cents',inputMode:'decimal',required:true,maxLength:16,placeholder:'0,00',defaultValue:entry?(entry.amount_cents/100).toFixed(2).replace('.',','):''})),
      h(Ll,{label:'Trabajo vinculado',full:true},h('select',{name:'job_id',value:jobId,onChange:e=>{const id=e.target.value;setJobId(id);setIncluded(false);if(!client)setClient(jobs.find(j=>j.id===id)?.name||'');}},h('option',{value:''},'Sin asignar — lo enlazaré más adelante'),jobs.map(j=>h('option',{key:j.id,value:j.id},`${j.name} · ${Mv(j.date)} · ${j.type||'Trabajo'}`)))),
      h(Ll,{label:'Cliente'},h('input',{name:'client',required:true,maxLength:180,value:client,onChange:e=>setClient(e.target.value)})),
      h(Ll,{label:'Concepto'},h('input',{name:'concept',maxLength:500,placeholder:'Señal, segundo pago, pago final…',defaultValue:entry?.concept||''})),
      h(Ll,{label:'Categoría'},h('select',{name:'category',defaultValue:defaultCategory},Aw.map(c=>h('option',{key:c},c)))),
      h(Ll,{label:'Forma de pago'},h('select',{name:'payment_method',defaultValue:entry?.payment_method||'Sin especificar'},PAYMENT_METHODS.map(m=>h('option',{key:m},m)))),
      h(Ll,{label:'Observaciones del pago',full:true},h('textarea',{name:'payment_notes',rows:3,maxLength:2000,defaultValue:entry?.payment_notes||''}))),
      job&&h('p',{className:'notice'},`Trabajo: ${$n(job.total_cents)} · Cobrado: ${$n(job.paid_cents)} · Pendiente: ${$n(job.total_cents-job.paid_cents)}`),
      canRecover&&h('label',{className:'check-label payment-recovery'},h('input',{type:'checkbox',checked:included,onChange:e=>setIncluded(e.target.checked)}),'Este importe ya está incluido en lo cobrado del trabajo'),
      h('p',{className:'small muted'},entry&&!isClientPayment(entry)?'Se reutiliza el ingreso elegido. Su importe no se sumará dos veces.':entry?'Los cambios se aplican también al ingreso y al trabajo vinculado.':'Al guardar se añade el ingreso. Si eliges un trabajo, también se actualiza lo cobrado.')),
      error&&h('p',{className:'error',role:'alert'},error),h('div',{className:'modal-footer'},h('button',{type:'button',className:'btn',disabled:busy,onClick:onClose},'Cancelar'),h('button',{className:'btn primary',disabled:busy||!online},busy?'Guardando…':'Guardar pago'))));
}
