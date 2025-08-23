/**
 * Type declarations for global Jest timer helpers
 */

declare global {
  /**
   * Run all timers with act wrapper for React components
   * @param time - Optional time in milliseconds to advance. If not provided, runs all timers.
   */
  function runTimersWithAct(time?: number): Promise<void>;

  /**
   * Run only pending timers with act wrapper
   */
  function runPendingTimers(): Promise<void>;

  /**
   * Advance timers by specific amount with act wrapper
   * @param ms - Time in milliseconds to advance
   */
  function advanceTime(ms: number): Promise<void>;
}

export {};
