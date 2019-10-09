fms-file-explorer
=====================

A monorepo containing all frontend sub-projects related to the FMS File Explorer.

### Quick start dev guide

In many cases, you'll need to be making changes to the `fms-file-explorer-core` NPM package, and you'll want to see how those changes play out in the context of a rendered application, like `fms-file-explorer-electron` or `fms-file-explorer-web`. To make that happen:
1. In one terminal, navigate to the `fms-file-explorer-core` package and run `npm run build:watch`.
2. In another terminal, navigate to one or both of the containers (`fms-file-explorer-electron` and/or `fms-file-explorer-web`) and run `npm run start`.
