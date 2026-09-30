(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let load = null, selected = 0, videoURL = null, generation = 0;
  const stamp = () => new Date().toLocaleString('da-DK');
  function announce(removed = false) { if (load) window.dispatchEvent(new CustomEvent('retailpack:load', {detail:{id:load.id,group:load.customer,chain:load.chain,place:load.destination,date:load.date,count:load.count,photos:load.photos.filter(Boolean).length,removed}})); }
  function filename(value) { return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'laesning'; }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function render() {
    $('loadwork').hidden = !load;
    if (!load) return;
    const done = load.photos.filter(Boolean).length;
    $('loadmeta').textContent = `${load.id} · ${load.customer} / ${load.chain} → ${load.recipient} (${load.country}) · Startet ${load.started}`;
    $('loadprogress').textContent = `${done} af ${load.count} paller fotograferet${done === load.count ? ' · komplet fotoserie' : ''}`;
    $('palletgrid').innerHTML = load.photos.map((photo, i) => `<button type="button" data-pallet="${i}" class="${photo ? 'done' : ''} ${i === selected ? 'current' : ''}" aria-label="Palle ${i + 1}${photo ? ', foto taget' : ', mangler foto'}" aria-pressed="${i === selected}">${i + 1}${photo ? ' ✓' : ''}</button>`).join('');
    $('palletnumber').textContent = `Palle ${selected + 1} af ${load.count}`;
    $('palletref').value = load.refs[selected];
    $('refhelp').textContent = load.barcode ? 'Indtast palle-ID eller læs det ind med en scanner. ID skal være unikt.' : 'Ingen stregkode: brug et unikt internt ID, og sørg for at foto og palle kan kobles via et synligt palle-nummer.';
    $('loadwarning').hidden = load.barcode;
    $('loadwarning').textContent = load.barcode ? '' : 'Uden stregkode: manuel reference er kun dokumentation i demoen. Modtagerens accept af levering og mærkning skal bekræftes før afsendelse.';
    const current = load.photos[selected];
    $('loadpreview').innerHTML = current ? `<img src="${current.data}" alt="Foto af palle ${selected + 1}"><span>Fotograferet ${esc(current.time)}. Tag et nyt foto for at erstatte.</span>` : '<span>Mangler foto af denne palle.</span>';
    $('loadexport').disabled = !done;
    $('videoexport').hidden = !load.video;
    $('videopreview').innerHTML = load.video ? `<p>Video: ${esc(load.video.name)} · valgt ${esc(load.video.time)}. Hent den separat.</p><video controls playsinline src="${videoURL}"></video>` : '<p>Valgfri video til overblik over hele læsningen.</p>';
  }
  function start() {
    const id = $('loadorder').value.trim(), count = Number($('loadcount').value), country = $('loadcountry').value, barcode = $('loadbarcode').value === 'yes';
    if (!id) { $('loadorder').focus(); return; }
    if (!Number.isInteger(count) || count < 1 || count > 33) { $('loadcount').focus(); return; }
    const recipient = $('loadrecipient').value.trim() || (country === 'Danmark' ? $('destination').value : '');
    if (!recipient) { $('loadrecipient').focus(); alert('Skriv den konkrete modtager og det polske lager.'); return; }
    if (load && (load.photos.some(Boolean) || load.video) && !confirm('En ny læsning sletter billeder og video fra denne session. Har du hentet dokumentationen?')) return;
    announce(true);
    if (videoURL) URL.revokeObjectURL(videoURL);
    videoURL = null; generation++;
    load = { id, count, country, barcode, recipient, customer: $('customer').value, chain:$('chain').value, destination: $('destination').value, started: stamp(), refs:Array.from({length:count},(_,i)=>`${id}-${String(i+1).padStart(2,'0')}`), photos: Array(count).fill(null), video: null };
    load.date = new Date().toISOString(); selected = 0; $('loadproof').open = true; render(); announce();
  }
  function clear() {
    if ((load?.photos.some(Boolean) || load?.video) && !confirm('Ryd alle billeder og video fra denne session?')) return;
    announce(true); generation++; if (videoURL) URL.revokeObjectURL(videoURL);
    videoURL = null; load = null; selected = 0; $('loadphoto').value = ''; $('loadvideo').value = ''; render();
  }
  function saveRef() {
    if (!load) return false;
    const ref = $('palletref').value.trim();
    if (!ref || load.refs.some((other,i) => i !== selected && other.toLocaleLowerCase('da-DK') === ref.toLocaleLowerCase('da-DK'))) {
      alert('Palle-ID skal udfyldes og være unikt inden for læsningen.'); $('palletref').value = load.refs[selected]; return false;
    }
    load.refs[selected] = ref; return true;
  }
  function photo(file) {
    if (!load || !file) return;
    if (!saveRef()) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) { alert('Vælg JPEG, PNG eller WebP på højst 15 MB.'); return; }
    const slot = selected, token = generation, url = URL.createObjectURL(file), image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        if (!load || token !== generation) return;
        load.photos[slot] = { data: canvas.toDataURL('image/jpeg', .78), time: stamp() };
        const next = load.photos.findIndex((item, i) => i > slot && !item);
        selected = next !== -1 ? next : load.photos.findIndex(item => !item);
        if (selected === -1) selected = slot;
        render(); announce();
      } catch (_) { alert('Fotoet kunne ikke behandles. Prøv et andet billede.'); }
      finally { URL.revokeObjectURL(url); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); alert('Fotoet kunne ikke åbnes.'); };
    image.src = url;
  }
  function exportPhotos() {
    if (!load || !load.photos.some(Boolean)) return;
    if (!saveRef()) return;
    const done = load.photos.filter(Boolean).length;
    const pages = load.photos.map((item, i) => `<section><h2>Palle ${i + 1} af ${load.count}</h2><p>Internt palle-ID: <b>${esc(load.refs[i])}</b></p>${item ? `<p>Foto taget ${esc(item.time)}</p><img src="${item.data}" alt="Palle ${i + 1}">` : '<p>Mangler foto.</p>'}</section>`).join('');
    const html = `<!doctype html><html lang="da"><meta charset="utf-8"><title>RetailPackPro · ${esc(load.id)}</title><style>body{font:16px system-ui,sans-serif;max-width:900px;margin:30px auto;padding:0 16px;color:#183747}section{border-top:1px solid #aac4cc;padding:12px 0 24px;break-inside:avoid}img{max-width:100%;max-height:760px}p{line-height:1.5}@media print{section{break-after:page}}</style><h1>Fotodokumentation · ${esc(load.id)}</h1><p>${esc(load.customer)} / ${esc(load.chain)} → ${esc(load.recipient)} · Land: ${esc(load.country)} · Startet ${esc(load.started)} · Eksporteret ${esc(stamp())}</p><p>Stregkode på pallerne: <b>${load.barcode ? 'Ja' : 'Nej – manuelle interne referencer'}</b>. ${load.barcode ? '' : 'Modtagerens accept af levering uden stregkode er ikke dokumenteret i denne demo.'}</p><p><b>${done} af ${load.count} paller fotograferet.</b> ${done === load.count ? 'Fotoserien er komplet.' : 'Fotoserien er ufuldstændig.'} Lokal demoeksport; ikke en godkendt eller uforanderlig registrering. Eventuel oversigtsvideo skal hentes separat.</p>${pages}</html>`;
    download(new Blob([html], {type:'text/html;charset=utf-8'}), `RetailPackPro_${filename(load.id)}_${done}-af-${load.count}.html`);
  }
  $('loadstart').onclick = start;

  $('palletref').onchange = saveRef;
  $('loadclear').onclick = clear;
  $('loadexport').onclick = exportPhotos;
  $('palletgrid').onclick = event => { const button = event.target.closest('[data-pallet]'); if (button && load) { selected = Number(button.dataset.pallet); render(); } };
  $('loadphoto').onchange = event => { photo(event.target.files?.[0]); event.target.value = ''; };
  $('loadvideo').onchange = event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!load || !file) return;
    if (!file.type.startsWith('video/') || file.size > 300 * 1024 * 1024) { alert('Vælg en videofil på højst 300 MB.'); return; }
    if (videoURL) URL.revokeObjectURL(videoURL);
    videoURL = URL.createObjectURL(file); load.video = {file, name:file.name, time:stamp()}; render();
  };
  $('videoexport').onclick = () => { if (load?.video) download(load.video.file, `RetailPackPro_${filename(load.id)}_oversigt.${(load.video.name.split('.').pop() || 'mp4').replace(/[^a-zA-Z0-9]/g, '')}`); };
})();
