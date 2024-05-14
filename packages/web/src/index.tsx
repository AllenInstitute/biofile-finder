import "regenerator-runtime/runtime";

import { memoize } from "lodash";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import NotificationServiceWeb from "./services/NotificationServiceWeb";
import PersistentConfigServiceWeb from "./services/PersistentConfigServiceWeb";
import ApplicationInfoServiceWeb from "./services/ApplicationInfoServiceWeb";
import ExecutionEnvServiceWeb from "./services/ExecutionEnvServiceWeb";
import DatabaseServiceWeb from "./services/DatabaseServiceWeb";
import FmsFileExplorer from "../../core/App";
import { createReduxStore } from "../../core/state";
import FileViewerServiceWeb from "./services/FileViewerServiceWeb";
import FileDownloadServiceWeb from "./services/FileDownloadServiceWeb";
import Root from "./routes/Root";

const APP_ID = "fms-file-explorer-web";

const applicationInfoService = new ApplicationInfoServiceWeb();
const databaseService = new DatabaseServiceWeb();
const notificationService = new NotificationServiceWeb();
const persistentConfigService = new PersistentConfigServiceWeb();
const executionEnvService = new ExecutionEnvServiceWeb();
// application analytics/metrics
// const frontendInsights = new FrontendInsights(
//     {
//         application: {
//             name: APP_ID,
//             version: applicationInfoService.getApplicationVersion(),
//         },
//         userInfo: {
//             userId: applicationInfoService.getUserName(),
//         },
//         session: {
//             platform: "Web",
//             deviceId: `${applicationInfoService.getUserName()}-${executionEnvService.getOS()}`,
//         },
//         loglevel: process.env.NODE_ENV === "production" ? LogLevel.Error : LogLevel.Debug,
//     },
//     [new AmplitudeNodePlugin({ apiKey: process.env.AMPLITUDE_API_KEY })]
// );
// frontendInsights.dispatchUserEvent({ type: "SESSION_START" });

// Memoized to make sure the object that collects these services doesn't
// unnecessarily change with regard to referential equality between re-renders of the application
const collectPlatformDependentServices = memoize(() => ({
    applicationInfoService,
    databaseService,
    executionEnvService,
    fileDownloadService: new FileDownloadServiceWeb(notificationService),
    fileViewerService: new FileViewerServiceWeb(notificationService),
    // frontendInsights,
    persistentConfigService,
}));

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />, // Splash page placeholder
    },
    {
        path: "app",
        element: <FmsFileExplorer platformDependentServices={collectPlatformDependentServices()} />,
    },
]);

render(
    <Provider store={createReduxStore()}>
        <RouterProvider router={router} />
    </Provider>,
    document.getElementById(APP_ID)
);
