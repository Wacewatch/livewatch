import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  const origin = request.nextUrl.origin

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
  }

  const proxyStreamUrl = `${origin}/api/proxy/play/${id}/index.m3u8`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>Stream Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.11/dist/hls.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.85);
      z-index: 10;
      transition: opacity 0.3s;
    }
    .overlay.hidden { opacity: 0; pointer-events: none; }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(34, 211, 238, 0.2);
      border-top-color: #22d3ee;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .msg { color: #22d3ee; font-size: 14px; margin-top: 16px; font-family: system-ui, sans-serif; }
    .sub { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 8px; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div class="overlay" id="overlay">
    <div class="spinner"></div>
    <p class="msg" id="msg">Connexion...</p>
    <p class="sub" id="sub"></p>
  </div>
  <video id="video" controls autoplay playsinline></video>
  
  <script>
    const video = document.getElementById('video');
    const overlay = document.getElementById('overlay');
    const msg = document.getElementById('msg');
    const sub = document.getElementById('sub');
    const streamUrl = '${proxyStreamUrl}';
    
    let hls = null;
    let retryCount = 0;
    let retryTimer = null;
    const maxRetries = 10;
    
    function sendStatus(status, message) {
      try { window.parent.postMessage({ type: 'playerStatus', status, message }, '*'); } catch(e) {}
    }
    
    function showOverlay(text, subtext) {
      msg.textContent = text;
      sub.textContent = subtext || '';
      overlay.classList.remove('hidden');
    }
    
    function hideOverlay() {
      overlay.classList.add('hidden');
    }
    
    function scheduleRetry(reason) {
      if (retryTimer) clearTimeout(retryTimer);
      
      retryCount++;
      if (retryCount > maxRetries) {
        showOverlay('Flux indisponible', 'Essayez une autre source');
        sendStatus('error', 'Flux indisponible');
        return;
      }
      
      const delay = Math.min(2000 + (retryCount * 1000), 8000);
      showOverlay('Reconnexion ' + retryCount + '/' + maxRetries, reason);
      sendStatus('buffering', 'Reconnexion ' + retryCount + '/' + maxRetries);
      
      retryTimer = setTimeout(() => {
        if (hls) {
          hls.stopLoad();
          hls.startLoad(-1);
        }
      }, delay);
    }
    
    function initPlayer() {
      showOverlay('Connexion...', '');
      sendStatus('loading', 'Connexion...');
      
      if (!Hls.isSupported()) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.play().catch(() => {});
          return;
        }
        showOverlay('Navigateur non supporte', '');
        sendStatus('error', 'Navigateur non supporte');
        return;
      }
      
      if (hls) hls.destroy();
      
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Buffer settings - balanced for reliability
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        // Auto quality selection
        startLevel: -1,
        // ABR settings
        abrEwmaDefaultEstimate: 500000,
        abrEwmaFastLive: 3,
        abrEwmaSlowLive: 9,
        // Generous timeouts - streams can be slow
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        // Live settings
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,
      });
      
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        sendStatus('loading', 'Demarrage...');
        video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
      });
      
      hls.on(Hls.Events.FRAG_LOADING, () => {
        showOverlay('Chargement...', '');
      });
      
      hls.on(Hls.Events.FRAG_LOADED, () => {
        retryCount = 0;
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      });
      
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        hideOverlay();
        sendStatus('playing', 'Lecture en cours');
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            scheduleRetry('Erreur reseau');
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            scheduleRetry('Erreur de flux');
          }
        }
      });
    }
    
    video.addEventListener('playing', () => { hideOverlay(); retryCount = 0; sendStatus('playing', 'Lecture en cours'); });
    video.addEventListener('waiting', () => { showOverlay('Mise en memoire...', ''); sendStatus('buffering', 'Mise en memoire tampon...'); });
    video.addEventListener('canplay', () => { hideOverlay(); });
    video.addEventListener('error', () => { scheduleRetry('Erreur video'); });
    
    initPlayer();
  <\/script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
