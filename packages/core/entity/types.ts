/** General core types used across multiple services*/

// A promise that carries its own cancellation function with it
export interface CancellablePromise<T> {
    promise: Promise<T>;
    cancel?: (reason?: string) => void;
}
