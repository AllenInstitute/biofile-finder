# Containers

Containers are components that have two purposes:

1. to compose more fundamental components that are themselves primarily responsible for rendering UI, and
2. to connect the UI to application state.

Containers may be connected to application state via Redux bindings provided by `react-redux`: `connect`.

`connect` should be provided with both `mapStateToProps` as well as `mapDispatchToProps` (either as a function or as a map;
a container should never be injected with `dispatch` itself). With few exceptions, within `mapStateToProps`, each prop should be the
result of calling a selector with `state` as it's one and only argument.

Like more simple components, containers are placed in folders named by their display name, and are written in an `index.tsx`
file. Unlike components, containers cannot have "subcontainers." The rendering logic of containers should be simple, but in
the case that it is not, containers should have tests that assert the logic works as intended--use `enzyme`s `shallow`
or `mount` utilities to accomplish these tests. Container tests are found in a `test/` folder within the container's directory.

### Styling

Like the components they compose, CSS is applied to containers by applying CSS classes. Classes are declared in `style.css` files
in container folders and are imported into containers. Use the `classnames` library to add more than one CSS class, or to conditionally
apply a CSS class to a container.

_Read the documentation on styles for more in-depth information._

### Example

Within:

```
    src/
        containers/
            ContainerFoo/
```

```
import { requestData } from "relative/path/to/actions";
import {
    selectorA,
    selectorB,
} from "relative/path/to/selectors";
import { State } from "relative/path/to/types";

import WidgetA from "relative/path/to/components/WidgetA";
import WidgetB from "relative/path/to/components/WidgetB";

interface ContainerFooProps {
    foo: number;
    bar: string;
    requestData: () => void;
}

class ContainerFoo extends React.Component<ContainerFooProps, {}> {
    public componentDidMount() {
        this.props.requestData();
    }

    public render() {
        const {
            foo,
            bar,
        } = this.props;

        return [
            <WidgetA key="widgetA" foo={foo} />,
            <WidgetB key="WidgetB" bar={bar} />,
        ];
    }
}

function mapStateToProps(state: State): ContainerFooProps {
    return {
        foo: selectorA(state),
        bar: selectorB(state),
    };
}

const dispatchToPropsMap = {
    requestData,
};

export default connect(mapStateToProps, dispatchToPropsMap)(ContainerFoo);

```
