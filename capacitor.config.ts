import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amararidgehotels.fitness', 
  appName: 'Amara Fitness',
  webDir: 'public',
  overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
  server: {
    url: 'https://fitness.amararidgehotels.com',
    cleartext: true,
    allowNavigation: ['*']
  },
  // This new section controls the phone's clock/battery bar!
  plugins: {
    StatusBar: {
      overlaysWebView: false, // This forces the app to sit BELOW the clock
      backgroundColor: '#050B14' // This makes the clock's background a dark blue/black to match your app
    }
  }
};

export default config;