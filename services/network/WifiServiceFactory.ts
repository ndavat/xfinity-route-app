import { WifiService } from './WifiService';
import { XfinityWifiService } from './WifiService';
import { MockWifiService } from './MockWifiService';

export class WifiServiceFactory {
  private static mockInstance: MockWifiService;
  private static liveInstance: XfinityWifiService;

  static getService(isMockMode: boolean): WifiService {
    if (isMockMode) {
      if (!this.mockInstance) {
        this.mockInstance = new MockWifiService();
      }
      return this.mockInstance;
    } else {
      if (!this.liveInstance) {
        this.liveInstance = new XfinityWifiService();
      }
      return this.liveInstance;
    }
  }
}
