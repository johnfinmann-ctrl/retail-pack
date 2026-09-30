(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let stream = null, active = false, token = 0, timer = null;
  function stop() {
    active = false; token++;
    if (timer) clearTimeout(timer);
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    $('scanoverlay').innerHTML = '';
  }
  function message(text) {
    $('scanoverlay').innerHTML = `<div class="scanback"><div class="scanbox" role="dialog" aria-modal="true"><p>${text}</p><button type="button" id="scanclose">Luk</button></div></div>`;
    $('scanclose').onclick = stop;
  }
  async function scan() {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      message('Kamerascanning er ikke understøttet her. Skriv ordrenummeret, eller brug en håndscanner i søgefeltet.'); return;
    }
    const current = ++token;
    try {
      const supported = typeof window.BarcodeDetector.getSupportedFormats === 'function' ? await window.BarcodeDetector.getSupportedFormats() : [];
      const formats = ['qr_code','code_128','ean_13'].filter(format => supported.includes(format));
      if (!formats.length) { message('Dette kamera understøtter ikke de relevante kodeformater. Brug en håndscanner eller indtast ordrenummeret.'); return; }
      const detector = new window.BarcodeDetector({formats});
      const camera = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if (current !== token) {camera.getTracks().forEach(track => track.stop());return;}
      stream = camera; active = true;
      $('scanoverlay').innerHTML = '<div class="scanback"><div class="scanbox" role="dialog" aria-modal="true" aria-label="Scan ordrekode"><b>Hold ordrekoden foran kameraet</b><video id="scanvideo" autoplay muted playsinline></video><p>QR eller Code 128. Tryk Luk for at stoppe kameraet.</p><button type="button" id="scanclose">Luk kamera</button></div></div>';
      $('scanclose').onclick = stop;
      const video = $('scanvideo'); video.srcObject = camera; await video.play();
      async function detect() {
        if (!active || current !== token) return;
        try {
          const codes = await detector.detect(video);
          const value = codes.find(code => code.rawValue?.trim())?.rawValue.trim();
          if (value) {
            stop(); const query = $('query'); query.value = value; query.dispatchEvent(new Event('input',{bubbles:true})); query.focus();
            $('toast').textContent = 'Kode læst. Kontrollér ordre og leveringssted.';
            setTimeout(() => { if ($('toast').textContent === 'Kode læst. Kontrollér ordre og leveringssted.') $('toast').textContent = ''; },3500);
            return;
          }
        } catch (_) { /* Fortsæt, hvis én kameraramme ikke kan læses. */ }
        if (active && current === token) timer = setTimeout(detect,180);
      }
      detect();
    } catch (_) { stop(); message('Kameraet kunne ikke åbnes. Kontrollér kameratilladelsen, eller indtast ordrenummeret manuelt.'); }
  }
  $('camerascan').onclick = scan;
  document.addEventListener('keydown',event => {if (event.key === 'Escape' && $('scanoverlay').innerHTML) stop();});
  document.addEventListener('visibilitychange',() => {if (document.hidden) stop();});
  window.addEventListener('pagehide',stop);
})();
