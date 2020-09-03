Project layout
==============

This project is structured as a multi-package repository. There are three packages:
1. `packages/fms-file-explorer-core`,
2. `packages/fms-file-explorer-electron`, and
3. `packages/fms-file-explorer-web`.

### Core
`fms-file-explorer-core` is the primary source of the application. It is an NPM library that primarily exports a React component: the FMS File Explorer application. It also exports a function for instantiating the Redux store to be used with the application, as well as some other interfaces and constants that are helpful within the packages that render the application.


### Making use of "core"
Both `fms-file-explorer-electron` and `fms-file-explorer-web` depend on `fms-file-explorer-core`. They are responsible for rendering the React component exported by `fms-file-explorer-core` and wiring it together with its Redux store. They may optionally define services that implement interfaces defined within `fms-file-explorer-core`. These select interfaces are made available for implementation outside of `fms-file-explorer-core` because they are identified as being "platform-dependent," meaning we may accomplish implementing the interfaces differently within Electron than within a traditional web browser--or we may opt to not implement a service within one of those platforms altogether.


### Why the split
The reasoning behind the split in packages is simple: it allows the application to be distributed both as a desktop application (internal-facing, more richly featured), which is the published artifact of `fms-file-explorer-electron`, and as a web application (external-facing, feature-limited), which is the published artifact of `fms-file-explorer-web`.
