Feature: Route Management
  As a user of the Xfinity Route App
  I want to manage my routes and locations
  So that I can efficiently plan and track my activities

  Background:
    Given the app has access to location services
    And the local Android API is running
    And the user is authenticated

  Scenario: View available routes
    Given the user is on the Routes screen
    When the routes are loaded from the local API
    Then a list of available routes should be displayed
    And each route should show basic information (name, distance, duration)

  Scenario: Create a new route
    Given the user is on the Routes screen
    When the user taps the "Add Route" button
    And enters route details (name, start point, end point)
    And taps "Save"
    Then the new route should be created via the local API
    And the route should appear in the routes list
    And a success message should be displayed

  Scenario: View route details
    Given the user has selected a route from the list
    When the Route Details screen loads
    Then detailed route information should be displayed
    And the route should be shown on a map
    And navigation options should be available

  Scenario: Edit an existing route
    Given the user is viewing route details
    When the user taps the "Edit" button
    And modifies route information
    And taps "Save Changes"
    Then the route should be updated via the local API
    And the updated information should be reflected in the UI

  Scenario: Delete a route
    Given the user is viewing route details
    When the user taps the "Delete" button
    And confirms the deletion
    Then the route should be removed via the local API
    And the user should return to the routes list
    And the deleted route should no longer appear
