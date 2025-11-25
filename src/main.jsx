import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AudioPlaylistProvider } from './context/AudioPlaylistContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <AudioPlaylistProvider>
          <App />
        </AudioPlaylistProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
