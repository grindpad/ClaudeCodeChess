/**
 * stockfishWebviewHtml — HTML page loaded into the hidden WebView on iOS.
 *
 * The page creates a Web Worker from /stockfish-18-lite-single.js (resolved
 * against the Metro dev server via the WebView's baseUrl). It proxies messages
 * bidirectionally between the worker and React Native:
 *
 *   RN → injectJavaScript('handleCommand("uci")') → worker.postMessage
 *   worker.onmessage → window.ReactNativeWebView.postMessage → RN onMessage
 *
 * Error lines are prefixed with '__error__:' so the bridge can surface them
 * to the console without forwarding them to the UCI parser.
 */
export const STOCKFISH_WEBVIEW_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
  var worker = null;

  function initWorker() {
    worker = new Worker('/stockfish-18-lite-single.js');
    worker.onmessage = function(e) {
      var line = typeof e.data === 'string' ? e.data : String(e.data);
      if (line) window.ReactNativeWebView.postMessage(line);
    };
    worker.onerror = function(e) {
      window.ReactNativeWebView.postMessage('__error__:' + (e.message || 'unknown error'));
    };
  }

  function handleCommand(cmd) {
    if (!worker) initWorker();
    worker.postMessage(cmd);
  }

  // Android fires 'message' on window; iOS fires 'message' on document.
  window.addEventListener('message', function(e) {
    handleCommand(e.data);
  });
  document.addEventListener('message', function(e) {
    handleCommand(e.data);
  });

  // Auto-init the worker as soon as the page loads.
  initWorker();
</script>
</body>
</html>`;
