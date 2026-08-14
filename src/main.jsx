import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initOneSignalWeb } from '@/lib/onesignal-web'
import { initOneSignal } from '@/lib/onesignal'
import { isCapacitorNative } from '@/lib/capacitor-utils'
import { Capacitor } from '@capacitor/core'

async function bootstrap() {
  if (isCapacitorNative()) {
    document.documentElement.classList.add('capacitor-native')
    document.body.classList.add('capacitor-native')

    // Add platform-specific class so CSS can target Android vs iOS separately
    const platform = Capacitor.getPlatform()
    document.documentElement.classList.add(`platform-${platform}`)
    document.body.classList.add(`platform-${platform}`)

    try {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await SplashScreen.hide()
    } catch (error) {
      console.error('SplashScreen.hide failed:', error)
    }

    // Initialize OneSignal; OS permission sheet on first launch only (not after deny).
    try {
      await initOneSignal()
    } catch (error) {
      console.error('initOneSignal (bootstrap) failed:', error)
    }
  } else {
    initOneSignalWeb()
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
}

bootstrap()
