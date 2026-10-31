// Cross-device play with WebRTC (PeerJS), with auto-reconnect for phones.
const PREFIX = 'mechana-clash-v1-';
const NET_ERRORS = new Set(['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected']);

export const hasPeer = () => typeof window !== 'undefined' && typeof window.Peer === 'function';

export function roomCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
}

export function host(code, h) {
  let peer = null, tries = 0, timer = null, closed = false, everOpened = false;

  const retry = () => {
    if (closed) return;
    clearTimeout(timer);
    const wait = Math.min(1500 * 2 ** tries++, 15000);
    h.onStatus(`📶 Connection lost, reconnecting in ${Math.round(wait / 1000)}s… (code stays ${code})`);
    timer = setTimeout(() => {
      if (closed) return;
      if (peer && !peer.destroyed && peer.disconnected) {
        try { peer.reconnect(); return; } catch { /* fall through and rebuild */ }
      }
      if (!peer || peer.destroyed) start();
    }, wait);
  };

  function start() {
    peer = new window.Peer(PREFIX + code, { debug: 1 });
    peer.on('open', () => { everOpened = true; tries = 0; h.onOpen(); });
    peer.on('disconnected', retry);
    peer.on('connection', (conn) => {
      conn.on('open', () => h.onConn(conn));
      conn.on('data', (d) => h.onData(conn, d));
      conn.on('close', () => h.onClose(conn));
    });
    peer.on('error', (e) => {
      // After a drop the server may briefly still hold our code, so wait and retry with the same code.
      if (e.type === 'unavailable-id' && everOpened) {
        try { peer.destroy(); } catch { /* ignore */ }
        retry();
        return;
      }
      if (NET_ERRORS.has(e.type)) { retry(); return; }
      h.onError(e);
    });
  }

  start();
  return {
    wake() { if (!closed && (!peer || peer.destroyed || peer.disconnected)) { tries = 0; retry(); } },
    destroy() { closed = true; clearTimeout(timer); try { peer?.destroy(); } catch { /* ignore */ } },
  };
}

export function join(code, h) {
  let peer = null, tries = 0, closed = false, connected = false, timer = null;
  const MAX = 4;

  const fail = (e) => {
    if (closed || connected) return;
    try { peer?.destroy(); } catch { /* ignore */ }
    if (++tries < MAX) {
      h.onStatus(`Looking for room ${code}… (try ${tries + 1}/${MAX})`);
      timer = setTimeout(start, 2500);
    } else {
      h.onError(e);
    }
  };

  function start() {
    if (closed) return;
    peer = new window.Peer({ debug: 1 });
    peer.on('error', fail);
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, { reliable: true });
      const t = setTimeout(() => fail({ type: 'timeout' }), 15000);
      conn.on('open', () => { connected = true; clearTimeout(t); h.onOpen(conn); });
      conn.on('data', h.onData);
      conn.on('close', () => { if (connected) h.onClose(); });
      conn.on('error', (e) => { if (!connected) { clearTimeout(t); fail(e); } });
    });
  }

  start();
  return {
    wake() { /* the data connection survives signalling drops */ },
    destroy() { closed = true; clearTimeout(timer); try { peer?.destroy(); } catch { /* ignore */ } },
  };
}