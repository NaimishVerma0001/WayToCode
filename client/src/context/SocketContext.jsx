// client/src/context/SocketContext.jsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";

import { API_BASE_URL, getStoredToken } from "../services/apiClient";

const NOTIFICATION_STORAGE_KEY = "way2code_notifications";

// Bound the history so localStorage cannot grow without limit.
const MAX_STORED_NOTIFICATIONS = 50;

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

/**
 * The socket server runs alongside the API, so its origin is derived from the
 * API base URL. A relative base (`/api`) means same-origin, which is correct
 * both behind the Vite dev proxy and for a single-origin deployment.
 */
const resolveSocketUrl = () => {
  if (!API_BASE_URL || API_BASE_URL.startsWith("/")) {
    return undefined;
  }

  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return undefined;
  }
};

const readStoredNotifications = () => {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Private browsing, blocked storage or corrupt JSON must not break boot.
    return [];
  }
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState(readStoredNotifications);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);
  const token = getStoredToken();

  useEffect(() => {
    try {
      localStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(notifications.slice(0, MAX_STORED_NOTIFICATIONS))
      );
    } catch {
      /* storage is unavailable; in-memory state still works */
    }
  }, [notifications]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }

      return undefined;
    }

    const socketInstance = io(resolveSocketUrl(), {
      auth: { token },
      // Polling first guarantees the handshake succeeds before upgrading.
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000
    });

    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));

    socketInstance.on("connect_error", (error) => {
      setIsConnected(false);

      // An expired token is expected after a long idle period; the next API
      // call refreshes it, so this must stay silent rather than alarming.
      if (import.meta.env.DEV) {
        console.warn("Realtime connection unavailable:", error.message);
      }
    });

    socketInstance.on("new_notification", (notification) => {
      const incoming = {
        id: notification.id || `${Date.now()}`,
        type: notification.type || "contest",
        title: notification.title,
        message: notification.message,
        time: new Date(notification.createdAt || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }),
        read: false
      };

      toast.info(`⏰ ${incoming.title}\n${incoming.message}`, {
        position: "top-right",
        autoClose: 8000,
        toastId: `notification-${incoming.id}`
      });

      setNotifications((previous) =>
        [incoming, ...previous].slice(0, MAX_STORED_NOTIFICATIONS)
      );
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const markAllRead = useCallback(() => {
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      notifications,
      unreadCount,
      markAllRead,
      clearNotifications
    }),
    [socket, isConnected, notifications, unreadCount, markAllRead, clearNotifications]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
