// Cross-device play over WebRTC, using Trystero for matchmaking.
// Players find each other through public Nostr relays (no server of our own),
// then all game data flows directly between devices, end-to-end encrypted.
// This module keeps the same interface main.js already uses.

const TRYSTERO_URL = 'https://esm.run/trystero@0.21.4'; // pinned version, Nostr strategy (default)

const CONFIG = {
  appId: 'mechana-clash-tappytoe-v1',
  rtcConfig: {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      // Free public TURN relay: helps phones on different networks (e.g. mobile data vs Wi-Fi).
      // If it ever stops working, replace with your own TURN credentials.
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
  },
};
const roomId = (code) => `room-${code}`;

let libPromise = null;
const loadLib = () => (libPromise ??= import(TRYSTERO_URL));

// The library loads on demand, so online play is always offered; load errors arrive via onError.
export const hasPeer = () => true;

export function roomCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
}

export function host(code, h) {
  let room = null, closed = false;
  const conns = new Map();

  (async () => {
    try {
      const { joinRoom } = await loadLib();
      if (closed) return;
      room = joinRoom(CONFIG, roomId(code));
      const [send, receive] = room.makeAction('m');

      room.onPeerJoin((id) => {
        const conn = {
          peer: id,
          open: true,
          send: (data) => { if (conn.open) send(data, id); },
          close: () => { conn.open = false; },
        };
        conns.set(id, conn);
        send({ t: 'host' }, id); // tell the newcomer "I'm the host of this room"
        h.onConn(conn);
      });

      room.onPeerLeave((id) => {
        const conn = conns.get(id);
        if (!conn) return;
        conn.open = false;
        conns.delete(id);
        h.onClose(conn);
      });

      receive((data, id) => {
        const conn = conns.get(id);
        if (conn && conn.open) h.onData(conn, data);
      });

      h.onOpen();
    } catch (e) {
      h.onError({ type: 'load', message: e?.message || String(e) });
    }
  })();

  return {
    wake() { /* Trystero reconnects to relays on its own */ },
    destroy() { closed = true; try { room?.leave(); } catch { /* ignore */ } },
  };
}

export function join(code, h) {
  let room = null, closed = false, hostId = null, timer = null;

  (async () => {
    try {
      const { joinRoom } = await loadLib();
      if (closed) return;
      room = joinRoom(CONFIG, roomId(code));
      const [send, receive] = room.makeAction('m');
      h.onStatus(`Looking for room ${code}…`);

      timer = setTimeout(() => {
        if (!hostId && !closed) h.onError({ type: 'peer-unavailable' });
      }, 30000);

      receive((data, id) => {
        if (!hostId && data && data.t === 'host') {
          hostId = id;
          clearTimeout(timer);
          const conn = {
            peer: id,
            get open() { return !closed && hostId === id; },
            send: (msg) => send(msg, id),
            close: () => { try { room?.leave(); } catch { /* ignore */ } },
          };
          h.onOpen(conn);
          return;
        }
        if (id === hostId) h.onData(data);
      });

      room.onPeerLeave((id) => {
        if (id === hostId) { hostId = null; h.onClose(); }
      });
    } catch (e) {
      h.onError({ type: 'load', message: e?.message || String(e) });
    }
  })();

  return {
    wake() { /* nothing needed */ },
    destroy() { closed = true; clearTimeout(timer); try { room?.leave(); } catch { /* ignore */ } },
  };
}