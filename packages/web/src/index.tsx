import "regenerator-runtime/runtime";

import { memoize } from "lodash";
import * as React from "react";
import { createRoot } from 'react-dom/client';
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import NotificationServiceWeb from "./services/NotificationServiceWeb";
import ApplicationInfoServiceWeb from "./services/ApplicationInfoServiceWeb";
import ExecutionEnvServiceWeb from "./services/ExecutionEnvServiceWeb";
import DatabaseServiceWeb from "./services/DatabaseServiceWeb";
import FileViewerServiceWeb from "./services/FileViewerServiceWeb";
import FileDownloadServiceWeb from "./services/FileDownloadServiceWeb";
import Learn from "./components/Learn";
import Home from "./components/Home";
import Layout from "./components/Layout";
import OpenSourceDatasets from "./components/OpenSourceDatasets";
import BFFLogo from "../assets/bff-logo.png";
import FmsFileExplorer from "../../core/App";
import { createReduxStore } from "../../core/state";

import "../../core/styles/global.css";
import styles from "./src.module.css";

const APP_ID = "biofile-finder";

const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <Home />, // Splash page
            },
            {
                path: "learn",
                element: <Learn />,
            },
            {
                path: "app",
                element: <FmsFileExplorer className={styles.app} />,
            },
            {
                path: "datasets",
                element: <OpenSourceDatasets />,
            },
        ],
    },
]);

async function asyncRender() {
    const databaseService = new DatabaseServiceWeb();
    await databaseService.initialize();

    // Memoized to make sure the object that collects these services doesn't
    // unnecessarily change with regard to referential equality between re-renders of the application
    const collectPlatformDependentServices = memoize(() => ({
        databaseService,
        notificationService: new NotificationServiceWeb(),
        executionEnvService: new ExecutionEnvServiceWeb(),
        applicationInfoService: new ApplicationInfoServiceWeb(),
        fileViewerService: new FileViewerServiceWeb(),
        fileDownloadService: new FileDownloadServiceWeb(),
    }));
    const store = createReduxStore({
        isOnWeb: true,
        platformDependentServices: collectPlatformDependentServices(),
    });
    const root = createRoot(document.getElementById(APP_ID)!);
    root.render(
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>
    );

    try {
        (document.getElementById("og-image") as any).content = BFFLogo;
        (document.getElementById("tw-image") as any).content = BFFLogo;
    } catch (err) {
        console.error("Failed to set <head /> meta tags", err);
    }
}

asyncRender();
