// Runs inside the existing application bundle, reusing its React and Firebase SDK.
const CRM_FIELDS = [
  ['name', 'Nombre o razón social', 180],
  ['contact_name', 'Persona de contacto / representante', 180],
  ['tax_id', 'DNI / NIF', 30],
  ['phone', 'Teléfono', 40, 'tel'],
  ['email', 'Email', 254, 'email'],
  ['address', 'Dirección', 500],
];
const crmText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
function crmJobs(profile, jobs) {
  const ids = new Set(profile.job_ids || []);
  return jobs.filter(job => ids.has(job.id));
}
function crmTotals(jobs) {
  return jobs.reduce((sum, job) => ({
    total: sum.total + Number(job.total_cents || 0),
    paid: sum.paid + Number(job.paid_cents || 0),
    pending: sum.pending + Number(job.total_cents || 0) - Number(job.paid_cents || 0),
  }), {total: 0, paid: 0, pending: 0});
}
function crmPayload(form, ids) {
  const data = {};
  for (const [key, label, max] of CRM_FIELDS) {
    data[key] = String(form.get(key) || '').trim();
    if (data[key].length > max) throw new Error(`${label}: máximo ${max} caracteres.`);
  }
  if (!data.name) throw new Error('Indica el nombre del cliente.');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Revisa el email.');
  data.notes = String(form.get('notes') || '').trim();
  if (data.notes.length > 4000) throw new Error('Las observaciones admiten hasta 4000 caracteres.');
  data.job_ids = [...new Set(ids)];
  if (data.job_ids.length > 500) throw new Error('Cada ficha admite hasta 500 trabajos.');
  return data;
}
function crmCSV(profiles, jobs) {
  const rows = [['Nombre o razón social', 'Contacto / representante', 'DNI / NIF', 'Teléfono', 'Email', 'Dirección', 'Observaciones', 'Trabajos', 'Total EUR', 'Cobrado EUR', 'Pendiente EUR']];
  for (const profile of profiles) {
    const linked = crmJobs(profile, jobs), totals = crmTotals(linked);
    rows.push([...CRM_FIELDS.map(([key]) => profile[key] || ''), profile.notes || '', linked.length,
      ...[totals.total, totals.paid, totals.pending].map(value => (value / 100).toFixed(2).replace('.', ','))]);
  }
  return '\uFEFF' + rows.map(row => row.map(CF).join(';')).join('\r\n');
}
const CRMServices = {
  subscribe(onData, onError) {
    return eF(tB('profiles'), {includeMetadataChanges: true}, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      onData(snapshot.docs.map(doc => ({...doc.data(), id: doc.id, updated_at: Hf(doc.data().updated_at)}))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')));
    }, onError);
  },
  save: (data, entry) => uF('profiles', data, entry),
};
const crmEl = (type, props, ...children) => he.createElement(type, props, ...children);
function CRMDirectory({jobs, online, onEditJob, onPayment, seed, onSeedUsed}) {
  const h = crmEl;
  const [profiles, setProfiles] = he.useState([]);
  const [loaded, setLoaded] = he.useState(false);
  const [error, setError] = he.useState('');
  const [retry, setRetry] = he.useState(0);
  const [search, setSearch] = he.useState('');
  const [selected, setSelected] = he.useState(null);
  const [editor, setEditor] = he.useState(null);
  const [notice, setNotice] = he.useState('');
  he.useEffect(() => {
    setError('');
    return CRMServices.subscribe(data => {setProfiles(data); setLoaded(true); setError('');},
      err => {setError(kl(err)); setLoaded(false);});
  }, [retry]);
  he.useEffect(() => {
    if (!loaded || !seed) return;
    const existing = profiles.find(profile => (profile.job_ids || []).includes(seed.id));
    if (existing) setSelected(existing.id);
    else setEditor({entry: null, seed});
    onSeedUsed();
  }, [loaded, seed, profiles]);
  const profile = profiles.find(item => item.id === selected);
  const query = crmText(search);
  const visible = profiles.filter(item => [...CRM_FIELDS.map(([key]) => item[key]), item.notes,
    ...crmJobs(item, jobs).map(job => `${job.name} ${job.type}`)].some(value => crmText(value).includes(query)));
  const linkedIds = new Set(profiles.flatMap(item => item.job_ids || []));
  const unlinked = jobs.filter(job => !linkedIds.has(job.id));
  function exportProfiles() {
    const url = URL.createObjectURL(new Blob([crmCSV(profiles, jobs)], {type: 'text/csv;charset=utf-8;'}));
    const link = document.createElement('a'); link.href = url; link.download = 'fichas-de-clientes.csv';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Exportación preparada con todas las fichas.');
  }
  return h('section', {className: 'crm-directory', 'aria-label': 'Fichas de clientes'},
    h('div', {className: 'crm-toolbar'},
      h('p', {className: 'muted'}, 'Datos de contacto y trabajos vinculados, de todos los años.'),
      h('div', {className: 'actions'},
        h('button', {className: 'btn', onClick: exportProfiles, disabled: !loaded || !profiles.length}, '↓ Exportar fichas'),
        h('button', {className: 'btn primary', disabled: !online || !loaded, onClick: () => setEditor({entry: null})}, '＋ Nueva ficha'))),
    error && h('div', {className: 'error', role: 'alert'}, error,
      h('button', {className: 'btn', onClick: () => setRetry(value => value + 1)}, 'Reintentar fichas')),
    !loaded && !error && h('p', {role: 'status', className: 'muted'}, 'Cargando fichas…'),
    notice && h('p', {className: 'notice success', role: 'status'}, notice),
    loaded && (profile ? h(CRMDetail, {profile, jobs, online, onPayment,
      onBack: () => setSelected(null), onEdit: () => setEditor({entry: profile}), onEditJob}) :
      h(he.Fragment, null,
        h('label', {className: 'field crm-search'}, h('span', null, 'Buscar fichas'),
          h('input', {type: 'search', placeholder: 'Nombre, teléfono, email, DNI…', value: search, onChange: event => setSearch(event.target.value)})),
        h('p', {className: 'small muted'}, `${visible.length} ${visible.length === 1 ? 'ficha' : 'fichas'}`),
        h('div', {className: 'crm-grid'}, visible.map(item => {
          const linked = crmJobs(item, jobs), totals = crmTotals(linked);
          return h('button', {key: item.id, className: 'card crm-card', onClick: () => {setSelected(item.id); setNotice('');}},
            h('span', {className: 'crm-initial', 'aria-hidden': true}, item.name.slice(0, 1).toUpperCase()),
            h('h2', null, item.name), h('p', {className: 'muted'}, item.contact_name || item.email || item.phone || 'Datos de contacto por completar'),
            h('div', {className: 'crm-card-footer'}, h('span', {className: 'small'}, `${linked.length} trabajos`),
              h('span', {className: 'badge ' + (totals.pending > 0 ? 'pending' : 'settled')}, totals.pending > 0 ? `${$n(totals.pending)} pendiente` : 'Sin pendiente')));
        })),
        !visible.length && h('div', {className: 'card empty'}, h('h2', null, search ? 'No hay coincidencias' : 'Tus clientes, en un solo lugar'),
          h('p', null, search ? 'Prueba con otro nombre o dato de contacto.' : 'Crea una ficha o empieza a partir de uno de tus trabajos actuales.')),
        unlinked.length > 0 && h('details', {className: 'card crm-unlinked'},
          h('summary', null, `Trabajos sin ficha (${unlinked.length})`),
          h('p', {className: 'small muted'}, 'Crea una ficha desde un trabajo, o edita una ficha existente para vincularlo.'),
          unlinked.map(job => h('div', {key: job.id, className: 'crm-job-option'},
            h('div', null, h('strong', null, job.name), h('p', {className: 'small muted'}, `${Mv(job.date)} · ${job.type || 'Trabajo'}`)),
            h('button', {className: 'btn', disabled: !online, onClick: () => setEditor({entry: null, seed: job})}, 'Crear ficha')))))),
    editor && h(CRMEditor, {entry: editor.entry, seed: editor.seed, profiles, jobs, online,
      onClose: () => setEditor(null), onSaved: () => {setEditor(null); setNotice('Ficha guardada.');}}));
}
function CRMDetail({profile, jobs, online, onBack, onEdit, onEditJob, onPayment}) {
  const h = crmEl, linked = crmJobs(profile, jobs), totals = crmTotals(linked);
  return h(he.Fragment, null,
    h('div', {className: 'crm-toolbar'}, h('button', {className: 'btn', onClick: onBack}, '← Todas las fichas'),
      h('button', {className: 'btn primary', onClick: onEdit, disabled: !online}, 'Editar ficha')),
    h('article', {className: 'card crm-detail'}, h('div', {className: 'eyebrow'}, 'FICHA DE CLIENTE'), h('h2', null, profile.name),
      h('dl', {className: 'crm-data'}, CRM_FIELDS.slice(1).map(([key, label]) => h('div', {key},
        h('dt', {className: 'small muted'}, label), h('dd', null, profile[key] || 'Sin completar')))),
      profile.notes && h('div', null, h('h3', null, 'Observaciones'), h('p', {className: 'crm-notes'}, profile.notes))),
    h('section', {className: 'kpi-grid', 'aria-label': 'Totales del cliente de todos los años'},
      h(nm, {label: 'Total contratado', value: $n(totals.total), detail: 'Trabajos vinculados', tone: 'balance'}),
      h(nm, {label: 'Cobrado', value: $n(totals.paid), detail: 'Todos los años', tone: 'green'}),
      h(nm, {label: 'Pendiente', value: $n(totals.pending), detail: 'Por cobrar', tone: 'balance'})),
    h('section', {className: 'card crm-detail'}, h('h2', null, `Trabajos y cobros (${linked.length})`),
      !linked.length && h('p', {className: 'muted'}, 'Edita la ficha para vincular los trabajos de este cliente.'),
      linked.map(job => h('article', {key: job.id, className: 'record'},
        h('div', {className: 'record-main'}, h('div', {className: 'record-date'}, Mv(job.date)), h('h3', null, job.name),
          h('p', {className: 'muted'}, job.type || 'Trabajo'), job.notes && h('p', {className: 'crm-notes small'}, job.notes)),
        h('div', {className: 'record-amount'}, h('strong', {className: 'mono'}, $n(job.total_cents)),
          h('span', {className: 'small muted'}, `${$n(job.paid_cents)} cobrado`),
          h('span', {className: 'badge ' + (job.total_cents > job.paid_cents ? 'pending' : 'settled')}, `${$n(job.total_cents - job.paid_cents)} pendiente`)),
        h('div', {className:'actions'},
          onPayment && h('button', {className:'btn primary',disabled:!online,onClick:()=>onPayment(job)},'Registrar pago'),
          h('button', {className: 'btn', disabled: !online, onClick: () => onEditJob(job)}, 'Editar trabajo'))))));
}
function CRMEditor({entry, seed, profiles, jobs, online, onClose, onSaved}) {
  const h = crmEl, initial = entry || {name: seed?.name || ''};
  const [ids, setIds] = he.useState(entry?.job_ids || (seed ? [seed.id] : []));
  const [busy, setBusy] = he.useState(false), [error, setError] = he.useState('');
  const [jobSearch, setJobSearch] = he.useState('');
  const available = jobs.filter(job => crmText(`${job.name} ${job.type} ${job.date}`).includes(crmText(jobSearch)));
  async function save(event) {
    event.preventDefault(); if (busy) return;
    setError(''); setBusy(true);
    try {
      if (!online) throw new Error('Necesitas conexión para guardar.');
      const data = crmPayload(new FormData(event.currentTarget), ids);
      const tax = crmText(data.tax_id).replace(/[\s-]/g, '');
      if (tax && profiles.some(item => item.id !== entry?.id && crmText(item.tax_id).replace(/[\s-]/g, '') === tax))
        throw new Error('Ya existe una ficha con ese DNI / NIF. Edita la ficha existente para añadirle trabajos.');
      await CRMServices.save(data, entry); onSaved();
    } catch (err) {setError(kl(err));} finally {setBusy(false);}
  }
  return h(Iw, {title: entry ? 'Editar ficha de cliente' : 'Nueva ficha de cliente', onClose, busy},
    h('form', {onSubmit: save},
      h('fieldset', {disabled: busy},
        h('div', {className: 'formgrid'}, CRM_FIELDS.map(([key, label, max, type]) =>
          h(Ll, {key, label, full: key === 'address'}, h('input', {name: key, defaultValue: initial[key] || '',
            type: type || 'text', required: key === 'name', maxLength: max}))),
          h(Ll, {label: 'Observaciones', full: true}, h('textarea', {name: 'notes', rows: 4, maxLength: 4000, defaultValue: initial.notes || ''}))),
        h('div', {className: 'crm-linker'}, h('h3', null, 'Trabajos vinculados'),
          h('p', {className: 'small muted'}, 'Selecciona los trabajos de este cliente. Se muestran todos los años.'),
          h('label', {className: 'field'}, h('span', null, 'Buscar trabajos'), h('input', {type: 'search', value: jobSearch, onChange: event => setJobSearch(event.target.value)})),
          h('div', {className: 'crm-job-list'}, available.map(job => {
            const other = profiles.find(item => item.id !== entry?.id && (item.job_ids || []).includes(job.id));
            return h('label', {className: 'crm-job-check', key: job.id},
              h('input', {type: 'checkbox', checked: ids.includes(job.id), disabled: !!other && !ids.includes(job.id), onChange: event =>
                setIds(current => event.target.checked ? [...new Set([...current, job.id])] : current.filter(id => id !== job.id))}),
              h('span', null, h('strong', null, job.name), h('small', null, `${Mv(job.date)} · ${job.type || 'Trabajo'}${other ? ` · Ficha: ${other.name}` : ''}`)));
          })), !available.length && h('p', {className: 'small muted'}, 'No hay trabajos que coincidan.'),
          h('p', {className: 'small muted'}, `${ids.length} trabajos seleccionados`))),
      error && h('p', {className: 'error', role: 'alert'}, error),
      h('div', {className: 'modal-footer'}, h('button', {className: 'btn', type: 'button', disabled: busy, onClick: onClose}, 'Cancelar'),
        h('button', {className: 'btn primary', disabled: busy || !online}, busy ? 'Guardando…' : 'Guardar ficha'))));
}
