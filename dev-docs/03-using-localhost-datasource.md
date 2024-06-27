Using a local `file-explorer-service`
=====================================

Some features need to be developed across this codebase and the `file-explorer-service`. And in some other cases, it can
be helpful to do manual testing via the frontend of a feature or bugfix done within `file-explorer-service`. In each of
these situations, there is a mechanism built into the BioFile Finder for using a locally running version of the
`file-explorer-service`.

Instructions:
1. Run `file-explorer-service` in your favorite way such that it is accessible from
`http://localhost:9081/file-explorer-service`. Note that it must be running without SSL, accessible through `localhost`,
and running on port `9081`. If you run `file-explorer-service` on one computer (e.g., an in-office workstation) but have
the frontend running on another computer (e.g., your laptop), you can make the service available through `localhost` by
making use of port forwarding (e.g.: `ssh -L 9081:localhost:9081 dev-aics-gmp-001.corp.alleninstitute.org -N -f`).
2. From within the running Electron application, under the "Data Source" menu bar option, select "Localhost."
