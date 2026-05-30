function Navbar() {
  return (
    <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-8 lg:px-12">
      <h1 className="bg-gradient-to-r from-white via-emerald-100 to-teal-300 bg-clip-text text-2xl font-black tracking-tight text-transparent">
        MediTrack
      </h1>

      <button className="rounded-lg border border-emerald-200/15 bg-white/5 px-4 py-2 font-medium text-white shadow-lg shadow-slate-950/20 backdrop-blur transition hover:border-emerald-200/40 hover:bg-white/10">
        Login
      </button>
    </nav>
  )
}

export default Navbar
