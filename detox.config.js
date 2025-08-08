/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      build: 'npx expo run:ios --configuration Debug --device-family simulator'
    },
    'ios.release': {
      type: 'ios.app', 
      build: 'npx expo run:ios --configuration Release --device-family simulator'
    },
    'android.debug': {
      type: 'android.apk',
      build: 'npx expo run:android --variant debug',
      reversePorts: [
        8081
      ]
    },
    'android.release': {
      type: 'android.apk',
      build: 'npx expo run:android --variant release --no-bundler',
      reversePorts: [
        8081
      ]
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_API_34'
      },
      utilBinaryPaths: [
        "avdmanager",
        "emulator"
      ]
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release'
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug'
    },
    'android.att.release': {
      device: 'attached',
      app: 'android.release'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release'
    }
  }
};
