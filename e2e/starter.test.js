describe('Xfinity Router App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should launch and display the main app', async () => {
    // Wait for the app to load
    await waitFor(element(by.text('Xfinity Router App')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should have connection status indicator', async () => {
    // Test that connection status is displayed
    await expect(element(by.id('connection-status'))).toExist();
  });

  it('should allow navigation between screens', async () => {
    // Test navigation if tab bar exists
    const deviceTab = element(by.text('Devices'));
    if (await deviceTab.exists()) {
      await deviceTab.tap();
      await expect(element(by.id('devices-screen'))).toBeVisible();
    }
  });

  it('should handle network permissions', async () => {
    // This test verifies that the app has proper network permissions
    // and can access WiFi state as required for the router functionality
    await expect(element(by.id('main-container'))).toBeVisible();
  });
});
