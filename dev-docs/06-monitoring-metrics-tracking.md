Monitoring, metrics, and event tracking
=======================================

This project makes use of [`@aics/frontend-insights`](https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/frontend-insights/browse/packages/frontend-insights) 
to abstract how application monitoring, metrics, and user event tracking are done, and where that data is sent.

### User event tracking
[Amplitude](https://amplitude.com/) is currently used as our user event tracking platform; it is plugged into `@aics/frontend-insights` via 
[`@aics/frontend-insights-plugin-amplitude-node`](https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/frontend-insights/browse/packages/frontend-insights-plugin-amplitude-node).

In order to test a new usage of user events (e.g., to ensure intended event properties are set), create an `.env` file in 
`packages/desktop`, following the example of `packages/desktop/.env.example`. Set the `AMPLITUDE_API_KEY` to the API key for the 
`fms-file-explorer-test` project in Amplitude: https://analytics.amplitude.com/allencell/settings/projects/308551/general. If you 
do not have access to Amplitude yet, ask an Amplitude administrator.
