Setup and workflow
==================

To get started with a _typical_ frontend project, one would clone the repository and run `npm install`. To add a
dependency, one would run `npm install [package-name]`. But because the source code for this project is [split across
three subpackages](01-project-layout.md), this works slightly differently in this project.

To help with the management of three interconnected packages, this project makes use of
[npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces). The two most important features we get from using `npm workspaces` are:
1) the deduplication of dependencies; and
2) handling of multipackage versioning.


### System requirements
1. NodeJS version 20.x (use `nvm` or similar)
2. NPM version 10.x


### Initial setup
```bash
$ git clone git@github.com:AllenInstitute/biofile-finder.git
$ cd biofile-finder
$ npm ci  # or, `npm install` if you want to pick up dependency updates; you need to commit your package-lock.json afterwards, though.
```

**N.b: There is no need to go into a subpackage and run `npm install`.**


### Periodic workspace maintenance
Once setup locally, if remote has progressed beyond your local repo, you should periodically refresh your workspace:
```bash
$ git pull
$ git clean -Xfd
$ npm ci
```


### Developing
In many cases, you'll need to make changes to the `core` package, and you'll want to see how those changes play out in the context of a
rendered application, like `desktop` or `web`.
To make that happen:
1. To start the desktop version, run `npm --prefix packages/desktop run start`. Otherwise to start the web version, run `npm --prefix packages/web run start`.

### Testing
Most components in the project have associated unit tests; to run the full suite, run `npm run test`.
The unit tests for each of the packages can also be run independently, using `npm run test:core`, `npm run test:desktop`, 
or `npm run test:web`, respectively.

To run the linter, use `npm run lint`, and for typechecking, use `npm run typeCheck`.

### Adding a dependency to to either the `desktop` or `web` subpackages
In the case that you need to add either a dependency or devDependency to either the `desktop` or `web` subpackages within this
project, use the `--workspace` option of `npm install`.

A dependency should be added to one of these subpackages instead of in the project (monorepo) root in the case that it only
affects that particular subpackage, such as its build process or something about its particular runtime.


Some examples:
1. Add `lolcatjs` as a dependency of `packages/desktop`:
```
npm install --save --workspace packages/desktop lolcatjs
```
2. Add `lolcatjs` as a shared dependency within monorepo:
```
npm install --save lolcatjs
```
