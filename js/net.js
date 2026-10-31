// Online play through Firebase Realtime Database (free tier).
// Every device talks to Google's servers over HTTPS/WebSockets, so it works on any network.
// The config is loaded lazily, so a broken config only affects online play, not the whole game.

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const GRACE_MS = 20000; // how long a dropped player/host may take to come back
let fbPromise = null;

async function loadConfig() {
  let mod;
  try {
    mod = await import('./firebase-config.js');
  } catch (e) {
    throw new Error(`js/firebase-config.js could not load (${e?.message || e}). It must start with "export const firebaseConfig = {" and contain no import lines.`);
  }
  const cfg = mod.firebaseConfig || mod.default;
  const url = cfg?.databaseURL || '';
  if (!url || url.includes('YOUR-')) {
    throw new Error('Online play is not set up yet: add your Firebase settings (including databaseURL) to js/firebase-config.js.');
  }
  return cfg;
}

function loadFirebase() {
  if (!fbPromise) {
    fbPromise = (async () => {
      const cfg = await loadConfig();
      const [appMod, dbMod] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-database.js`),
      ]);
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg);
      return { ...dbMod, db: dbMod.getDatabase(app) };
    })().catch((e) => { fbPromise = null; throw e; });
  }
  return fbPromise;
}

const errOf = (e) => ({ message: e?.message || String(e) });
const pack = (data) => JSON.stringify(data); // stored as a string so arrays/nulls survive intact
const unpack = (s) => { try { return JSON.parse(s); } catch { return null; } };

export const hasPeer = () => true;

export function roomCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
}

export function host(code, h) {
  let F = null, closed = false, owned = false;
  const offs = [], conns = new Map(), timers = new Map();
  const path = (p = '') => `rooms/${code}${p}`;

  (async () => {
    try {
      F = await loadFirebase();
      if (closed) return;
      const { db, ref, get, set, push, remove, onChildAdded, onChildRemoved, onValue, onDisconnect, serverTimestamp } = F;
      const hostRef = ref(db, path('/host'));

      if ((await get(hostRef)).exists()) { h.onError({ type: 'unavailable-id' }); return; }
      if (closed) return;
      await remove(ref(db, path())); // clear leftovers from an old game that used this code
      const register = async () => {
        await onDisconnect(hostRef).remove();
        await set(hostRef, { at: serverTimestamp() });
      };
      await register();
      owned = true;
      if (closed) { remove(ref(db, path())).catch(() => {}); return; }

      const ensureConn = (id) => {
        let conn = conns.get(id);
        if (conn) { clearTimeout(timers.get(id)); timers.delete(id); return conn; }
        conn = {
          peer: id,
          open: true,
          send: (data) => { if (conn.open) push(ref(db, path(`/toPeer/${id}`)), { d: pack(data) }).catch(() => {}); },
          close: () => { conn.open = false; remove(ref(db, path(`/peers/${id}`))).catch(() => {}); },
        };
        conns.set(id, conn);
        h.onConn(conn);
        return conn;
      };

      offs.push(onChildAdded(ref(db, path('/peers')), (snap) => { if (!closed) ensureConn(snap.key); }));

      offs.push(onChildRemoved(ref(db, path('/peers')), (snap) => {
        const id = snap.key, conn = conns.get(id);
        if (!conn || closed) return;
        clearTimeout(timers.get(id));
        timers.set(id, setTimeout(() => {
          timers.delete(id);
          if (!conns.has(id)) return;
          conn.open = false;
          conns.delete(id);
          remove(ref(db, path(`/toPeer/${id}`))).catch(() => {});
          h.onClose(conn);
        }, conn.open ? GRACE_MS : 0));
      }));

      offs.push(onChildAdded(ref(db, path('/toHost')), (snap) => {
        const m = snap.val() || {};
        remove(snap.ref).catch(() => {});
        if (closed || typeof m.from !== 'string') return;
        const conn = ensureConn(m.from);
        const data = unpack(m.d);
        if (conn.open && data) h.onData(conn, data);
      }));

      let wasOnline = true;
      offs.push(onValue(ref(db, '.info/connected'), (s) => {
        if (closed) return;
        if (s.val() === true) {
          if (!wasOnline) register().then(() => h.onOpen()).catch(() => {});
          wasOnline = true;
        } else {
          wasOnline = false;
          h.onStatus(`📶 Connection lost, reconnecting… (code stays ${code})`);
        }
      }));

      h.onOpen();
    } catch (e) {
      if (!closed) h.onError(errOf(e));
    }
  })();

  return {
    wake() { /* Firebase reconnects by itself */ },
    destroy() {
      if (closed) return;
      closed = true;
      offs.forEach((off) => off());
      timers.forEach((t) => clearTimeout(t));
      if (F && owned) F.remove(F.ref(F.db, path())).catch(() => {});
    },
  };
}

export function join(code, h) {
  let F = null, closed = false, myId = null, hostTimer = null;
  const offs = [];
  const path = (p = '') => `rooms/${code}${p}`;

  const api = {
    wake() { /* Firebase reconnects by itself */ },
    destroy() {
      if (closed) return;
      closed = true;
      clearTimeout(hostTimer);
      offs.forEach((off) => off());
      if (F && myId) {
        F.remove(F.ref(F.db, path(`/peers/${myId}`))).catch(() => {});
        F.remove(F.ref(F.db, path(`/toPeer/${myId}`))).catch(() => {});
      }
    },
  };

  (async () => {
    try {
      F = await loadFirebase();
      if (closed) return;
      const { db, ref, get, set, push, remove, onChildAdded, onValue, onDisconnect, serverTimestamp } = F;
      h.onStatus(`Looking for room ${code}…`);

      if (!(await get(ref(db, path('/host')))).exists()) { h.onError({ type: 'peer-unavailable' }); return; }
      if (closed) return;

      const meRef = push(ref(db, path('/peers')));
      myId = meRef.key;
      const register = async () => {
        await onDisconnect(meRef).remove();
        await set(meRef, { at: serverTimestamp() });
      };
      await register();
      if (closed) return;

      let wasOnline = true;
      offs.push(onValue(ref(db, '.info/connected'), (s) => {
        if (closed) return;
        if (s.val() === true) { if (!wasOnline) register().catch(() => {}); wasOnline = true; }
        else wasOnline = false;
      }));

      offs.push(onChildAdded(ref(db, path(`/toPeer/${myId}`)), (snap) => {
        const data = unpack(snap.val()?.d);
        remove(snap.ref).catch(() => {});
        if (data && !closed) h.onData(data);
      }));

      offs.push(onValue(ref(db, path('/host')), (s) => {
        if (closed) return;
        if (s.exists()) { clearTimeout(hostTimer); hostTimer = null; }
        else if (!hostTimer) hostTimer = setTimeout(() => { if (!closed) h.onClose(); }, GRACE_MS);
      }));

      const conn = {
        peer: 'host',
        get open() { return !closed; },
        send: (data) => { if (!closed) push(ref(db, path('/toHost')), { from: myId, d: pack(data) }).catch(() => {}); },
        close: () => api.destroy(),
      };
      h.onOpen(conn);
    } catch (e) {
      if (!closed) h.onError(errOf(e));
    }
  })();

  return api;
}