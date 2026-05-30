import { Link, useLocation } from "react-router-dom"

const navItems = [
  {
    label: "Overview",
    path: "/dashboard",
    icon: (
      <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-11h6V4h-6v5Z" />
    ),
  },
  {
    label: "Medicines",
    path: "/medicines",
    icon: (
      <path d="M7.5 21a4.5 4.5 0 0 1-3.18-7.68l9-9a4.5 4.5 0 0 1 6.36 6.36l-9 9A4.49 4.49 0 0 1 7.5 21Zm2.47-12.03 5.06 5.06" />
    ),
  },
  {
    label: "Reports",
    path: "/reports",
    icon: <path d="M5 20V4h14v16H5Zm4-4h6M9 12h6M9 8h3" />,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: (
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Zm0-13 1.4 2.3 2.7.6.3 2.8 1.8 2.1-1.8 2.1-.3 2.8-2.7.6L12 22l-1.4-2.3-2.7-.6-.3-2.8-1.8-2.1 1.8-2.1.3-2.8 2.7-.6L12 2.5Z" />
    ),
  },
]

function AppShell({ children }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#04110f] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_8%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.13),transparent_26%),radial-gradient(circle_at_52%_86%,rgba(6,95,70,0.16),transparent_34%),linear-gradient(135deg,#04110f_0%,#0b1f1d_48%,#020807_100%)] pointer-events-none" />
      <div className="fixed left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="fixed right-[-8rem] top-32 -z-10 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10rem] left-72 -z-10 h-96 w-96 rounded-full bg-emerald-700/10 blur-3xl pointer-events-none" />

      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-white/[0.045] px-5 py-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-200/15 bg-emerald-400/10 shadow-lg shadow-emerald-950/25">
              <span className="h-3 w-3 rounded-full bg-emerald-200 shadow-[0_0_18px_rgba(110,231,183,0.5)]" />
            </span>
            <div>
              <p className="bg-gradient-to-r from-white via-emerald-100 to-teal-300 bg-clip-text text-2xl font-black text-transparent">
                MediTrack
              </p>
            <p className="mt-1 text-sm text-slate-400">Medication dashboard</p>
            </div>
          </div>

          <nav className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.path || pathname.startsWith(`${item.path}/`)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-emerald-400/10 hover:shadow-lg hover:shadow-slate-950/20 ${
                    isActive
                      ? "border-emerald-300/40 bg-emerald-400/15 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-300/25"
                      : "border-white/10 bg-white/[0.03] text-slate-300"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-5 w-5 fill-none stroke-current stroke-2 transition duration-300 group-hover:scale-110 ${
                      isActive ? "text-emerald-100" : "text-teal-300/75"
                    }`}
                  >
                    {item.icon}
                  </svg>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 px-5 py-6 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}

export default AppShell
