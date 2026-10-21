import { io } from 'socket.io-client';
import { SOCKET_URL } from './api';
import { useAuthStore } from '../store/useAuthStore';

let socket = null;

/** Shared socket. The auth callback always sends the *current* token, even on reconnects. */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: useAuthStore.getState().token }),
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

/** Call after login/logout so the server re-reads who we are. */
export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Run `fn` on connect AND immediately if already connected (re-joins rooms after reconnects). */
export function onConnected(s, fn) {
  s.on('connect', fn);
  if (s.connected) fn();
  return () => s.off('connect', fn);
}
