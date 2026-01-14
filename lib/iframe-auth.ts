export interface IframeAuthMessage {
  type: "auth-request" | "auth-response"
  role?: "user" | "vip" | "admin"
  userId?: string
  email?: string
  token?: string
}

export function setupIframeAuth(onAuthReceived: (authData: IframeAuthMessage) => void) {
  if (typeof window === "undefined") return

  // Check if we're in an iframe
  const isInIframe = window.self !== window.top

  if (isInIframe) {
    console.log("[v0] Running in iframe, requesting auth from parent")

    // Listen for auth messages from parent window
    window.addEventListener("message", (event) => {
      // Verify origin (adjust this to match your parent domain)
      if (event.data?.type === "auth-response") {
        console.log("[v0] Received auth from parent:", event.data)
        onAuthReceived(event.data)
      }
    })

    // Request auth from parent
    window.parent.postMessage({ type: "auth-request" }, "*")
  }
}

export function sendAuthToIframe(iframe: HTMLIFrameElement, authData: IframeAuthMessage) {
  if (!iframe || !iframe.contentWindow) return

  console.log("[v0] Sending auth to iframe:", authData)
  iframe.contentWindow.postMessage(
    {
      type: "auth-response",
      ...authData,
    },
    "*",
  )
}
