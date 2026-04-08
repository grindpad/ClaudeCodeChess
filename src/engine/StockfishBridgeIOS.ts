/**
 * StockfishBridgeIOS — WebView-based implementation of StockfishBridge for iOS.
 *
 * Stockfish runs as a Web Worker inside a hidden react-native-webview instance
 * (zero width/height, absolute position). The WebView page is provided by
 * stockfishWebviewHtml.ts and is loaded with baseUrl pointing at the Metro
 * dev server so that the Worker's script URL resolves correctly.
 *
 * Communication:
 *   RN → engine : injectJavaScript calls handleCommand() in the WebView page
 *   engine → RN : window.ReactNativeWebView.postMessage → onMessage prop → outputHandler
 *
 * The WebView instance is mounted once by the root layout (_layout.tsx) via
 * getWebViewProps(). This bridge is a singleton (see StockfishBridgeFactory)
 * so the root layout and EngineController share the same webViewRef.
 *
 * launch() resolves immediately; actual engine readiness is established by the
 * UCI handshake (uci + isready → readyok) that EngineController sends after launch.
 */
import type { StockfishBridge } from './StockfishBridge';
import { STOCKFISH_WEBVIEW_HTML } from './stockfishWebviewHtml';

export class StockfishBridgeIOS implements StockfishBridge {
  private outputHandler: ((line: string) => void) | null = null;

  /**
   * Plain object ref — avoids importing React here.
   * The root layout assigns webViewRef to the mounted WebView instance via the
   * ref prop returned from getWebViewProps().
   */
  public readonly webViewRef: { current: any } = { current: null };

  /**
   * Returns the props object to spread onto a <WebView> element in the root
   * layout. This wires the ref, source HTML, and message handler.
   */
  getWebViewProps() {
    return {
      ref: this.webViewRef,
      source: { html: STOCKFISH_WEBVIEW_HTML, baseUrl: 'http://localhost:8081' },
      style: { width: 0, height: 0, position: 'absolute' as const },
      originWhitelist: ['*'],
      javaScriptEnabled: true,
      onMessage: (event: any) => {
        const line: string = event.nativeEvent.data;
        if (line.startsWith('__error__:')) {
          console.error('[StockfishBridgeIOS] engine error:', line.slice(10));
          return;
        }
        this.outputHandler?.(line);
      },
    };
  }

  /** StockfishBridge.launch — resolves immediately; UCI handshake drives readiness. */
  async launch(): Promise<void> {
    // The WebView is already mounted by the root layout before EngineController
    // calls initialize(). Nothing to do here — the worker inside the WebView
    // starts automatically when the page loads (see stockfishWebviewHtml.ts).
    return Promise.resolve();
  }

  /** StockfishBridge.sendCommand — injects a handleCommand() call into the WebView. */
  sendCommand(cmd: string): void {
    const js = `(function(){ if(typeof handleCommand === 'function'){ handleCommand(${JSON.stringify(cmd)}); } })(); true;`;
    this.webViewRef.current?.injectJavaScript(js);
  }

  /** StockfishBridge.onOutput — registers the single UCI output line handler. */
  onOutput(handler: (line: string) => void): void {
    this.outputHandler = handler;
  }

  /** StockfishBridge.shutdown — sends 'quit' to the engine and clears state. */
  shutdown(): void {
    this.sendCommand('quit');
    this.webViewRef.current = null;
    this.outputHandler = null;
  }
}
