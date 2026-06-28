import { io, type Socket } from "socket.io-client";

const SERVER_ORIGIN = (() => {
  const base = import.meta.env.VITE_API_BASE as string | undefined;
  if (!base) return "http://localhost:3001";
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://localhost:3001";
  }
})();

type PublicSocket = Socket;
type PrivateSocket = Socket;

let publicSocket: PublicSocket | null = null;
let privateSocket: PrivateSocket | null = null;
let privateToken: string | null = null;
let privateRefcount = 0;

export function getPublicSocket(): PublicSocket {
  if (!publicSocket) {
    publicSocket = io(`${SERVER_ORIGIN}/public`, {
      transports: ["websocket", "polling"],
    });
  }
  return publicSocket;
}

export function acquirePrivateSocket(token: string): PrivateSocket {
  if (privateSocket && privateToken === token) {
    privateRefcount += 1;
    return privateSocket;
  }
  if (privateSocket) {
    privateSocket.disconnect();
    privateSocket = null;
    privateRefcount = 0;
  }
  privateToken = token;
  privateSocket = io(SERVER_ORIGIN, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  privateRefcount = 1;
  return privateSocket;
}

export function releasePrivateSocket(): void {
  if (!privateSocket) return;
  privateRefcount = Math.max(0, privateRefcount - 1);
  if (privateRefcount === 0) {
    privateSocket.disconnect();
    privateSocket = null;
    privateToken = null;
  }
}
