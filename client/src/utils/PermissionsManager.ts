import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { Toast } from "@capacitor/toast";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

export class PermissionsManager {
  /**
   * Request all necessary permissions for the app
   */
  public static async requestAllPermissions(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return; // Web platform handles permissions differently
    }

    try {
      // Request microphone permission (for speech recognition)
      await this.requestMicrophonePermission();

      // Request storage permission (for model storage)
      await this.requestStoragePermission();
    } catch (error) {
      console.error("Error requesting permissions:", error);
      await Toast.show({
        text: "Some permissions were denied. App functionality may be limited.",
        duration: "long",
      });
    }
  }

  /**
   * Request microphone permission
   */
  public static async requestMicrophonePermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      // Use SpeechRecognition plugin to request microphone permission
      const { available } = await SpeechRecognition.available();
      if (available) {
        const permissionStatus = await SpeechRecognition.requestPermissions();
        // Fix: The SpeechRecognition plugin doesn't use 'state' property
        // Instead, check if permission was granted based on the returned object
        if (!permissionStatus) {
          await Toast.show({
            text: "Microphone permission is needed for voice features",
            duration: "long",
          });
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      return false;
    }
  }

  /**
   * Request storage permission
   */
  public static async requestStoragePermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      // Use Filesystem plugin to check permissions
      const permissionStatus = await Filesystem.checkPermissions();
      if (permissionStatus.publicStorage !== "granted") {
        const requestResult = await Filesystem.requestPermissions();
        if (requestResult.publicStorage !== "granted") {
          await Toast.show({
            text: "Storage permission is needed to save AI models",
            duration: "long",
          });
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error requesting storage permission:", error);
      return false;
    }
  }
}
