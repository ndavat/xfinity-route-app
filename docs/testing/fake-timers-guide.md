# Fake Timers Testing Guide

## Overview

This project uses Jest's fake timers to ensure deterministic test execution. All tests that use `setTimeout`, `setInterval`, or other timer functions should use fake timers to avoid flaky tests.

## Automatic Setup

Fake timers are automatically configured for all tests via `jest.setup.js`. You don't need to manually call `jest.useFakeTimers()` in your tests.

## Global Helper Functions

We provide global helper functions that wrap timer operations with React's `act()`:

### `runTimersWithAct(time?: number)`
Runs timers with act wrapper. If time is provided, advances by that amount. Otherwise, runs all timers.

```typescript
// Run all timers
await runTimersWithAct();

// Advance by 1000ms
await runTimersWithAct(1000);
```

### `runPendingTimers()`
Runs only currently pending timers.

```typescript
await runPendingTimers();
```

### `advanceTime(ms: number)`
Advances timers by specific milliseconds.

```typescript
await advanceTime(500);
```

## Examples

### Testing React Components with Timers

```typescript
import { render, waitFor } from '@testing-library/react-native';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should update after timer', async () => {
    const { getByText } = render(<MyComponent />);
    
    // Component uses setTimeout internally
    expect(getByText('Loading...')).toBeTruthy();
    
    // Advance timers by 1 second
    await runTimersWithAct(1000);
    
    // Check updated state
    expect(getByText('Loaded!')).toBeTruthy();
  });
});
```

### Testing Non-React Code with Timers

For non-React code, you can use Jest's timer functions directly:

```typescript
describe('Logger', () => {
  it('should flush buffer after interval', () => {
    const logger = new Logger({ flushInterval: 5000 });
    
    logger.log('message');
    expect(logger.bufferSize).toBe(1);
    
    // Advance by 5 seconds
    jest.advanceTimersByTime(5000);
    
    expect(logger.bufferSize).toBe(0);
  });
});
```

### Testing Async Operations with Timers

```typescript
describe('API Service', () => {
  it('should retry on failure', async () => {
    const service = new ApiService();
    const promise = service.fetchWithRetry();
    
    // First attempt fails
    await runTimersWithAct(1000);
    
    // Retry after delay
    await runTimersWithAct(5000);
    
    const result = await promise;
    expect(result).toBeDefined();
  });
});
```

## Best Practices

1. **Always use fake timers for tests with timers**: This ensures tests run quickly and deterministically.

2. **Use act() wrapper for React components**: When testing React components, always use the global helpers or wrap timer operations in `act()`.

3. **Clear timers between tests**: The setup file automatically clears timers, but you can manually clear if needed:
   ```typescript
   jest.clearAllTimers();
   ```

4. **Test timer-based logic explicitly**: Don't wait for real time; advance timers programmatically:
   ```typescript
   // Bad - waits real time
   await new Promise(resolve => setTimeout(resolve, 1000));
   
   // Good - advances fake time
   await runTimersWithAct(1000);
   ```

5. **Use appropriate timer functions**:
   - `jest.runAllTimers()`: Runs all timers until none are left
   - `jest.runOnlyPendingTimers()`: Runs only currently pending timers
   - `jest.advanceTimersByTime(ms)`: Advances by specific time

## Troubleshooting

### Timer not executing
Make sure you're advancing timers or running them:
```typescript
// Set timer
setTimeout(callback, 1000);

// Must advance or run timers
jest.advanceTimersByTime(1000);
// or
jest.runAllTimers();
```

### React state not updating
Use the act wrapper helpers:
```typescript
// Instead of jest.runAllTimers()
await runTimersWithAct();
```

### Infinite timer loops
Use `runOnlyPendingTimers` to avoid infinite loops:
```typescript
jest.runOnlyPendingTimers();
// or
await runPendingTimers();
```

## Migration Guide

If you have existing tests using real timers:

1. Remove manual `jest.useFakeTimers()` calls (now automatic)
2. Replace `setTimeout` waits with timer advancement
3. Wrap React timer operations in act() or use global helpers
4. Ensure all async operations complete before assertions

Example migration:

```typescript
// Before
it('updates after delay', async () => {
  render(<Component />);
  await new Promise(resolve => setTimeout(resolve, 1000));
  expect(screen.getByText('Updated')).toBeTruthy();
});

// After
it('updates after delay', async () => {
  render(<Component />);
  await runTimersWithAct(1000);
  expect(screen.getByText('Updated')).toBeTruthy();
});
```
