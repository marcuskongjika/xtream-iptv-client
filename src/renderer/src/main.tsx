import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/main.css'
import { initProxy } from './services/proxy'

// Resolve the local stream-proxy port before rendering so every request
// (API and playback) can be routed through it from the start.
initProxy().finally(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
