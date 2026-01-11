import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(req => console.log('Service Worker Registered!'))
    .catch(err => console.log('Service Worker Registration Failed', err));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
