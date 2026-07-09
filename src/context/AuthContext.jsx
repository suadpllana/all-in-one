import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

// The app is local-first: no accounts. Everyone gets the same local identity;
// cross-device continuity comes from the sync code (lib/sync.js), not auth.
// The signIn/signUp/signOut no-ops keep the old call sites working.
const LOCAL_USER = {
  id: 'local-guest',
  email: 'guest@vault.local',
  user_metadata: { name: 'Guest' },
  local: true,
}

const value = {
  user: LOCAL_USER,
  loading: false,
  mode: 'local',
  async signIn() {
    return { error: null }
  },
  async signUp() {
    return { error: null }
  },
  async signOut() {},
}

export function AuthProvider({ children }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
