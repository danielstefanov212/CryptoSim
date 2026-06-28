import { useCallback, useEffect, useState } from "react";

import { useOptionalUser } from "../contexts/user-context";
import {
  acquirePrivateSocket,
  releasePrivateSocket,
} from "../services/socket-service";
import { UserStorage } from "../services/user-storage";

import type { AlertTriggeredPayload } from "../lib/alerts";

const userStorage = new UserStorage();

export type BrowserNotificationPermission =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export interface NotificationPermissionApi {
  permission: BrowserNotificationPermission;
  requestPermission: () => Promise<BrowserNotificationPermission>;
}

function currentPermission(): BrowserNotificationPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as BrowserNotificationPermission;
}

function showFallbackToast(message: string): void {
  const div = document.createElement("div");
  div.textContent = message;
  div.style.cssText =
    "position:fixed;right:1rem;bottom:1rem;background:#222;color:#fff;padding:.75rem 1rem;border-radius:.5rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.3)";
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 6000);
}

function showNativeOrFallback(title: string, body: string, tag?: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    showFallbackToast(`${title}: ${body}`);
    return;
  }
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: "/favicon.png",
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    n.onerror = (err) => {
      console.warn("[notifications] native notification reported error:", err);
      showFallbackToast(`${title}: ${body}`);
    };
  } catch (err) {
    console.warn("[notifications] failed to create native notification:", err);
    showFallbackToast(`${title}: ${body}`);
  }
}

export function useNotificationPermission(): NotificationPermissionApi {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(
    currentPermission,
  );

  useEffect(() => {
    setPermission(currentPermission());
    if (typeof Notification === "undefined") return;
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let cancelled = false;
    let permStatus: PermissionStatus | null = null;
    const onChange = () => {
      if (!cancelled) setPermission(currentPermission());
    };
    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        permStatus = status;
        status.addEventListener("change", onChange);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      permStatus?.removeEventListener("change", onChange);
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported" as const;
    if (Notification.permission === "granted") {
      setPermission("granted");
      return "granted" as const;
    }
    if (Notification.permission === "denied") {
      setPermission("denied");
      return "denied" as const;
    }
    const result = (await Notification.requestPermission()) as BrowserNotificationPermission;
    setPermission(result);
    return result;
  }, []);

  return { permission, requestPermission };
}

/**
 * Mount once at the top of the authenticated tree. Wires the private Socket.IO
 * `alert:triggered` event to native OS notifications (or an in-page toast if
 * the user hasn't granted permission).
 */
export function useBrowserNotifications(): void {
  const user = useOptionalUser();
  useEffect(() => {
    if (!user) return;
    const token = userStorage.token;
    if (!token) return;

    const sock = acquirePrivateSocket(token);
    const onTriggered = (payload: AlertTriggeredPayload) => {
      const op = payload.direction === "ABOVE" ? "≥" : "≤";
      showNativeOrFallback(
        `Price alert: ${payload.symbol}`,
        `${payload.symbol} ${op} ${payload.targetPrice}`,
        `alert-${payload.id}`,
      );
    };
    sock.on("alert:triggered", onTriggered);
    return () => {
      sock.off("alert:triggered", onTriggered);
      releasePrivateSocket();
    };
  }, [user]);
}
