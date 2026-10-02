/** General core types used across multiple services*/

/**
 * A promise that carries its own cancellation function with it.
 *
 * When catching rejections, check for a CanceledError (see core/errors), which can be treated as
 * a no-op. CanceledErrors indicate an intentional cancellation as opposed to a failure or fault.
 *  */
export interface CancellablePromise<T> {
    promise: Promise<T>;
    cancel?: (reason?: string) => void;
}
