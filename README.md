fms-file-explorer
=====================

A monorepo containing all frontend sub-projects related to the FMS File Explorer.


### How to setup the monorepo locally

If you're inclined to NOT use Gradle:
```bash
$ git clone ssh://git@aicsbitbucket.corp.alleninstitute.org:7999/sw/fms-file-explorer.git  # duh
$ npm install
$ npx lerna bootstrap --hoist
```

If you're include TO use Gradle:
```bash
$ git clone ssh://git@aicsbitbucket.corp.alleninstitute.org:7999/sw/fms-file-explorer.git  # duh
$ ./gradlew setup
```

### Once setup locally, if remote master has progressed beyond your local repo

```bash
$ git pull  # duh
$ npx lerna clean -y
$ npx lerna bootstrap --hoist
```

Those last two `lerna` commands are generally helpful if you run into any weird issues with dependencies that you expect are installed but cannot be resolved.


### Learn more about lerna

https://github.com/lerna/lerna


### Quick start dev guide

In many cases, you'll need to be making changes to the `fms-file-explorer-core` NPM package, and you'll want to see how those changes play out in the context of a rendered application, like `fms-file-explorer-electron` or `fms-file-explorer-web`. To make that happen:
1. In one terminal, navigate to the `fms-file-explorer-core` package and run `npm run build:watch`.
2. In another terminal, navigate to one or both of the containers (`fms-file-explorer-electron` and/or `fms-file-explorer-web`) and run `npm run start`.
