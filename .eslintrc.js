module.exports = {
    extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended-legacy",
        "prettier",
    ],
    env: {
        mocha: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "./tsconfig.json",
    },
    plugins: ["@typescript-eslint", "react-hooks"],
    root: true,
    rules: {
        "import/named": "off",
        "import/no-named-as-default": "off",
        "import/no-named-as-default-member": "off",
        "import/no-unresolved": "off",
        "import/order": [
            "warn",
            {
                groups: [
                    ["builtin", "external"], // grouped together
                    "index",
                    "sibling",
                    "parent",
                    // everything else
                ],
                pathGroups: [{ pattern: ".**/*.css", group: "internal", position: "after" }],
            },
        ],
        "no-unused-vars": "off", // Per documentation (https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unused-vars.md), turned off in favor of @typescript-eslint/no-unused-vars
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            },
        ],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/camelcase": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
