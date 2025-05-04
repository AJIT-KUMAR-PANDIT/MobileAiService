import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.luna.ai',
  appName: 'Luna AI',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SpeechRecognition: {
      androidPermissions: ['android.permission.RECORD_AUDIO']
    }
  }
};

export default config;