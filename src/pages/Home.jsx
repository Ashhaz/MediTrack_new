import { useState } from "react"
import { Link } from "react-router-dom"
import MedicineName from "../components/MedicineName"

const reminders = [
  {
    time: "08:00 PM",
    name: "Metformin",
    instruction: "500mg after dinner",
    status: "Due now",
    accent: "from-emerald-300 to-teal-500",
  },
  {
    time: "09:00 PM",
    name: "Omega-3",
    instruction: "1 softgel with water",
    status: "Scheduled",
    accent: "from-teal-300 to-cyan-500",
  },
]

function Home() {
  const [takenReminders, setTakenReminders] = useState([])
  const [confirmReminder, setConfirmReminder] = useState(null)

  const handleMarkTaken = (reminderName) => {
    if (takenReminders.includes(reminderName)) {
      setTakenReminders((current) =>
        current.filter((name) => name !== reminderName),
      )
      return
    }

    setConfirmReminder(reminderName)
  }

  const confirmTaken = () => {
    setTakenReminders((current) => [...current, confirmReminder])
    setConfirmReminder(null)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04110f] text-white">
      <style>
        {`
          @keyframes heroFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          @keyframes fadeUp {
            from {
              opacity: 0;
              transform: translateY(18px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_76%_20%,rgba(20,184,166,0.14),transparent_26%),radial-gradient(circle_at_47%_82%,rgba(6,78,59,0.18),transparent_36%),linear-gradient(135deg,#04110f_0%,#0b1f1d_48%,#020807_100%)] pointer-events-none" />
      <div className="absolute left-[13%] top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute right-[-7rem] top-20 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-11rem] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-emerald-700/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/35 to-transparent" />

      <header
        className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8 lg:px-12"
        style={{ animation: "fadeUp 650ms ease-out both" }}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-200/15 bg-emerald-400/10 shadow-lg shadow-emerald-950/25 backdrop-blur">
            <span className="h-3 w-3 rounded-full bg-emerald-200 shadow-[0_0_18px_rgba(110,231,183,0.5)]" />
          </span>
          <p className="bg-gradient-to-r from-white via-emerald-100 to-teal-300 bg-clip-text text-2xl font-black tracking-tight text-transparent">
            MediTrack
          </p>
        </div>
        <Link
          to="/dashboard"
          className="rounded-xl border border-emerald-200/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200/40 hover:bg-white/10 hover:shadow-emerald-500/15"
        >
          Login
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-8 sm:px-8 md:min-h-[calc(100vh-88px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,470px)] lg:gap-20 lg:px-12 lg:pt-0">
        <section
          className="min-w-0 max-w-2xl"
          style={{ animation: "fadeUp 750ms ease-out 120ms both" }}
        >
          <p className="mb-5 inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-lg shadow-slate-950/20 backdrop-blur">
            Smart medicine reminders
          </p>

          <h1 className="max-w-[12ch] text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-[4.35rem] lg:leading-[0.98]">
            Never miss a dose
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Track your medication schedule, stay consistent with daily routines,
            and keep adherence simple in one calm workspace.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/dashboard"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-emerald-950/35 ring-1 ring-emerald-200/20 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/20"
            >
              Start tracking
            </Link>
            <a
              href="#preview"
              className="rounded-xl border border-white/10 bg-white/[0.035] px-6 py-3.5 text-center text-sm font-bold text-emerald-100 shadow-lg shadow-slate-950/15 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200/30 hover:bg-emerald-400/10 hover:text-white"
            >
              View reminders
            </a>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-white/10 pt-5 text-sm text-slate-400">
            <p>
              <span className="block text-lg font-black text-white">24/7</span>
              reminders
            </p>
            <p>
              <span className="block text-lg font-black text-white">92%</span>
              adherence
            </p>
            <p>
              <span className="block text-lg font-black text-white">Clean</span>
              tracking
            </p>
          </div>
        </section>

        <section
          id="preview"
          className="relative mx-auto flex w-full max-w-[470px] items-center justify-center lg:justify-self-end"
          style={{ animation: "fadeUp 800ms ease-out 220ms both" }}
        >
          <div className="absolute inset-4 rounded-full bg-emerald-500/14 blur-3xl pointer-events-none" />
          <div className="absolute -right-6 top-8 h-28 w-28 rounded-full bg-teal-400/16 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 bottom-12 h-32 w-32 rounded-full bg-emerald-300/10 blur-2xl pointer-events-none" />
          <div className="absolute inset-x-6 bottom-0 h-16 rounded-full bg-black/50 blur-2xl pointer-events-none" />

          <div
            className="relative w-full rounded-[2rem] border border-emerald-200/15 bg-white/[0.065] p-4 shadow-2xl shadow-slate-950/35 backdrop-blur-xl ring-1 ring-white/5 transition duration-500 hover:border-emerald-200/30 hover:bg-white/[0.08] hover:shadow-emerald-500/15 sm:p-5"
            style={{ animation: "heroFloat 7s ease-in-out infinite" }}
          >
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />
            <div className="rounded-[1.35rem] border border-white/10 bg-[#071412]/90 p-4 shadow-2xl shadow-black/45">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-200">
                    MediTrack dashboard
                  </p>
                  <p className="mt-1 text-xl font-black">Medicine reminders</p>
                </div>
                <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100 shadow-lg shadow-emerald-950/30">
                  92% on track
                </div>
              </div>

              <div className="grid gap-3">
                {reminders.map((reminder) => {
                  const isTaken = takenReminders.includes(reminder.name)
                  const showConfirm = confirmReminder === reminder.name

                  return (
                    <article
                      key={reminder.name}
                      className="group relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-emerald-300/30 hover:bg-white/[0.09] hover:shadow-emerald-700/15"
                    >
                      <div
                        className={`mb-5 h-2 rounded-full bg-gradient-to-r transition-all duration-500 ${
                          isTaken
                            ? "from-emerald-300 to-green-500"
                            : reminder.accent
                        }`}
                      />

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-bold text-white flex min-w-0">
                            <MedicineName name={reminder.name} truncate={true} />
                          </div>
                          <p className="mt-1 text-sm text-slate-400">
                            {reminder.instruction}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition duration-300 ${
                            isTaken
                              ? "bg-emerald-400/15 text-emerald-100 shadow-lg shadow-emerald-950/20"
                              : "bg-teal-400/15 text-teal-100"
                          }`}
                        >
                          {isTaken ? "Taken" : reminder.status}
                        </span>
                      </div>

                      <p className="mt-5 text-3xl font-black text-white">
                        {reminder.time}
                      </p>

                      <button
                        onClick={() => handleMarkTaken(reminder.name)}
                        className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg transition duration-300 ${
                          isTaken
                            ? "bg-emerald-500/80 shadow-emerald-950/30 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-emerald-700/30"
                            : "bg-teal-600 shadow-teal-950/35 hover:-translate-y-0.5 hover:bg-teal-500 hover:shadow-teal-700/20"
                        }`}
                      >
                        {isTaken ? "Completed" : "Mark taken"}
                      </button>

                      {showConfirm && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl border border-emerald-200/20 bg-black/70 p-4 backdrop-blur-xl">
                          <div className="w-full rounded-2xl border border-white/10 bg-[#071412]/95 p-5 text-center shadow-2xl shadow-slate-950/50">
                            <p className="text-sm font-semibold text-emerald-200">
                              Confirm medicine
                            </p>
                            <MedicineName name={reminder.name} className="mt-2 text-xl font-black text-white" />
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              Did you take this medicine at {reminder.time}?
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                              <button
                                onClick={() => setConfirmReminder(null)}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-emerald-300/30 hover:bg-white/10"
                              >
                                No
                              </button>
                              <button
                                onClick={confirmTaken}
                                className="rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:from-emerald-300 hover:to-green-400"
                              >
                                Yes, taken
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}

                <div className="rounded-2xl border border-teal-300/15 bg-gradient-to-br from-emerald-500/12 to-teal-500/10 p-4 shadow-lg shadow-slate-950/20">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-300 shadow-[0_0_14px_rgba(45,212,191,0.45)]" />
                    <p className="text-sm font-bold text-emerald-100">
                      Adherence tip
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-slate-300">
                    Evening doses are easier to keep when reminders arrive before
                    dinner and stay visible until marked taken.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home
