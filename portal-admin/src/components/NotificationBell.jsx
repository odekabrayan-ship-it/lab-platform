import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/api/notifications");
      setNotifications(res.data.data);
      setUnreadCount(res.data.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id, type) => {
    try {
      await API.patch(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (type === 'BROADCAST') {
        navigate("/professional-profile"); // This will trigger the notice board tab logic if we use URL params or just navigate
      }
    } catch (err) {
      console.error("Failed to mark as read");
    }
  };

  return (
    <div className="notification-bell-container">
      <button className="bell-button" onClick={() => setIsOpen(!isOpen)}>
        🔔
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown glass-panel animate-fade-in">
          <div className="dropdown-header">
            <h4>Notifications</h4>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-muted">No notifications yet.</p>
            ) : (
               notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`notification-item ${n.is_read ? 'read' : 'unread'} ${n.type === 'BROADCAST' ? 'broadcast-alert' : ''}`}
                  onClick={() => markAsRead(n.id, n.type)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {n.type === 'BROADCAST' && <span className="text-[9px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded uppercase">Authority Alert</span>}
                    <span className="time text-[10px] text-muted">{new Date(n.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="message text-sm leading-snug">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
