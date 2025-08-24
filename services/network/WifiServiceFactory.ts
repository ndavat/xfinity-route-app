import { WifiService } from './WifiService';
import { XfinityWifiService } from './WifiService';

export class WifiServiceFactory {
  private static liveInstance: XfinityWifiService;

  static getService(): WifiService {
    if (!this.liveInstance) {
      this.liveInstance = new XfinityWifiService();
    }
    return this.liveInstance;
  }
}
