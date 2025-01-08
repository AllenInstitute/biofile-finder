Versioning and deployment/publishing
====================================


The strategy for versioning and deployment/publishing within this project is complicated by the fact that there are two distinct
types of artifacts produced. That is, `packages/desktop` produces platform-specific executables for linux, macOS, and Windows,
while `packages/web` produces a static website intended to be dumped into an S3 website bucket (or otherwise sit
behind a web server).

# Web

1) Make sure all your changes are committed and merged into `main`.
2) Navigate to the GH workflow actions and select "Run workflow" along with the branch `main` & `staging`.
   ![image](./assets/WorkflowButton.png)
3) Review deploy action & approve if it looks good.
   ![image](./assets/DeployReview.png)
4) Test out changes on [staging](https://staging.biofile-finder.allencell.org/app).
5) Navigate to the GH workflow actions and select "Run workflow" along with the branch `main` & `production`.
6) Review deploy action & approve if it looks good.
7) Test out changes on [production](https://biofile-finder.allencell.org/app)

# Desktop

The following captures the steps of a release of this project to desktop:

1) Make sure all your changes are committed and merged into main.
2) Make sure branch is clean:
    ```bash
    git checkout main
    git stash
    git pull
    ```
3) Determine version bump type, choose one of `patch`, `minor`, or `major`, depending on the scale of the changes including in this version bump. This will create a version like `v<version>`. See [below for a guideline to which version to increment to](#versioning-information).
    ```bash
    # You need to choose one of 'patch', 'minor', or 'major'
    export VERSION_BUMP_TYPE=<one of patch, minor, or major>
    ```
4) Create tag and push new version to GitHub like so:
    ```bash
    npm --no-commit-hooks version --workspace packages/desktop $VERSION_BUMP_TYPE -m "v%s"
    ```
    Verify that the `"version"` property in all `package.json` files matches the new version number; otherwise, update them to match. 
5) Wait for a [GitHub Action](https://github.com/AllenInstitute/biofile-finder/actions) to automatically create new platform-specific
builds of `packages/desktop`, prepare a draft Github release, and upload the builds as release artifacts to that release.
6) [Update the GitHub release](https://github.com/AllenInstitute/biofile-finder/releases) once the Github action in Step 4 is finished, manually edit the Github release which was drafted as part of Step 4. Format its release name with the date (consistent with other release names), add a description of the changes, and optionally
mark whether the release is "pre-release." If it is marked as "pre-release," it will not be accessible for download through the
Github pages site.
7) **Temporary workaround for MacOS**: GitHub Actions currently builds .dmg files that don't work for x86 processors and that are interpreted as "damaged" by new MacOS versions. To get around this, follow the instructions below to [manually build executables](#manually-building-an-executable). You will need to do this separately for both arm64 and x86, and each build process **must be done on a machine that uses the correct processor** (e.g., on a computer with an Intel chip for the x86 build). 
  
    After building, change the .dmg name to match the current tag number and the processor that the build is for (e.g., `BioFile Finder-tag.number-arm64.dmg` or `BioFile Finder-tag.number-x86_64.dmg`), and upload these to the release page. You may need to delete existing .dmg files from the release if GitHub has already generated them automatically.

    If the build doesn't work (e.g., says it's damaged when downloaded from GitHub), change the `mac` build arch in `/desktop/package.json` from `"universal"` to whichever processor you're targeting (e.g., `"arm64"`).

## Manually building an executable
To manually build an executable for the desktop app, run the following from inside the `packages/desktop` directory:
```
npm run build-executable
```
This will create a `build` directory in `packages/desktop`, where it will package the app based on your current branch. The directory will contain an install file (e.g., `BioFile Finder-tag.number.dmg` if built on a Mac). 

If needed, this install file can be manually added to a GitHub release. Note that this is currently necessary in order to release BFF for Macs that use Intel chips, since the GitHub workflow only generates working executables for ARM processors (Apple Silicon chips).