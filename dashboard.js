(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const groups = {
    'Salling Group':['Netto','Bilka','føtex','BR','Salling Stormagasiner'],
    'Coop':['Kvickly','SuperBrugsen','Brugsen','365discount'],
    'Dagrofa':['MENY','SPAR','Min Købmand','Let-Køb','Dagrofa Foodservice'],
    'Reitan':['REMA 1000','7-Eleven'],
    'Lidl':['Lidl'],
    'Øvrige kunder':['nemlig.com','Candy People AB','Trimex']
  };
  const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now = new Date();
  const dayAgo = n => { const d = new Date(now.getFullYear(),now.getMonth(),now.getDate()); d.setDate(d.getDate()-n); return d.toISOString(); };
  // Fiktive tal, kun til at afprøve grupper og periodevalg.
  const sample = [
    ['Salling Group','Netto',0,33,31,3,1],['Salling Group','Bilka',1,18,18,2,0],
    ['Salling Group','føtex',2,24,22,2,1],['Salling Group','Netto',8,30,26,2,2],
    ['Salling Group','Bilka',23,14,14,1,0],['Salling Group','føtex',48,20,19,2,0],
    ['Coop','Kvickly',0,16,16,1,0],['Coop','SuperBrugsen',5,20,18,2,1],
    ['Coop','Brugsen',17,12,12,1,0],['Coop','365discount',38,13,12,1,0],
    ['Dagrofa','MENY',1,14,14,1,0],['Dagrofa','SPAR',19,10,9,1,1],['Dagrofa','Min Købmand',4,8,8,1,0],['Dagrofa','Let-Køb',24,6,6,1,0],
    ['Reitan','REMA 1000',3,28,26,2,1],['Lidl','Lidl',11,22,22,2,0],
    ['Reitan','7-Eleven',6,10,9,1,0],['Øvrige kunder','nemlig.com',9,17,16,1,1],
    ['Salling Group','Netto',380,27,25,2,1]
  ].map(([group,chain,days,pallets,photos,checks,deviations]) => ({group,chain,date:dayAgo(days),loads:1,pallets,photos,checks,deviations,place:chain}));
  const loads = new Map(), activities = [];
  let offset = 0;
  function chainOf(group, place) {
    if (group === 'Salling Group') return /netto/i.test(place) ? 'Netto' : /bilka/i.test(place) ? 'Bilka' : /føtex/i.test(place) ? 'føtex' : /\bBR\b/.test(place) ? 'BR' : /salling/i.test(place) ? 'Salling Stormagasiner' : 'Andet';
    if (group === 'Coop') return /kvickly/i.test(place) ? 'Kvickly' : /superbrugsen/i.test(place) ? 'SuperBrugsen' : /brugsen/i.test(place) ? 'Brugsen' : /365/i.test(place) ? '365discount' : 'Andet';
    if (group === 'Dagrofa') return /meny/i.test(place) ? 'MENY' : /spar/i.test(place) ? 'SPAR' : /min købmand/i.test(place) ? 'Min Købmand' : /let-køb/i.test(place) ? 'Let-Køb' : /foodservice/i.test(place) ? 'Dagrofa Foodservice' : 'Andet';
    if (group === 'Reitan') return /7-eleven/i.test(place) ? '7-Eleven' : 'REMA 1000';
    if (group === 'Lidl') return 'Lidl';
    if (group === 'Øvrige kunder') return /nemlig/i.test(place) ? 'nemlig.com' : /candy people/i.test(place) ? 'Candy People AB' : /trimex/i.test(place) ? 'Trimex' : 'Andet';
    return 'Andet';
  }
  function period() {
    const unit = $('dashunit').value, start = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    if (unit === 'week') { start.setDate(start.getDate() - (start.getDay()+6)%7 + offset*7); }
    else if (unit === 'month') { start.setDate(1); start.setMonth(start.getMonth()+offset); }
    else { start.setMonth(0,1); start.setFullYear(start.getFullYear()+offset); }
    const end = new Date(start);
    if (unit === 'week') end.setDate(end.getDate()+7);
    else if (unit === 'month') end.setMonth(end.getMonth()+1);
    else end.setFullYear(end.getFullYear()+1);
    const last = new Date(end); last.setDate(last.getDate()-1);
    const label = unit === 'year' ? String(start.getFullYear()) : unit === 'month' ? new Intl.DateTimeFormat('da-DK',{month:'long',year:'numeric'}).format(start) : `${new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'short'}).format(start)} – ${new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'short',year:'numeric'}).format(last)}`;
    return {start,end,label};
  }
  function updateChains() {
    const group = $('dashgroup').value, choices = group === 'Alle' ? [...new Set(Object.values(groups).flat())] : groups[group];
    $('dashchain').innerHTML = '<option value="Alle">Alle kæder</option>' + choices.map(chain => `<option value="${esc(chain)}">${esc(chain)}</option>`).join('');
    $('dashchain').value = 'Alle';
  }
  function render() {
    const {start,end,label} = period(), group = $('dashgroup').value, chain = $('dashchain').value;
    $('dashboard').dataset.theme = chain === 'Netto' ? 'netto' : ['Bilka','føtex','BR','Salling Stormagasiner'].includes(chain) ? 'blue' : group === 'Coop' ? 'coop' : group === 'Dagrofa' ? 'dagrofa' : group === 'Reitan' ? 'reitan' : group === 'Lidl' ? 'blue' : 'default';
    const rows = $('dashsource').value === 'sample' ? sample : [...loads.values(),...activities];
    const visible = rows.filter(row => { const date = new Date(row.date); return date >= start && date < end && (group === 'Alle' || row.group === group) && (chain === 'Alle' || row.chain === chain); });
    const sum = field => visible.reduce((total,row) => total + (row[field] || 0),0);
    $('dashrange').textContent = label;
    $('dashnext').disabled = offset >= 0;
    for (const field of ['loads','pallets','photos','checks','deviations']) $('dash'+field).textContent = sum(field).toLocaleString('da-DK');
    $('dashmissing').textContent = visible.reduce((total,row) => total + Math.max(0,(row.pallets||0)-(row.photos||0)),0).toLocaleString('da-DK');
    const categories = chain !== 'Alle' ? [...new Set(visible.map(row => row.place))] : group === 'Alle' ? Object.keys(groups) : groups[group];
    const values = categories.map(name => ({name,count:visible.filter(row => (chain !== 'Alle' ? row.place : group === 'Alle' ? row.group : row.chain) === name).reduce((total,row) => total + row.pallets,0)}));
    const max = Math.max(1,...values.map(row => row.count));
    $('dashbreakdown').innerHTML = `<b>Paller ${chain !== 'Alle' ? 'pr. modtagested' : group === 'Alle' ? 'pr. koncern' : 'pr. kæde'}</b>` + (values.length ? values.map(row => `<div class="dashrow"><span>${esc(row.name)}</span><span class="bar"><i style="width:${Math.round(row.count/max*100)}%"></i></span><b>${row.count}</b></div>`).join('') : '<p>Ingen læsninger i perioden.</p>');
    $('dashnote').textContent = $('dashsource').value === 'sample' ? 'Fiktive eksempeldata. Tallene dokumenterer ingen leverancer eller kundekrav.' : 'Kun hændelser fra denne åbne demosession. Ingen varig lagring; tidligere uger, måneder og år kan først vises med en database.';
  }
  $('dashgroup').innerHTML = '<option value="Alle">Alle koncerner</option>' + Object.keys(groups).map(group => `<option value="${esc(group)}">${esc(group)}</option>`).join('');
  $('dashgroup').value = 'Salling Group'; updateChains();
  $('dashgroup').onchange = () => { updateChains(); render(); };
  $('dashchain').onchange = render;
  $('dashunit').onchange = () => { offset = 0; render(); };
  $('dashsource').onchange = render;
  $('dashprev').onclick = () => { offset--; render(); };
  $('dashnext').onclick = () => { if (offset < 0) {offset++; render();} };
  window.addEventListener('retailpack:load', event => {
    const data = event.detail;
    if (data.removed) loads.delete(data.id);
    else loads.set(data.id,{group:data.group,chain:data.chain || chainOf(data.group,data.place),place:data.place,date:data.date,loads:1,pallets:data.count,photos:data.photos,checks:0,deviations:0});
    if ($('dashsource').value === 'session') render();
  });
  window.addEventListener('retailpack:activity', event => {
    const data = event.detail;
    activities.push({group:data.group,chain:data.chain || chainOf(data.group,data.place),place:data.place,date:data.date,loads:0,pallets:0,photos:Number(data.photo),checks:Number(!data.deviation),deviations:Number(data.deviation)});
    if ($('dashsource').value === 'session') render();
  });
  window.addEventListener('retailpack:activity-reset', () => {activities.length = 0; if ($('dashsource').value === 'session') render();});
  render();
})();
