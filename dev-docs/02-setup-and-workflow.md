Setup and workflow
==================

To get started with a _typical_ frontend project, one would clone the repository and run `npm install`. To add a
dependency, one would run `npm install [package-name]`. But because the source code for this project is [split across
three subpackages](01-project-layout.md), this all works differently in this project.

To help with the management of three interconnected packages, this project makes use of
[lerna](https://github.com/lerna/lerna). The two most important features we get from using `lerna` are:
1) the deduplication of dependencies between those three packages; and
2) handling of multipackage versioning.


### System requirements
1. NodeJS version 14.x (use `nvm` or similar)
2. NPM version 7.x (e.g.: `npm install --global npm@next-7`)


### Initial setup
With regard to project setup, the use of `lerna` has one major implication: `lerna` should be used to install all
project dependencies and otherwise "bootstrap" the workspace. To initialize your workspace:
```bash
$ git clone ssh://git@aicsbitbucket.corp.alleninstitute.org:7999/sw/fms-file-explorer.git  # duh
$ cd fms-file-explorer  # duh?
$ npm ci  # best to not use `npm install`
$ npx lerna bootstrap --hoist  # this installs and deduplicates all subpackage dependencies and performs any linking between packages
```

**N.b: The command `npx lerna bootstrap --hoist` takes care of all dependency installation. There is no need to go into
a subpackage and run `npm install`. If you end up with a `package-lock.json` within one of the subpackages, you've likely run
`npm install` in a subpackage and you should clear your workspace before doing anything further.**


### Periodic workspace maintenance
Once setup locally, if remote has progressed beyond your local repo, you should periodically refresh your workspace:
```bash
$ git pull  # duh
$ npx lerna clean -y
$ rm -rf node_modules/
$ npm ci
$ npx lerna bootstrap --hoist
```


### Developing
In many cases, you'll need to make changes to the `core` package, and you'll want to see how those changes play out in the context of a 
rendered application, like `desktop` or `web`.
To make that happen:
1. Navigate to either `packages/desktop` or `packages/web` and run `npm run start`.


### Adding a dependency to to either the `desktop` or `web` subpackages
In the case that you need to add either a dependency or devDependency to either the `desktop` or `web` subpackages within this 
project, use `lerna`.

A dependency should be added to one of these subpackages instead of in the project (monorepo) root in the case that it only 
affects that particular subpackage, such as its build process or something about its particular runtime.

There are some gotchyas to be aware of:
1. `lerna add`, when run without a `--scope` argument, will add the dependency to each subpackage in this project.
2. When specifying a `--scope`, you must use the subpackage's name _as defined in its package.json_, which is not always
equal to the name of the directory under `packages`.
3. The `lerna add` subcommand does not do a great job with cross-subpackage dependency deduplication. Use the
`--no-bootstrap` option with `lerna add`, then afterward, run `lerna bootstrap --hoist`.
4. It is generally best to use exact dependency versions; specificy `--exact`.


Some examples:
1. Add `lolcatjs` as a regular dependency of `packages/desktop`:
```
npx lerna add --scope fms-file-explorer-desktop --exact --no-bootstrap lolcatjs
npx lerna bootstrap --hoist
```
2. Add `lolcatjs` as a regular dependency to both `packages/desktop` as well as `packages/web`:
```
npx lerna add --exact --no-bootstrap lolcatjs
npx lerna bootstrap --hoist
```

In each example above, if `lolcatjs` is already installed in the specified subpackage, the commands will result in
updating `lolcatjs` to the latest available version.


### Adding a dependency to the project (monorepo) root and to `core`
To add a dependency to the project root, use `npm`. E.g.: `npm install --save-exact lolcatjs`. 

