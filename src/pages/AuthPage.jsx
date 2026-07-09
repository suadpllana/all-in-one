import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Sign in / sign up. Only reachable when Supabase is configured; in local mode
// we redirect away since there is no account to create.
export default function AuthPage() {
  const { signIn, signUp, mode, user } = useAuth()
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (mode === 'local') return <Navigate to="/movies" replace />
  if (user) return <Navigate to="/stats" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = isSignUp
      ? await signUp(form.email, form.password, form.name)
      : await signIn(form.email, form.password)
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/stats')
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h1 className="text-xl font-black">{isSignUp ? 'Create your Vault' : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {isSignUp ? 'Sign up to sync your library across devices.' : 'Sign in to your account.'}
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          {isSignUp && (
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          )}
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            required
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            required
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Please wait…' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp((v) => !v)}
          className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          {isSignUp ? 'Already have an account? Sign in' : "New here? Create an account"}
        </button>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  )
}
