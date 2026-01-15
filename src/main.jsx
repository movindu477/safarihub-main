import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { testSupabase } from './lib/supabase'

// Test Supabase connection on app start
testSupabase().then(result => {
  if (result.success) {
    console.log('✅ Supabase connection verified');
  } else {
    console.warn('⚠️ Supabase connection failed. Please check your .env file.');
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
