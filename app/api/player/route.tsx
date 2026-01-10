import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    return new Response("Missing URL parameter", { status: 400 })
  }

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stream Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: #000;
      overflow: hidden;
    }
    #video-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    #status {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 1000;
      backdrop-filter: blur(10px);
      display: none;
    }
    #status.show {
      display: block;
    }
    #status.loading { color: #60a5fa; }
    #status.playing { color: #34d399; }
    #status.error { color: #f87171; }
    #status.buffering { color: #fbbf24; }
  </style>
</head>
<body>
  <div id="video-container">
    <video id="video" controls autoplay playsinline></video>
  </div>
  <div id="status">Initialisation...</div>

  <script>
    const video = document.getElementById('video');
    const statusEl = document.getElementById('status');
    const streamUrl = ${JSON.stringify(url)};
    let hls = null;

    console.log('[v0] Starting player for URL:', streamUrl);

    function showStatus(message, type = 'loading') {
      statusEl.textContent = message;
      statusEl.className = 'show ' + type;
      
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'playerStatus',
            status: type,
            message: message
          }, '*');
        }
      } catch (e) {
        console.log('[v0] Could not send message to parent:', e);
      }
      
      if (type === 'playing') {
        setTimeout(() => {
          statusEl.classList.remove('show');
        }, 2000);
      }
    }

    async function playStream() {
      try {
        showStatus('Chargement du flux...', 'loading');
        console.log('[v0] Loading stream directly');

        const isHLS = streamUrl.includes('m3u8') || streamUrl.includes('.m3u');

        if (Hls.isSupported() && isHLS) {
          console.log('[v0] Using HLS.js for playback');
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            maxFragLookUpTolerance: 0.25,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('[v0] Manifest parsed, starting playback');
            showStatus('Démarrage...', 'buffering');
            video.play().catch(err => {
              console.error('[v0] Autoplay failed:', err);
              showStatus('Cliquez pour lire', 'buffering');
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('[v0] HLS error:', data.type, data.details, data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('[v0] Fatal network error, attempting recovery...');
                  showStatus('Erreur réseau - Tentative de récupération...', 'buffering');
                  setTimeout(() => {
                    if (hls) hls.startLoad();
                  }, 1000);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('[v0] Fatal media error, attempting recovery...');
                  showStatus('Erreur média - Tentative de récupération...', 'buffering');
                  if (hls) hls.recoverMediaError();
                  break;
                default:
                  console.log('[v0] Fatal error, cannot recover');
                  showStatus('Impossible de lire ce flux', 'error');
                  if (hls) hls.destroy();
                  break;
              }
            }
          });

          video.addEventListener('waiting', () => {
            console.log('[v0] Buffering...');
            showStatus('Mise en mémoire tampon...', 'buffering');
          });

          video.addEventListener('playing', () => {
            console.log('[v0] Playing');
            showStatus('Lecture en cours', 'playing');
          });

          video.addEventListener('error', (e) => {
            console.error('[v0] Video element error:', e, video.error);
            showStatus('Erreur: ' + (video.error ? video.error.message : 'Inconnu'), 'error');
          });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          console.log('[v0] Using native HLS support');
          video.src = streamUrl;
          video.addEventListener('loadedmetadata', () => {
            showStatus('Lecture en cours', 'playing');
            video.play().catch(err => {
              console.error('[v0] Play error:', err);
              showStatus('Erreur de lecture', 'error');
            });
          });
          video.addEventListener('error', (e) => {
            console.error('[v0] Video error:', e, video.error);
            showStatus('Erreur de lecture', 'error');
          });
        } else {
          console.error('[v0] No HLS support available');
          showStatus('Format non supporté par ce navigateur', 'error');
        }

      } catch (error) {
        console.error('[v0] Player error:', error);
        showStatus('Erreur: ' + error.message, 'error');
      }
    }

    window.addEventListener('beforeunload', () => {
      if (hls) {
        hls.destroy();
      }
    });

    playStream();
  </script>
</body>
</html>
  `

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
