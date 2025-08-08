export interface MockDevice {
  comments?: string;
  connectionType: string;
  customName: string;
  hostname: string;
  ip: string;
  isBlocked: boolean;
  isOnline: boolean;
  mac: string;
  networkDetails: {
    band: string;
    dhcpType: string;
    ipv6: string;
    lastSeen: string;
    localLinkIpv6: string;
    protocol: string;
    rssiLevel: string;
    signalStrength: number;
    speed?: number;
  };
}

// Mock device data based on the existing TestData/devicelist.json
export const mockDevices: MockDevice[] = [
  {
    comments: "OnePlus 7 Pro",
    connectionType: "Unknown",
    customName: "OnePlus 7 Pro",
    hostname: "36:E7:B5:EA:84:A1",
    ip: "10.0.0.169",
    isBlocked: false,
    isOnline: true,
    mac: "36:E7:B5:EA:84:A1",
    networkDetails: {
      band: "5GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::34e7:b5ff:feea:84a1",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-62 dBm",
      signalStrength: -62,
      speed: undefined
    }
  },
  {
    connectionType: "Unknown",
    customName: "43TCLRokuTV",
    hostname: "43TCLRokuTV",
    ip: "10.0.0.161",
    isBlocked: false,
    isOnline: true,
    mac: "94:B3:F7:05:4D:C3",
    networkDetails: {
      band: "5GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::96b3:f7ff:fe05:4dc3",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-69 dBm",
      signalStrength: -69,
      speed: undefined
    }
  },
  {
    comments: "Moto G Stylus 5G - 2023",
    connectionType: "Unknown",
    customName: "Moto G Stylus 5G - 2023",
    hostname: "7a:3d:75:e7:33:ad",
    ip: "10.0.0.117",
    isBlocked: false,
    isOnline: true,
    mac: "7A:3D:75:E7:33:AD",
    networkDetails: {
      band: "5GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::783d:75ff:fee7:33ad",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-67 dBm",
      signalStrength: -67,
      speed: undefined
    }
  },
  {
    connectionType: "Unknown",
    customName: "Chromecast-HD",
    hostname: "Chromecast-HD",
    ip: "10.0.0.198",
    isBlocked: false,
    isOnline: true,
    mac: "9E:44:35:61:35:0B",
    networkDetails: {
      band: "5GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::9c44:35ff:fe61:350b",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-77 dBm",
      signalStrength: -77,
      speed: undefined
    }
  },
  {
    connectionType: "Unknown",
    customName: "CX-5CD4088ZS8",
    hostname: "CX-5CD4088ZS8",
    ip: "10.0.0.44",
    isBlocked: false,
    isOnline: true,
    mac: "8C:53:E6:BB:53:39",
    networkDetails: {
      band: "5GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::d87d:d523:b3ae:fe79",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-56 dBm",
      signalStrength: -56,
      speed: undefined
    }
  },
  {
    connectionType: "Unknown",
    customName: "DESKTOP-843R24E",
    hostname: "DESKTOP-843R24E",
    ip: "10.0.0.98",
    isBlocked: false,
    isOnline: true,
    mac: "D8:12:65:73:DB:CF",
    networkDetails: {
      band: "5GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::d4fc:5f99:dbb7:afe",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-70 dBm",
      signalStrength: -70,
      speed: undefined
    }
  },
  {
    connectionType: "Unknown",
    customName: "moto-g-power-5G-XT2415V-3",
    hostname: "moto-g-power-5G-XT2415V-3",
    ip: "10.0.0.192",
    isBlocked: false,
    isOnline: true,
    mac: "02:07:BB:9A:39:47",
    networkDetails: {
      band: "5GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::7:bbff:fe9a:3947",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-73 dBm",
      signalStrength: -73,
      speed: undefined
    }
  },
  {
    connectionType: "Unknown",
    customName: "ND-S23-ultra",
    hostname: "ND-S23-ultra",
    ip: "10.0.0.57",
    isBlocked: false,
    isOnline: true,
    mac: "E2:87:F6:D5:33:E2",
    networkDetails: {
      band: "5GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::e087:f6ff:fed5:33e2",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-53 dBm",
      signalStrength: -53,
      speed: undefined
    }
  },
  // Additional mock devices for more comprehensive testing
  {
    connectionType: "Ethernet",
    customName: "Gaming PC",
    hostname: "GAMING-PC",
    ip: "10.0.0.100",
    isBlocked: false,
    isOnline: true,
    mac: "AA:BB:CC:DD:EE:FF",
    networkDetails: {
      band: "Ethernet",
      dhcpType: "DHCP",
      ipv6: "fe80::aabb:ccff:fedd:eeff",
      lastSeen: new Date().toISOString(),
      localLinkIpv6: "",
      protocol: "Ethernet",
      rssiLevel: "N/A",
      signalStrength: 0,
      speed: 1000
    }
  },
  {
    connectionType: "Unknown",
    customName: "Smart Doorbell",
    hostname: "Smart-Doorbell",
    ip: "10.0.0.205",
    isBlocked: false,
    isOnline: false, // Offline device for testing
    mac: "11:22:33:44:55:66",
    networkDetails: {
      band: "2.4GHz",
      dhcpType: "DHCP",
      ipv6: "fe80::1122:33ff:fe44:5566",
      lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      localLinkIpv6: "",
      protocol: "Unknown",
      rssiLevel: "-85 dBm",
      signalStrength: -85,
      speed: undefined
    }
  }
];

// Helper functions for mock data manipulation
export function findDeviceByMac(mac: string): MockDevice | undefined {
  return mockDevices.find(device => device.mac.toLowerCase() === mac.toLowerCase());
}

export function getOnlineDevices(): MockDevice[] {
  return mockDevices.filter(device => device.isOnline);
}

export function getBlockedDevices(): MockDevice[] {
  return mockDevices.filter(device => device.isBlocked);
}

export function resetMockDevices(): void {
  mockDevices.forEach(device => {
    device.isBlocked = false;
    device.isOnline = true;
    device.networkDetails.lastSeen = new Date().toISOString();
  });
}
