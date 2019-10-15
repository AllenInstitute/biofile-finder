import { isEqual, isMatch } from "lodash";
import { AnyAction } from "redux";

export interface Actions {
    list: AnyAction[];
    includes(search: AnyAction): boolean;
    includesInOrder(search: AnyAction[]): boolean;
    includesMatch(search: AnyAction): boolean;
    includesMatchesInOrder(search: AnyAction[]): boolean;
    reset(): void;
}

/**
 * Helper class for tracking Redux list as they pass through the Redux middleware stack. The internal class
 * _actionTracker, exposed by the `tracker` getter on the main class, contains some methods for working with the tracked
 * list, including resetting the cache of the list and checking if any list have passed through
 * the Middleware stack that matches a given action. The purpose of the internal class is to be able to provide a
 * different API to test code than the API used by action tracking middleware but allowing both to access the same
 * state.
 */
export default class ActionTracker {
    private _actions: AnyAction[];

    private _actionTracker: Actions = new (class {
        constructor(private superThis: ActionTracker) {
            this.superThis = superThis;
        }

        /**
         * Get list of actions that have passed through Redux middleware stack.
         */
        public get list() {
            return [...this.superThis._actions];
        }

        /**
         * Answers the question: "Has this action been put in the queue to run against the Redux store?"
         *
         * Example:
         * // given actions.list === [ { type: "FOO", payload: 1234 } ]
         * > expect(actions.includes([{ type: "FOO", payload: 1234 }]).to.equal(true);
         */
        public includes(search: AnyAction): boolean {
            return this._includes(search, isEqual);
        }

        /**
         * Answers the question: "Have these actions, in the provided order, been put in the queue to run against the
         * Redux store?"
         *
         * Example:
         * // given actions.list === [ { type: "FOO", payload: 1234 }, { type: "BAR", payload: ["blah"] } ]
         * > expect(actions.includesInOrder([{ type: "FOO", payload: 1234 }, { type: "BAR", payload: ["blah"] }]).to.equal(true);
         */
        public includesInOrder(search: AnyAction[]): boolean {
            return this._includesInOrder(search, isEqual);
        }

        /**
         * Answers the question: "Has an action that looks like this been put in the queue to run against the Redux
         * store?"
         *
         * Example:
         * // given actions.list === [ { type: "FOO", payload: [ [Object], [Object], [Object] ] } ]
         * > expect(actions.includesMatch([ { type: "FOO" } ]).to.equal(true);
         */
        public includesMatch(search: AnyAction): boolean {
            return this._includes(search, isMatch);
        }

        /**
         * Answers the question: "Have actions that looks like these, in the provided order, been put in the queue to
         * run against the Redux store?"
         *
         * Example:
         * // given actions.list === [ { type: "FOO", payload: 1234 }, { type: "BAR", payload: ["blah"] } ]
         * > expect(actions.includesMatchesInOrder([{ type: "FOO" }, { type: "BAR" }]).to.equal(true);
         */
        public includesMatchesInOrder(search: AnyAction[]): boolean {
            return this._includesInOrder(search, isMatch);
        }

        /**
         * Reset cache of actions that have passed through Redux middleware stack.
         */
        public reset(): void {
            this.superThis._actions = [];
        }

        private _includes(
            search: AnyAction,
            comparator: (object: any, source: any) => boolean
        ): boolean {
            return this.superThis._actions.some((action: AnyAction) => comparator(action, search));
        }

        private _includesInOrder(
            search: AnyAction[],
            comparator: (object: any, source: any) => boolean
        ): boolean {
            const indexOfFirst = this.superThis._actions.findIndex((action: AnyAction) =>
                comparator(action, search[0])
            );
            const indexOfLast = indexOfFirst + search.length - 1;

            // first action in search list is not found or tracked actions list is too small to account for all actions
            // in search list
            if (indexOfFirst === -1 || indexOfLast > this.superThis._actions.length - 1) {
                return false;
            }

            // starting from `indexOfFirst` and ending at `indexOfLast`, assert that each tracked action includesMatch the
            // action in the corresponding index position in `search`
            return this.superThis._actions
                .slice(indexOfFirst, indexOfLast + 1) // slice is exclusive of end index
                .every((action: AnyAction, index: number) => comparator(action, search[index]));
        }
    })(this);

    constructor() {
        this._actions = [];
    }

    /**
     * Expose internal class intended to be passed along to test code.
     */
    public get actions() {
        return this._actionTracker;
    }

    /**
     * Track a Redux action. Intended to be called only by Redux middleware.
     */
    public track(action: AnyAction) {
        this._actions.push(action);
    }
}
