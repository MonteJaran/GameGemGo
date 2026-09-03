import type { CapacitorConfig } from '@capacitor/cli'

// Real package name — must match the Android app registered in Firebase
// (google-services.json's client_info.android_client_info.package_name)
// and, eventually, the Play Console listing. Originally com.gamegemgo —
// Play Console rejected that as unavailable (already registered to
// someone else) and suggested this one instead.
const config: CapacitorConfig = {
  appId: 'com.gamegemgo.myapp',
  appName: 'GameGemGo',
  webDir: 'dist',
  android: {
    // Local demo playables and any future remote playable creative both load
    // in an in-app iframe/webview, never the system browser.
    allowMixedContent: false,
  },
}

export default config
