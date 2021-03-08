Versioning and deployment/publishing
====================================

The strategy for versioning and deployment/publishing within this project is complicated by the fact that there are two distinct 
types of artifacts produced. That is, `packages/desktop` produces platform-specific executables for linux, macOS, and Windows, 
while `packages/web` produces a static website intended to be dumped into an S3 website bucket (or otherwise sit
behind a web server).

The following captures the steps of a release of this project:

1. Trigger a project-wide version tag:
https://jenkins.corp.alleninstitute.org/job/desktop-apps/job/fms-file-explorer/job/master/build (select "Create version tag" for "JOB_TYPE" and whichever semver bump for "VERSION_BUMP_TYPE" makes sense). Under the hood, `lerna` is used to bump the versions of each of the subpackages within the repo, create an associated git tag, and push it. 
2. Once a new version tag is pushed in Step 1, a Github action is automatically triggered which will create new platform-specific 
builds of `packages/desktop`, prepare a draft Github release, and upload the builds as release artifacts to that release.
3. Once the Github action in Step 2 is finished, manually edit the Github release which was drafted as part of Step 2.
Format its release name with the date (consistent with other release names), add a description of the changes, and optionally 
mark whether the release is "pre-release." If it is marked as "pre-release," it will not be accessible for download through the 
Github pages site.
