Feature: Local Android API Integration
  As a React Native app running on Android
  I want to communicate with a local API running on the same device
  So that I can access data and services without external dependencies

  Background:
    Given the Android device is running the local API server
    And the React Native app has network permissions
    And the local API is accessible via localhost

  Scenario: Establish connection to local API
    Given the app is starting up
    When the app attempts to connect to the local API
    Then the connection should be established successfully
    And the API health check should return "OK"
    And the app should cache the API connection status

  Scenario: Handle API connection failure
    Given the local API is not running
    When the app attempts to connect to the local API
    Then a connection error should be handled gracefully
    And the user should see an appropriate error message
    And the app should attempt to reconnect periodically

  Scenario: Fetch data from local API
    Given the local API connection is established
    When the app requests data from an API endpoint
    Then the request should be sent to the localhost API
    And the response should be received and parsed correctly
    And the data should be displayed in the UI

  Scenario: Send data to local API
    Given the local API connection is established
    When the app needs to save or update data
    Then the data should be sent to the appropriate API endpoint
    And the API should confirm successful data persistence
    And the UI should reflect the updated data state

  Scenario: Handle API response errors
    Given the local API connection is established
    When an API request returns an error response
    Then the error should be handled appropriately
    And the user should receive meaningful feedback
    And the app should maintain a stable state

  Scenario: Offline data synchronization
    Given the app has cached data from previous API calls
    When the local API becomes temporarily unavailable
    Then the app should continue functioning with cached data
    And pending changes should be queued for synchronization
    And data should sync when the API becomes available again
