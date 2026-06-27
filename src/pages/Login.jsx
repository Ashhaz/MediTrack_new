import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { supabase } from '../lib/supabase'; // Import Supabase client


function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();



  const handleLogin = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      navigate("/dashboard");
    }
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04110f] px-5 py-8 text-white sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_76%_20%,rgba(20,184,166,0.14),transparent_26%),linear-gradient(135deg,#04110f_0%,#0b1f1d_48%,#020807_100%)] pointer-events-none" />
      <div className="absolute left-[12%] top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute right-[-7rem] top-16 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/35 to-transparent" />

      <main className="relative z-10 grid min-h-[calc(100vh-4rem)] place-items-center">
        <section className="w-full max-w-md rounded-[2rem] border border-emerald-200/15 bg-white/[0.065] p-6 shadow-2xl shadow-slate-950/35 backdrop-blur-xl ring-1 ring-white/5 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200/15 bg-emerald-400/10 shadow-lg shadow-emerald-950/25">
              <span className="h-4 w-4 rounded-full bg-emerald-200 shadow-[0_0_20px_rgba(110,231,183,0.55)]" />
            </div>
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-teal-300 bg-clip-text text-3xl font-black tracking-tight text-transparent">
              MediTrack
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to continue managing your medication schedule.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-xl p-3 text-sm mb-4">
              {errorMessage}
            </div>
          )}

          <form className="grid gap-5" onSubmit={handleLogin}>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Email
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-emerald-300/40 focus-within:bg-emerald-400/10">
                <Mail className="h-5 w-5 text-emerald-200/80" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 bg-transparent font-medium text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Password
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-emerald-300/40 focus-within:bg-emerald-400/10">
                <Lock className="h-5 w-5 text-emerald-200/80" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="min-w-0 flex-1 bg-transparent font-medium text-white outline-none placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-950/35 ring-1 ring-emerald-200/20 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            New to MediTrack?{" "}
            <Link to="/register" className="font-bold text-emerald-300 transition hover:text-emerald-200">
              Create an account
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}

export default Login
