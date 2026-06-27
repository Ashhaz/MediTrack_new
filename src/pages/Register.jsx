import { useState } from "react"
import { Link } from "react-router-dom"
import { Eye, EyeOff, Lock, Mail, User, Loader2 } from "lucide-react"
import { supabase } from '../lib/supabase'; // Import Supabase client


function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false)

  const isPasswordMismatch = confirmPassword !== "" && password !== confirmPassword
  const canSubmit = fullName.trim() && email.trim() && password.length >= 6 && !isPasswordMismatch && !isLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(""); // Clear previous messages
    setErrorMessage("");

    // Client-side validation
    if (!fullName.trim()) {
      setErrorMessage("Full Name is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!canSubmit) return; // Final check after specific error messages are set

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data.user) {
        setSuccessMessage("Registration successful! Please check your email to confirm your account.");
        setFullName(""); setEmail(""); setPassword(""); setConfirmPassword("");
      } else if (data.session === null && data.user === null) {
        setSuccessMessage("Registration successful! Please check your email to confirm your account.");
        setFullName(""); setEmail(""); setPassword(""); setConfirmPassword("");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred during registration.");
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04110f] px-5 py-8 text-white sm:px-8">
      {/* Background patterns matching Login/Home */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_76%_20%,rgba(20,184,166,0.14),transparent_26%),linear-gradient(135deg,#04110f_0%,#0b1f1d_48%,#020807_100%)] pointer-events-none" />
      <div className="absolute left-[12%] top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute right-[-7rem] top-16 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/35 to-transparent" />

      <main className="relative z-10 grid min-h-[calc(100vh-4rem)] place-items-center">
        <section 
          className="w-full max-w-md rounded-[2rem] border border-emerald-200/15 bg-white/[0.065] p-6 shadow-2xl shadow-slate-950/35 backdrop-blur-xl ring-1 ring-white/5 sm:p-8"
          style={{ animation: "modalIn 220ms ease-out both" }}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200/15 bg-emerald-400/10 shadow-lg shadow-emerald-950/25">
              <span className="h-4 w-4 rounded-full bg-emerald-200 shadow-[0_0_20px_rgba(110,231,183,0.55)]" />
            </div>
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-teal-300 bg-clip-text text-3xl font-black tracking-tight text-transparent">
              MediTrack
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Create your account to start tracking.
            </p>
          </div>

          {successMessage && (
            <div className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-xl p-3 text-sm mb-4">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-xl p-3 text-sm mb-4">
              {errorMessage}
            </div>
          )}

          <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
            {/* noValidate added to prevent browser's default validation popups */}
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Full Name
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-emerald-300/40 focus-within:bg-emerald-400/10">
                <User className="h-5 w-5 text-emerald-200/80" />
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="min-w-0 flex-1 bg-transparent font-medium text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </label>

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
                  placeholder="Min. 6 characters"
                  className="min-w-0 flex-1 bg-transparent font-medium text-white outline-none placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Confirm Password
              <div className={`flex items-center gap-3 rounded-xl border ${isPasswordMismatch ? 'border-rose-500/50' : 'border-white/10'} bg-black/30 px-4 py-3 transition focus-within:border-emerald-300/40 focus-within:bg-emerald-400/10`}>
                <Lock className="h-5 w-5 text-emerald-200/80" />
                <input
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="min-w-0 flex-1 bg-transparent font-medium text-white outline-none placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isPasswordMismatch && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Passwords do not match
                </span>
              )}
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-950/35 ring-1 ring-emerald-200/20 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/20 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-emerald-300 transition hover:text-emerald-200">
              Login
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}

export default Register