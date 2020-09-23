Versioning and deployment/publishing
====================================

The strategy for versioning and deployment/publishing within this project is complicated by the fact that the three
subpackages produce very different artifacts. That is, the `fms-file-explore-core` package produces an NPM library that
is published to [npmjs.org](https://www.npmjs.com/package/@aics/fms-file-explorer-core); the
`fms-file-explorer-electron` produces platform-specific executables for linux, macOS, and Windows; and
`fms-file-explorer-web` produces a static website intended to be dumped into an S3 website bucket (or otherwise sit
behind a web server).

The following captures the steps of a release of this project:

1. Trigger a project-wide version bump and publish the new version of `fms-file-explorer-core` to `npmjs.org`:
https://jenkins.corp.alleninstitute.org/job/desktop-apps/job/fms-file-explorer/job/master/build (select "Version
packages in the monorepo and publish @aics/fms-file-explorer-core" for "JOB_TYPE" and whichever semver bump for
"VERSION_BUMP_TYPE" makes sense). Under the hood, `lerna` is used to bump the versions of each of the subpackages within
the repo. Additionally, `lerna` will handle bumping the version of `fms-file-explorer-core` referenced in the
`package.json` of `fms-file-explorer-electron` and `fms-file-explorer-web`. Last, using credentials stored in Jenkins,
`npm publish` is run _specifically_ within the `fms-file-explorer-core` subpackage.
2. Trigger a build/release of the desktop application:
https://jenkins.corp.alleninstitute.org/job/desktop-apps/job/fms-file-explorer/job/master/build (select "Trigger release
workflow on Github" for "JOB_TYPE"). Under the hood, a Github action is triggered which will create new
platform-specific builds of `fms-file-explorer-electron`, prepare a draft Github release, and upload the new builds as
release artifacts to that release.
3. Once the Github action in Step 2 is finished, manually edit the Github release which was drafted as part of Step 2.
Format its release name with the date (consistent with other release names), and add a description of the changes.