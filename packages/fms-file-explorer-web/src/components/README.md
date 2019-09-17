# Components

Components are the fundamental UI elements of this application. Ideally, they are stateless functional components, though
in more complex scenarios, they may be classes. Regardless of their type, they are solely concerned with accepting props and
returning JSX.

Components are placed in folders named by their display name, and are written in an `index.tsx` file found at the root
of the component folder. Some components have subcomponents. Subcomponents are found in their parent component folders and
are named according to their display name.

### Styling

CSS is applied to components by applying CSS classes. Classes are declared in `style.css` files in component folders and
are imported into components. Use the `classnames` library to add more than one CSS class, or to conditionally
apply a CSS class to a component.

_Read the documentation on styles for more in-depth information._

### Example

For example, a component named `Button` should be structured like:

```
src/
    components/
        Button/
            index.tsx
            style.css
```

To use a `Button`: `import Button from "relative/path/to/components/Button"`

A component named `List`, which renders a subcomponent named `ListItem` should be structured like:

```
src/
   components/
        List/
            index.tsx
            list-item.tsx
            style.css
```

To use a `List`: `import List from "relative/path/to/components/List"`
