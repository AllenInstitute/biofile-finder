const _ = require("lodash");

function isRequireCall(node) {
    return node.callee && node.callee.name === "require" && node.arguments.length === 1;
}

/**
 * Determines if the import matches the specified test(s).
 */
function testMatches(importSource, test) {
    return _.castArray(test).some((t) => {
        if (_.isFunction(t)) {
            return t(importSource);
        }

        if (_.isString(t)) {
            t = new RegExp(t);
        }

        return t.test(importSource);
    });
}

/**
 * A babel plugin for filtering out imports (both es- and cjs-style imports). This is necessary because
 * the library is imported within fms-file-explorer-electron's main process, which runs as a nodejs process. Within
 * that code path, statements like `import 'normalize.css';` and `const styles = require("./style.css")` will
 * crash the process.
 *
 * https://astexplorer.net/ is an invaluable resource if you find yourself needing to modify this file.
 *
 * This is a heavily-rewritten version of https://www.npmjs.com/package/babel-plugin-transform-remove-imports, which
 * does not handle cjs-style imports.
 */
module.exports = (babel) => {
    const { types: t } = babel;

    return {
        visitor: {
            /**
             * Handle es-style imports. E.g.: `import "normalize.css";`, `import "./global/styles.css";`
             */
            ImportDeclaration(path, { opts }) {
                const {
                    node: { source },
                } = path;

                if (!opts.test) {
                    console.warn('babel-plugin-filter-imports: "test" option should be specified');
                    return;
                }

                const importName = source && source.value ? source.value : undefined;
                if (importName && testMatches(importName, opts.test)) {
                    path.remove();
                }
            },

            /**
             * Handle cjs-style imports. E.g.: `const styles = require("./styles.css");`
             */
            CallExpression: (path, { opts }) => {
                const { node } = path;

                if (!opts.test) {
                    console.warn('babel-plugin-filter-imports: "test" option should be specified');
                    return;
                }

                if (isRequireCall(node)) {
                    const requireSource = node.arguments[0].value;
                    if (requireSource && testMatches(requireSource, opts.test)) {
                        // Replace the require call with an empty object, because we aren't going to do
                        // the hard work of removing any idenitifiers (i.e., variables) that result from any
                        // variable declaration this call expression may be a part of, e.g.:
                        // `const styles = require("./styles.css");` -> `const styles = {};`
                        path.replaceWith(t.objectExpression([]));
                    }
                }
            },
        },
    };
};
