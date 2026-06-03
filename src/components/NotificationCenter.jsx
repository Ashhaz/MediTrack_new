import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import {
  clearNotifications,
  getNotifications,
  markAllRead,
  NOTIFICATIONS_UPDATED_EVENT,
} from "../utils/notificationUtils.js"

const formatRelativeTime = (timestamp) => {
  const elapsedSeconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))

  if (elapsedSeconds < 60) return "Just now"

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}h ago`

  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedDays < 7) return `${elapsedDays}d ago`

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(getNotifications)
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 16 })
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  useEffect(() => {
    const refreshNotifications = () => setNotifications(getNotifications())

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications)
    window.addEventListener("storage", refreshNotifications)

    return () => {
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        refreshNotifications,
      )
      window.removeEventListener("storage", refreshNotifications)
    }
  }, [])

  useEffect(() => {
    const handlePointerDown = (event) => {
      const clickedPanel = panelRef.current?.contains(event.target)
      const clickedButton = buttonRef.current?.contains(event.target)

      if (!clickedPanel && !clickedButton) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const updatePanelPosition = () => {
      const bellRect = buttonRef.current?.getBoundingClientRect()
      if (!bellRect) return

      const viewportPadding = 16
      const panelWidth = Math.min(380, window.innerWidth - viewportPadding * 2)
      const right = Math.max(
        viewportPadding,
        window.innerWidth - bellRect.right,
      )
      const maxRight = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding)

      setPanelPosition({
        top: bellRect.bottom + 8,
        right: Math.min(right, maxRight),
      })
    }

    updatePanelPosition()
    window.addEventListener("resize", updatePanelPosition)
    window.addEventListener("scroll", updatePanelPosition, true)

    return () => {
      window.removeEventListener("resize", updatePanelPosition)
      window.removeEventListener("scroll", updatePanelPosition, true)
    }
  }, [isOpen])

  const handleMarkAllRead = () => {
    setNotifications(markAllRead())
  }

  const handleClearAll = () => {
    clearNotifications()
    setNotifications([])
  }

  const dropdown = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#061512]/95 shadow-2xl shadow-slate-950/70 backdrop-blur-xl"
          style={{
            animation: "notificationMenuIn 160ms ease-out both",
            maxHeight: "500px",
            overflowY: "auto",
            position: "fixed",
            right: `${panelPosition.right}px`,
            top: `${panelPosition.top}px`,
            width: "min(380px, calc(100vw - 32px))",
            zIndex: 99999,
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-black text-white">Notifications</p>
              <p className="text-xs text-slate-400">
                {unreadCount} unread
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Mark all read"
                onClick={handleMarkAllRead}
                disabled={notifications.length === 0}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck size={16} />
              </button>
              <button
                type="button"
                title="Clear all"
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div>
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-bold text-white">All clear</p>
                <p className="mt-1 text-xs text-slate-400">
                  Medication alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      notification.read
                        ? "bg-white/15"
                        : "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.45)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-bold text-white">
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-slate-500">
                        {formatRelativeTime(notification.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Stored locally on this device
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <style>
        {`
          @keyframes notificationMenuIn {
            from {
              opacity: 0;
              transform: translateY(-8px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
      <button
        ref={buttonRef}
        type="button"
        title="Notifications"
        onClick={() => setIsOpen((current) => !current)}
        className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/25 text-emerald-100 shadow-lg shadow-slate-950/10 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-emerald-400/10"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border border-[#04110f] bg-amber-400 px-1.5 text-[10px] font-black text-black shadow-lg shadow-amber-950/30">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
    </>
  )
}

export default NotificationCenter
