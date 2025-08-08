# Xfinity Router App - New Contributor Onboarding

## 🎥 Video Demo on Notion

For new contributors, we've created a comprehensive video walkthrough available on our Notion page:

**[📺 Watch the Complete Onboarding Demo](https://www.notion.so/xfinity-router-app-onboarding)**

## 📋 Demo Contents

### 1. **Project Overview** (5 minutes)
- Introduction to the Xfinity Router App
- Architecture overview: React Native + Expo + TypeScript
- Key features and functionality demonstration
- Tech stack walkthrough

### 2. **Development Environment Setup** (10 minutes)
- Node.js and npm/yarn installation
- Expo CLI setup
- Android Studio and Xcode configuration
- Environment variables configuration
- First app launch demonstration

### 3. **MCP Specs Deep Dive** (15 minutes)
- What are MCP specs and why we use them
- Live demonstration of authoring a new MCP spec
- Writing Given-When-Then scenarios
- Adding testID attributes to components
- Best practices for spec organization

### 4. **Testing Suites Walkthrough** (20 minutes)

#### Unit Testing with Jest
- Running unit tests: `npm run test`
- Writing component tests
- Mocking external dependencies
- Coverage reports and interpretation

#### MCP Testing with TestSprite
- Running MCP tests: `npm run test:mcp`
- Understanding test generation from specs
- Debugging MCP test failures
- Configuration in `testsprite.mcp.json`

#### E2E Testing with Detox
- Setting up Detox for Android/iOS
- Running E2E tests: `npm run e2e:test`
- Writing new E2E test scenarios
- Device/simulator management

### 5. **Troubleshooting Common Issues** (15 minutes)

#### React Native Specific Issues
- Metro bundler cache clearing
- TypeScript configuration problems
- Expo module compatibility

#### MCP Integration Problems
- TestSprite configuration issues
- Mock setup problems
- WebSocket polyfill requirements

#### Android Development Issues
- Network security configuration
- ADB reverse proxy setup
- Flipper debugging conflicts

### 6. **Contribution Workflow** (10 minutes)
- Git branching strategy
- PR submission process
- Code review standards
- Continuous integration pipeline

## 🛠 Hands-On Exercise

The video includes a practical exercise where you'll:

1. **Create a new MCP spec** for a simple feature
2. **Implement the feature** with proper testIDs
3. **Run all test suites** to ensure everything passes
4. **Submit a mock PR** following our guidelines

## 📚 Additional Resources Mentioned in Demo

- [React Native Android Setup Guide](https://reactnative.dev/docs/environment-setup)
- [Expo Development Build Documentation](https://docs.expo.dev/development/introduction/)
- [TestSprite MCP Plugin Documentation](https://www.npmjs.com/package/@testsprite/testsprite-mcp)
- [Detox Getting Started Guide](https://github.com/wix/Detox/blob/master/docs/Introduction.GettingStarted.md)

## 🤔 FAQ (Addressed in Video)

**Q: Do I need to install Android Studio for iOS development?**
A: No, but it's recommended for testing on Android emulators.

**Q: Can I contribute without running E2E tests locally?**
A: Yes, our CI pipeline runs E2E tests, but local testing is encouraged.

**Q: What's the difference between MCP tests and unit tests?**
A: MCP tests are behavior-driven and test user scenarios, while unit tests focus on individual components.

**Q: How do I handle React Native module compatibility issues?**
A: Check the troubleshooting section in README.md or watch the demo's troubleshooting segment.

## 📞 Getting Help

After watching the video, if you still have questions:

1. Check the [README.md troubleshooting section](./README.md#🛠-troubleshooting)
2. Search existing GitHub issues
3. Join our development Discord channel (link in Notion)
4. Create a new issue with the "question" label

## ✅ Pre-Contribution Checklist

Before making your first contribution, ensure you can:

- [ ] Successfully run the app on at least one platform (Android/iOS)
- [ ] Execute all three test suites without errors
- [ ] Create and run a simple MCP spec
- [ ] Understand the codebase structure
- [ ] Follow our Git workflow

Welcome to the team! 🎉

