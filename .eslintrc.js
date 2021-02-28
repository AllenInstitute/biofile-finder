module.exports = {
    extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "prettier",
        "prettier/@typescript-eslint",
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
