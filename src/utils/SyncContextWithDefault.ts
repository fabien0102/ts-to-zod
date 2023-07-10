// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

/**
 * A utility for synchronous context propagation.
 *
 * This class is **NOT** safe to use with async/await code.
 */
export class SyncContextWithDefault<T> {
  private _values: T[];

  /** The current context value. */
  get value(): T {
    return this._values[this._values.length - 1];
  }

  constructor(defaultValue: T) {
    this._values = [defaultValue];
  }

  /**
   * Invokes the provided callback with the following
   * arguments and the provided value as the new context
   * value for the duration of its execution.
   * @param value The new context value.
   * @param callback The callback to invoke.
   * @param args The arguments to supply to the callback.
   * @returns The result of the callback.
   */
  run<F extends AnyFunction>(
    value: T,
    callback: F,
    ...args: Parameters<F>
  ): ReturnType<F> {
    try {
      this._values.push(value);
      return callback(...args);
    } finally {
      this._values.pop();
    }
  }
}
