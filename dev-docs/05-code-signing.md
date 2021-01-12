Code signing
============

The build/release process makes use of built-in code signing hooks provided by
[electron-builder](https://www.electron.build/code-signing#how-to-disable-code-signing-during-the-build-process-on-macos).
Refer to that documentation and other widely-available information for a general introduction.

### Windows distribution
The certificate and its associated password used to sign the Windows artifact are stored as
[repo-level secrets](https://github.com/AllenInstitute/aics-fms-file-explorer-app/settings/secrets/actions) in Github.
The certificate is base64 encoded and stored in the `CSC_LINK` secret.
The certificate password is stored in the `CSC_KEY_PASSWORD` secret.

Both the code signing certificate and its password are additionally stored in
ansible-platform in `inventory/group_vars/desktop_apps` for posterity.

### Mac distribution
This macOS artifact is not yet code signed.

### Linux distribution
N/A
