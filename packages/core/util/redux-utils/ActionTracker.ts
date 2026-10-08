import { isEqual, isMatch } from "lodash";
import type { AnyAction } from "redux";

/**
 * Interface available to test code for working with actions that have been queued to run against Redux store.
 * Migrated from https://github.com/AllenCellSoftware/redux-utils (archived Nov 2025)
 */
export interface Actions {
    /**
     * Get list of actions that have passed through Redux middleware stack.
     */
    list: AnyAction[];

    /**
     * Answers the question: "Has this action been put in the queue to run against the Redux store?"
     *
     * Example:
     * ```typescript
     * // given actions.list === [ { type: "FOO", payload: 1234 } ]
     * expect(actions.includes({ type: "FOO", payload: 1234 }).to.equal(true);
     * ```
     */
    includes(search: AnyAction): boolean;

    /**
     * Answers the question: "Have these actions, in the provided order, been put in the queue to run against the
     * Redux store?"
     *
     * Example:
     * ```typescript
     * // given actions.list === [ { type: "FOO", payload: 1234 }, { type: "BAR", payload: ["blah"] } ]
     * expect(actions.includesInOrder([{ type: "FOO", payload: 1234 }, { type: "BAR", payload: ["blah"] }]).to.equal(true);
     * ```
     */
    includesInOrder(search: AnyAction[]): boolean;

    /**
     * Answers the question: "Has an action that _looks like this_ been put in the queue to run against the Redux
     * store?"
     *
     * Example:
     * ```
     * // given actions.list === [ { type: "FOO", payload: [ [Object], [Object], [Object] ] } ]
     * expect(actions.includesMatch({ type: "FOO" }).to.equal(true);
     * ```
     */
    includesMatch(search: Partial<AnyAction>): boolean;

    /**
     * Answers the question: "Have actions that _look like these_, in the provided order, been put in the queue to
     * run against the Redux store?"
     *
     * Example:
     * ```
     * // given actions.list === [ { type: "FOO", payload: 1234 }, { type: "BAR", payload: ["blah"] } ]
     * expect(actions.includesMatchesInOrder([{ type: "FOO" }, { type: "BAR" }]).to.equal(true);
     * ```
     */
    includesMatchesInOrder(search: Partial<AnyAction>[]): boolean;

    /**
     * Reset cache of actions that have passed through Redux middleware stack.
     */
    reset(): void;
}

/**
 * Helper class for tracking Redux actions as they pass through the middleware stack. The internal class `_actions`,
 * exposed by the `actions` getter, contains some methods for working with the tracked actions list, including resetting
 * the list and checking if any actions have passed through the middleware stack that equals (or loosely matches) a
 * given action or list of actions. The purpose of the internal class is to be able to provide a different API to test
 * code than the API used by action tracking middleware, but simultaneously allow both to access the same state.
 *
 * Example:
 * In mock-redux-store.ts, a new ActionTracker instance is used in custom Redux middleware to track actions passed
 * through the middleware stack.
 *
 * Then, in test code:
 * ```typescript
 * // `actions` here comes from ActionTracker::actions
 * const [store, logicMiddleware, actions] = createMockReduxStore();
 *
 * // before
 * expect(actions.list).to.be.empty;
 *
 * // do action and wait for redux-logic to do its thing
 * store.dispatch({ type: "FOO", payload: 1234 })
 * await logicMiddleware.whenComplete();
 *
 * // after
 * expect(actions.list).to.be.an("array").of.length(1);
 * expect(actions.includes({ type: "FOO", payload: 1234 })).to.equal(true);
 * expect(actions.includesMatch({ payload: 1234 })).to.equal(true);
 *```
 */
export default class ActionTracker {
    private _trackedActions: AnyAction[] = [];

    private _actions: Actions = new (class {
        private superThis: ActionTracker;
        constructor(superThis: ActionTracker) {
            this.superThis = superThis;
        }

        public get list() {
            return [...this.superThis._trackedActions];
        }

        public includes(search: AnyAction): boolean {
            return this._includes(search, isEqual);
        }

        public includesInOrder(search: AnyAction[]): boolean {
            return this._includesInOrder(search, isEqual);
        }

        public includesMatch(search: Partial<AnyAction>): boolean {
            return this._includes(search, isMatch);
        }

        public includesMatchesInOrder(search: Partial<AnyAction>[]): boolean {
            return this._includesInOrder(search, isMatch);
        }

        public reset(): void {
            this.superThis._trackedActions = [];
        }

        private _includes(
            search: Partial<AnyAction>,
            comparator: (object: any, source: any) => boolean
        ): boolean {
            return this.superThis._trackedActions.some((action: AnyAction) =>
                comparator(action, search)
            );
        }

        private _includesInOrder(
            search: Partial<AnyAction>[],
            comparator: (object: any, source: any) => boolean
        ): boolean {
            const indexOfFirstToFind = this.superThis._trackedActions.findIndex(
                (action: AnyAction) => comparator(action, search[0])
            );
            const indexOfLastToFind = indexOfFirstToFind + search.length - 1;

            // first action in search list is not found or tracked actions list is too small to account for all actions
            // in search list
            if (
                indexOfFirstToFind === -1 ||
                indexOfLastToFind > this.superThis._trackedActions.length - 1
            ) {
                return false;
            }

            // starting from `indexOfFirstToFind` and ending at `indexOfLastToFind`, assert that each tracked action
            // has a corresponding action in the search list at the same index position
            return this.superThis._trackedActions
                .slice(indexOfFirstToFind, indexOfLastToFind + 1) // slice is exclusive of end index
                .every((action: AnyAction, index: number) => comparator(action, search[index]));
        }
    })(this);

    /**
     * Expose internal class intended to be passed along to test code.
     */
    public get actions(): Actions {
        return this._actions;
    }

    /**
     * Track a Redux action. Intended to be called only by Redux middleware.
     */
    public track(action: AnyAction): void {
        this._trackedActions.push(action);
    }
}
