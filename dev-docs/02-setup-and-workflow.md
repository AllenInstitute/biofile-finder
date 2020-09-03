Setup and workflow
==================

To get started with a _typical_ frontend project, one would clone the repository and run `npm install`. To add a dependency, one would run `npm install [package-name]`. But because the source code for this project is [split across three subpackages](01-project-layout.md), this all works differently in this project.

To help with the management of three interconnected packages, this project makes use of [lerna](https://github.com/lerna/lerna). The three most important features we get from using `lerna` are:
1) the linking of `fms-file-explorer-core` into both `fms-file-explorer-electron` and `fms-file-explorer-web`;
2) the deduplication of dependencies between those three packages; and
3) handling of multipackage versioning.


### Initial setup
With regard to project setup, the use of `lerna` has one major implication: `lerna` should be used to install all project dependencies and otherwise "bootstrap" the workspace. To initialize your workspace:
```bash
$ git clone ...  # duh
$ cd fms-file-explorer  # duh?
$ npm install  # this installs lerna
$ npx lerna bootstrap --hoist  # this installs and de-duplicates all subpackage dependencies and performs any linking between packages
```

**N.b: The command `npx lerna bootstrap --hoist` takes care of all dependency installation. There is no need to go into a subpackage and run `npm install`. If you end up with a `package-lock.json` within one of the subpackages, you've run npm install in a subpackage and you should clear your workspace before doing anything further.**


### Periodic workspace maintaince
Once setup locally, if remote master has progressed beyond your local repo, you should periodically refresh your workspace:
```bash
$ git pull  # duh
$ npx lerna clean -y
$ rm -rf node_modules/
$ npm install
$ npx lerna bootstrap --hoist
```


### Developing
In many cases, you'll need to make changes to the `fms-file-explorer-core` NPM package, and you'll want to see how those changes play out in the context of a rendered application, like `fms-file-explorer-electron` or `fms-file-explorer-web`. To make that happen:
1. In one terminal, navigate to the `fms-file-explorer-core` package and run `npm run build:watch`.
2. In another terminal, navigate to one or both of the containers (`fms-file-explorer-electron` and/or `fms-file-explorer-web`) and run `npm run start`.


### Adding a dependency to a subpackage
In the case that you need to add either a dependency or devDependency to any subpackage within this project, use `lerna`. There are some gotchyas to be aware of:
1. `lerna add`, when run without a `--scope` argument, will add the dependency to each subpackage in this project.
2. When specifying a `--scope`, you must use the subpackage's name _as defined in its package.json_, which is not always equal to the name of the directory under `packages`. For example, the `fms-file-explorer-core` subpackage should be referenced as `--scope @aics/fms-file-explorer-core`.
3. `lerna add` does not do a great job with cross-subpackage dependency deduplication by default. Use the `--no-bootstrap` option, then afterward, run `lerna bootstrap --hoist`.
4. It is generally best to use exact dependency versions; specificy `--exact`.


Some examples:
1. Add `lolcatjs` as a devDependency of `fms-file-explorer-core`: `npx lerna add --dev --scope @aics/fms-file-explorer-core --exact --no-bootstrap lolcatjs`.
2. Add `lolcatjs` as a regular dependency of `fms-file-explorer-electron` (or update it to latest if already installed): `npx lerna add --scope fms-file-explorer-electron --exact --no-bootstrap lolcatjs`.
3. Add `localcatjs` as a regular dependency to every subpackage: `npx lerna add --exact --no-bootstrap lolcatjs`.
