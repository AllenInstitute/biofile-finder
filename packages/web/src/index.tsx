import "regenerator-runtime/runtime";

import { memoize } from "lodash";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import NotificationServiceWeb from "./services/NotificationServiceWeb";
import ApplicationInfoServiceWeb from "./services/ApplicationInfoServiceWeb";
import ExecutionEnvServiceWeb from "./services/ExecutionEnvServiceWeb";
import FileViewerServiceWeb from "./services/FileViewerServiceWeb";
import FileDownloadServiceWeb from "./services/FileDownloadServiceWeb";
import ErrorPage from "./components/ErrorPage";
import Learn from "./components/Learn";
import Home from "./components/Home";
import Layout from "./components/Layout";
import OpenSourceDatasets from "./components/OpenSourceDatasets";
import SiteLogo from "../assets/site-logo.png";
import FmsFileExplorer from "../../core/App";
import { DatabaseService } from "../../core/services";
import { createReduxStore } from "../../core/state";

import "../../core/styles/global.css";
import styles from "./src.module.css";
import S3StorageService from "../../core/services/S3StorageService";

const APP_ID = "biofile-finder";

const router = createBrowserRouter(
    [
        {
            element: <Layout />,
            ErrorBoundary: ErrorPage,
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
    ],
    {
        basename: "",
    }
);

async function asyncRender() {
    const databaseService = new DatabaseService();
    await databaseService.initialize();

    // Memoized to make sure the object that collects these services doesn't
    // unnecessarily change with regard to referential equality between re-renders of the application
    const collectPlatformDependentServices = memoize(() => ({
        databaseService,
        notificationService: new NotificationServiceWeb(),
        executionEnvService: new ExecutionEnvServiceWeb(),
        applicationInfoService: new ApplicationInfoServiceWeb(),
        fileViewerService: new FileViewerServiceWeb(),
        fileDownloadService: new FileDownloadServiceWeb(new S3StorageService()),
    }));
    const store = createReduxStore({
        isOnWeb: true,
        platformDependentServices: collectPlatformDependentServices(),
    });
    render(
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>,
        document.getElementById(APP_ID)
    );

    try {
        (document.getElementById("og-image") as any).content = SiteLogo;
        (document.getElementById("tw-image") as any).content = SiteLogo;
    } catch (err) {
        console.error("Failed to set <head /> meta tags", err);
    }
}

asyncRender();
