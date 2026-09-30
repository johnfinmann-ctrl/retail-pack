(() => {
  const $ = id => document.getElementById(id);
  const sidebar = document.querySelector('.sidebar');
  const activity = document.querySelector('[aria-label="Aktivitet i denne session"]');
  const sources = document.querySelector('.sources');
  const dashboard = $('dashboard'), proof = $('loadproof');
  let view = 'packing';
  function show(next) {
    view = next;
    action.hidden = next !== 'packing' || !$('detail').querySelector('.detailhead');
    sidebar.hidden = next !== 'packing';
    $('detail').hidden = next !== 'packing';
    $('guideheading').hidden = next !== 'packing';
    dashboard.hidden = next !== 'dashboard';
    dashboard.open = next === 'dashboard';
    proof.hidden = next !== 'evidence';
    proof.open = next === 'evidence';
    activity.hidden = next !== 'evidence';
    sources.hidden = next !== 'packing';
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === next)));
    if (next === 'evidence' && !$('loadorder').value) $('loadorder').value = $('query').value.trim();
  }
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => show(b.dataset.view));
  $('findorder').onclick = () => {
    const value = $('query').value.trim();
    if (!value) { $('orderfeedback').textContent = 'Scan eller skriv et ordrenummer.'; $('query').focus(); return; }
    $('query').dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
    if ($('query').value.trim()) $('orderfeedback').textContent = 'Ordren blev ikke fundet. Prøv DEMO-1043. Rigtige ordrer er ikke tilsluttet endnu.';
  };
  $('query').addEventListener('input', () => $('orderfeedback').textContent = '');
  window.addEventListener('retailpack:order', e => {
    $('orderfeedback').textContent = '';
    $('loadorder').value = e.detail.id;
    $('manualsetup').open = false;
    show('packing');
  });
  const action = document.createElement('button');
  action.type = 'button'; action.className = 'secondary';
  action.textContent = 'Fortsæt til foto eller video';
  action.style.cssText = 'width:100%;min-height:54px;margin:14px 0;font-size:1rem';
  action.onclick = () => { show('evidence'); proof.scrollIntoView({behavior:'smooth',block:'start'}); };
  $('detail').after(action);
  const observer = new MutationObserver(() => { action.hidden = view !== 'packing' || !$('detail').querySelector('.detailhead'); });
  observer.observe($('detail'), {childList:true});
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => action.hidden = view !== 'packing' || !$('detail').querySelector('.detailhead')));
  action.hidden = true;
  show('packing');
})();
