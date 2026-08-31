import type { CapacitorConfig } from '@capacitor/cli'

// Real package name — must match the Android app registered in Firebase
// (google-services.json's client_info.android_client_info.package_name)
// and, eventually, the Play Console listing.
const config: CapacitorConfig = {
  appId: 'com.gamegemgo',
  appName: 'SwipePlayable',
  webDir: 'dist',
  android: {
    // Local demo playables and any future remote playable creative both load
    // in an in-app iframe/webview, never the system browser.
    allowMixedContent: false,
  },
}

export default config
