# State

We use Redux to manage the application's data. The Redux store **should** be the single source of truth for the entire application.
In limited scenarios, components may hold their own state in the case that the local state:

1. is absolutely of no interest to the remainder of the application and never will be;
2. is not necessary for "hydrating" the application on initial load;
3. and cannot be derived from state that exists in the Redux store.

These scenarios are truly limited.

### Glossary

-   Action constants: Values, usually strings, that describe the type of an action. E.g., "APP_NAME/BRANCH_NAME/RECEIVE_DATA".

-   [Actions](https://redux.js.org/docs/basics/Actions.html): Plain objects that have a `type` property (whose value is an action constant), and optionally, arbitrary other fields.
    Conventionally, an action will have a `type` and a `payload`. Furthermore, actions are seldom created manually; they should have
    associated action creators--functions that return action objects. E.g.,

```
    import { RECEIVE_DATA } from "./constants";

    interface Datum {
        id: number;
        value: number;
    }

    interface Action {
        type: string;
        payload: Datum[];
    }

    function receiveListOfData(data: Datum[]): Action {
        return {
            type: RECEIVE_DATA,
            payload: data,
        };
    }
```

-   [Reducer](https://redux.js.org/docs/basics/Reducers.html): A function that accepts state (that is, a branch of the application state),
    and an action. It returns (new) application state. If an action it responds to modifies state, it should not modify state by
    reference--in any way. Use the [spread operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator) or similar
    to accomplish modifying state.

-   [Logic](https://github.com/jeffbski/redux-logic): Redux middleware for intercepting or otherwise responding to actions
    before or after the action has been processed by reducers. **Logics should contain any AJAX calls or complex business logic
    that one would otherwise be tempted to put in an action creator, a reducer, or a component's lifecycle.**

-   [Selector](https://github.com/reactjs/reselect): A function that accepts application state and returns a value.
    Used within `mapStateToProps` in containers.

### Directory structure

Each branch of the Redux state tree has its own directory under the `state` directory. That subdirectory serves as a module, bundling together action constants (`constants.ts`),
action creators (`actions.ts`), a single reducer (`reducer.ts`), selectors (either in `selectors.ts` if there are few, or in their own subfolder, `selectors/` if there are many), associated types
(`types.ts`), and any logics (if few, `logics.ts`, if many, under own subfolder, `logics/`). Each of these state directories has an `index.ts` to package the bundle. This pattern loosely follows the
[Ducks: Redux Reducer Bundles](https://github.com/erikras/ducks-modular-redux) specification.

E.g.:

```
src/
    state/
        data/
            ...
        metadata/
            ...
        selections/
            actions.ts
            constants.ts
            index.ts
            logics.ts
            reducer.ts
            selectors.ts
            types.ts
```

Within `selections/index.ts`:

```
import * as actions from "./actions";
import * as logics from "./logics";
import reducer from "./reducer";
import * as selectors from "./selectors";

export default {
    actions,
    logics,
    reducer,
    selectors,
};
```
