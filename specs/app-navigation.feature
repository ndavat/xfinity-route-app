Feature: App Navigation
  As a user of the Xfinity Route App
  I want to navigate between different screens
  So that I can access all features of the application

  Background:
    Given the app is launched
    And the user is on the home screen

  Scenario: Navigate to main tabs
    When the user taps on the "Routes" tab
    Then the Routes screen should be displayed
    
    When the user taps on the "Settings" tab
    Then the Settings screen should be displayed
    
    When the user taps on the "Profile" tab
    Then the Profile screen should be displayed

  Scenario: Back navigation
    Given the user is on a detail screen
    When the user taps the back button
    Then the user should return to the previous screen

  Scenario: Deep navigation
    Given the user is on the Routes screen
    When the user selects a specific route
    Then the Route Details screen should be displayed
    And the navigation title should show the route name
