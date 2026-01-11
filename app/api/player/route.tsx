import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get("channelId")
  const skipAd = searchParams.get("skipAd") === "true"

  console.log("[v0] Player route called with channelId:", channelId, "skipAd:", skipAd)

  if (!channelId) {
    console.error("[v0] Player route: Missing channelId parameter")
    return new Response("Missing channelId parameter", { status: 400 })
  }

  let streamUrl = ""
  try {
    const streamResponse = await fetch(
      `${request.nextUrl.origin}/api/stream?channelId=${encodeURIComponent(channelId)}`,
    )
    if (streamResponse.ok) {
      const streamData = await streamResponse.json()
      streamUrl = streamData.url || ""
      console.log("[v0] Stream URL fetched:", streamUrl)
    } else {
      console.error("[v0] Failed to fetch stream URL:", streamResponse.status)
      return new Response("Stream not available", { status: 404 })
    }
  } catch (error) {
    console.error("[v0] Error fetching stream:", error)
    return new Response("Error fetching stream", { status: 500 })
  }

  if (!streamUrl) {
    return new Response("No stream URL available", { status: 404 })
  }

  console.log("[v0] Player route: Generating HTML for stream")

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
    const streamUrl = ${JSON.stringify(streamUrl)};
    let hls = null;

    console.log('[v0] Player iframe loaded');
    console.log('[v0] Stream URL:', streamUrl);
    console.log('[v0] HLS.js available:', typeof Hls !== 'undefined');
    console.log('[v0] HLS.js supported:', Hls.isSupported());

    function showStatus(message, type = 'loading') {
      console.log('[v0] Status update:', type, message);
      statusEl.textContent = message;
      statusEl.className = 'show ' + type;
      
      try {
        if (window.parent && window.parent !== window) {
          console.log('[v0] Sending status to parent:', type, message);
          window.parent.postMessage({
            type: 'playerStatus',
            status: type,
            message: message
          }, '*');
        }
      } catch (e) {
        console.error('[v0] Could not send message to parent:', e);
      }
      
      if (type === 'playing') {
        setTimeout(() => {
          statusEl.classList.remove('show');
        }, 2000);
      }
    }

    async function playStream() {
      try {
        console.log('[v0] playStream() called');
        showStatus('Chargement du flux...', 'loading');

        const isHLS = streamUrl.includes('m3u8') || streamUrl.includes('.m3u');
        console.log('[v0] Is HLS stream:', isHLS);

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

          console.log('[v0] HLS instance created');
          hls.loadSource(streamUrl);
          console.log('[v0] Source loaded');
          hls.attachMedia(video);
          console.log('[v0] Media attached');

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('[v0] MANIFEST_PARSED event - starting playback');
            showStatus('Démarrage...', 'buffering');
            video.play()
              .then(() => console.log('[v0] Video.play() succeeded'))
              .catch(err => {
                console.error('[v0] Autoplay failed:', err);
                showStatus('Cliquez pour lire', 'buffering');
              });
          });

          hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
            console.log('[v0] Fragment loaded:', data.frag.sn);
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('[v0] HLS error event:', data.type, data.details);
            console.error('[v0] HLS error data:', data);
            
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('[v0] Fatal network error, attempting recovery...');
                  showStatus('Erreur réseau - Tentative de récupération...', 'buffering');
                  setTimeout(() => {
                    if (hls) {
                      console.log('[v0] Retrying load...');
                      hls.startLoad();
                    }
                  }, 1000);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('[v0] Fatal media error, attempting recovery...');
                  showStatus('Erreur média - Tentative de récupération...', 'buffering');
                  if (hls) {
                    hls.recoverMediaError();
                  }
                  break;
                default:
                  console.error('[v0] Fatal error, cannot recover');
                  showStatus('Impossible de lire ce flux', 'error');
                  if (hls) hls.destroy();
                  break;
              }
            }
          });

          video.addEventListener('waiting', () => {
            console.log('[v0] Video waiting (buffering)');
            showStatus('Mise en mémoire tampon...', 'buffering');
          });

          video.addEventListener('playing', () => {
            console.log('[v0] Video playing');
            showStatus('Lecture en cours', 'playing');
          });

          video.addEventListener('error', (e) => {
            console.error('[v0] Video element error:', e);
            console.error('[v0] Video.error:', video.error);
            showStatus('Erreur: ' + (video.error ? video.error.message : 'Inconnu'), 'error');
          });

          video.addEventListener('loadstart', () => console.log('[v0] Video loadstart'));
          video.addEventListener('loadedmetadata', () => console.log('[v0] Video loadedmetadata'));
          video.addEventListener('canplay', () => console.log('[v0] Video canplay'));

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          console.log('[v0] Using native HLS support');
          video.src = streamUrl;
          video.addEventListener('loadedmetadata', () => {
            console.log('[v0] Native HLS metadata loaded');
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
        console.error('[v0] Player error in playStream():', error);
        showStatus('Erreur: ' + error.message, 'error');
      }
    }

    window.addEventListener('beforeunload', () => {
      console.log('[v0] Player unloading, destroying HLS');
      if (hls) {
        hls.destroy();
      }
    });

    console.log('[v0] Starting playback initialization...');
    playStream();
  </script>
</body>
</html>
  `

  console.log("[v0] Player route: Returning HTML response")

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
