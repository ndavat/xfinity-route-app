# TestSprite Feature Specifications

This directory contains high-level feature specifications written in Gherkin-lite format for the Xfinity Route App. These specifications are used by the TestSprite MCP (Model Context Protocol) LLM for automated code generation and testing.

## Structure

- **app-navigation.feature**: Defines navigation behaviors and user interactions within the React Native application
- **route-management.feature**: Specifies route creation, editing, deletion, and management functionality
- **local-api-integration.feature**: Details the integration with local Android API services running on the device

## Gherkin-lite Format

The specifications follow a simplified Gherkin format that includes:

- **Feature**: High-level description of the functionality
- **Background**: Common setup steps for all scenarios
- **Scenario**: Specific test cases with Given-When-Then steps
- **Given**: Preconditions and setup
- **When**: Actions or events
- **Then**: Expected outcomes
- **And**: Additional conditions or outcomes

## Usage with TestSprite MCP

These specifications are automatically processed by the TestSprite MCP system to:

1. Generate React Native component code
2. Create corresponding test files
3. Validate implementation against specifications
4. Execute automated tests

## Android Local API Context

The specifications are designed for a React Native application that communicates with local Android APIs running on the same device, without requiring Docker or external cloud services. This aligns with Android app development constraints and local development workflows.

Run the TestSprite MCP command to process these specifications:

```bash
npm run test:mcp
```
