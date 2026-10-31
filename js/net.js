// Cross-device play with WebRTC (PeerJS). The host's browser runs the rules, and the other devices send actions.
const PREFIX = 'mechana-clash-v1-';
export const hasPeer = () => typeof window !== 'undefined' && typeof window.Peer === 'function';
export function roomCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
}
export function host(code, { onOpen, onConn, onData, onClose, onError }) {
  const peer = new window.Peer(PREFIX + code);
  peer.on('open', () => onOpen());
  peer.on('error', (e) => onError(e));
  peer.on('connection', (conn) => {
    conn.on('open', () => onConn(conn));
    conn.on('data', (d) => onData(conn, d));
    conn.on('close', () => onClose(conn));
  });
  return peer;
}
export function join(code, { onOpen, onData, onClose, onError }) {
  const peer = new window.Peer();
  peer.on('error', (e) => onError(e));
  peer.on('open', () => {
    const conn = peer.connect(PREFIX + code, { reliable: true });
    conn.on('open', () => onOpen(conn));
    conn.on('data', (d) => onData(d));
    conn.on('close', () => onClose());
    conn.on('error', (e) => onError(e));
  });
  return peer;
}