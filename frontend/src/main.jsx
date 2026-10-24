import React from 'react';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
// reCAPTCHA disabled for now, see backend auth.controller.js login()
// import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx';
import SmoothScroll from './utils/SmoothScroll.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';
// const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}> */}
        <AuthProvider>
          <SmoothScroll />
          <App />
        </AuthProvider>
      {/* </GoogleReCaptchaProvider> */}
    </GoogleOAuthProvider>
  </StrictMode>,
)