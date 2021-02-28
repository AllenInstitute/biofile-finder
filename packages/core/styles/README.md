# Style

CSS files live alongside the component they style, and the classes they declare are imported into those components.

### Tooling

CSS assets are parsed, transformed, and concatenated together to form a single stylesheet. This is accomplished by a series
of webpack loaders:

1. First, `postcss-loader` applies a number of plugins:
    - one to fix known flexbox bugs [postcss-flexbugs-fixes](https://github.com/luisrudge/postcss-flexbugs-fixes),
    - another to make available new features of CSS [postcss-preset-env](https://github.com/csstools/postcss-preset-env) (which by default also auto-prefixes CSS declarations),
2. Next, `css-loader` makes the CSS classes available as an exported module to be consumed within JS/TS, and transforms the
   classname that will be applied in the browser to be hyper-local. That this, this loader provides [CSS Modules](https://github.com/css-modules/css-modules).
3. Last, `MiniCssExtractPlugin.loader` concatenates together the individual CSS files into a single stylesheet. That stylesheet,
   along with all other webpack generated assets, is auto-included in the `index.html` file served to the browser.

### Staying DRY

The `src/styles` directory holds base CSS classes and shared CSS Custom Properties of use to the application at large.
Files within this directory should be topical: e.g., `typography.css` holds CSS variables related to font sizing,
font family, color, etc.

For more information about using CSS Custom Properties (i.e. CSS variables), refer to: 
    - https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables 
    - https://www.smashingmagazine.com/2018/05/css-custom-properties-strategy-guide/

To use a base CSS class declared in this directory, use [`composes`](https://github.com/css-modules/css-modules#composing-from-other-files).

```
src/
    components/
        Button/
            style.css
    styles/
        layout.css
        typography.css
```

And the contents of `typography.css`:

```
:root {
    --typeface: 'Raleway', sans-serif;
    --fontColor: rgb(102, 102, 102);
}
```

To apply fontColor in `Button`'s stylesheet:

```
.container {
    composes: flexParent from "relative/path/to/styles/layout.css";
}

.button {
    color: var(--fontColor);
}
```

### Applying styling to components

To apply a CSS class to a component, import the stylesheet into the relevant `tsx` file. Within JavaScript/TypeScript,
the value of an imported stylesheet is an object. Its keys are the camelCased classnames declared in the imported stylesheet,
and its values are a transformation of that classname, in the form of `[filename]__[declared-classname]--[hash:base64:5]`
(i.e., `[the name of the CSS file]__[the css classname]--[the first 5 characters of a base64 hash of the contents of the declaration]`).
For example, given the following directory:

```
src/
    components/
        Button/
            index.tsx
            style.css
```

And the contents of `style.css`:

```
.container {
    background-color: blue;
}

.button {
    cursor: not-allowed;
}
```

To apply these CSS classes, in `index.tsx`:

```
import * as React from "react";

const styles = require("./style.css");

const button = (props) => {
    return (
        <div className={styles.container}>
            <button className={styles.button} />
        </div>
    );
}

```

### Note on `require()` versus `import ... from ...`

Notice in the example above that when CSS classes are imported into TypeScript files we use `const ... = require(...)` instead of
`import ... from ...` syntax. This is because using the latter syntax will prompt the TypeScript compiler to look for
an associated module for the CSS, and failing in its search, will not compile. While there are existing tools
for getting around this problem, none are robust solutions, so we use the `require(...)` syntax as a temporary
stop-gap measure until we implement a solution that we are happy with. **Note that we only use `require(...)` for CSS
files; all npm libraries and local modules should be imported using `import ... from ...` syntax.**
