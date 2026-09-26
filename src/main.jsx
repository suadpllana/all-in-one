import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Self-hosted type, one voice per world (see index.css). Browsers only
// download a face once something on screen uses it.
import '@fontsource-variable/inter'
import '@fontsource/bebas-neue/latin-400.css'
import '@fontsource-variable/space-grotesk'
import '@fontsource/m-plus-rounded-1c/latin-500.css'
import '@fontsource/m-plus-rounded-1c/latin-800.css'
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/literata/opsz-italic.css'
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'

import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { startSync } from './lib/sync.js'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
})

// Device sync: pushes local library changes to the sync room and refreshes
// the UI when another device's changes are pulled in.
startSync({
  onChange: () => queryClient.invalidateQueries({ queryKey: ['library'] }),
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
