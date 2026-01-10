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
    const streamUrl = decodeURIComponent('${encodeURIComponent(url)}');

    function showStatus(message, type = 'loading') {
      statusEl.textContent = message;
      statusEl.className = 'show ' + type;
      
      // Send status to parent window
      if (window.parent) {
        window.parent.postMessage({
          type: 'playerStatus',
          status: type,
          message: message
        }, '*');
      }
      
      if (type === 'playing') {
        setTimeout(() => {
          statusEl.classList.remove('show');
        }, 2000);
      }
    }

    async function resolveAndPlay() {
      try {
        showStatus('Résolution du flux...', 'loading');

        // Try to resolve the stream through our API
        const response = await fetch('/api/resolve-stream?url=' + encodeURIComponent(streamUrl));
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Stream resolution failed');
        }

        const finalUrl = data.streamUrl;
        console.log('[v0] Playing stream:', finalUrl);

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
          });

          hls.loadSource(finalUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            showStatus('Lecture en cours...', 'playing');
            video.play().catch(err => {
              console.error('[v0] Autoplay failed:', err);
              showStatus('Cliquez pour lire', 'buffering');
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('[v0] HLS error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  showStatus('Erreur réseau - Tentative de récupération...', 'error');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  showStatus('Erreur média - Tentative de récupération...', 'error');
                  hls.recoverMediaError();
                  break;
                default:
                  showStatus('Erreur fatale de lecture', 'error');
                  hls.destroy();
                  break;
              }
            }
          });

          video.addEventListener('waiting', () => {
            showStatus('Mise en mémoire tampon...', 'buffering');
          });

          video.addEventListener('playing', () => {
            showStatus('Lecture en cours...', 'playing');
          });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = finalUrl;
          video.addEventListener('loadedmetadata', () => {
            showStatus('Lecture en cours...', 'playing');
            video.play();
          });
        } else {
          showStatus('Votre navigateur ne supporte pas HLS', 'error');
        }

      } catch (error) {
        console.error('[v0] Player error:', error);
        showStatus('Impossible de charger le flux: ' + error.message, 'error');
      }
    }

    resolveAndPlay();
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
