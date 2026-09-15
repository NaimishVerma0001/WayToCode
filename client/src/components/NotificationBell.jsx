import React, { useEffect, useRef, useState } from "react";
import { FaBell, FaTimes, FaCheckCircle, FaTrophy, FaRobot, FaFire, FaClock } from "react-icons/fa";
import { useSocket } from "../context/SocketContext";
import "../styles/NotificationBell.css";

function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearNotifications } = useSocket();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleToggle = () => {
    setOpen(!open);
    // Optional: Auto-mark as read when opened
    // if (!open && unreadCount > 0) markAllRead(); 
  };

  const getIcon = (type) => {
    switch (type) {
      case "contest": return <FaClock />;
      case "achievement": return <FaTrophy />;
      case "streak": return <FaFire />;
      case "ai": return <FaRobot />;
      default: return <FaCheckCircle />;
    }
  };

  return (
    <div className="notification-wrapper" ref={wrapperRef}>
      <button className="notification-button" onClick={handleToggle}>
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={markAllRead}>Mark All Read</button>
            )}
          </div>

          <div className="notification-body">
            {notifications.length === 0 ? (
              <div className="notification-empty">No Notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? "" : "unread"}`}
                >
                  <div className="notification-icon">
                    {getIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <small>{notification.time}</small>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button className="notification-clear" onClick={clearNotifications}>
                <FaTimes /> Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;