import "regenerator-runtime/runtime";

import { memoize } from "lodash";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import NotificationServiceWeb from "./services/NotificationServiceWeb";
import ApplicationInfoServiceWeb from "./services/ApplicationInfoServiceWeb";
import DatabaseServiceWeb from "./services/DatabaseServiceWeb";
import ExecutionEnvServiceWeb from "./services/ExecutionEnvServiceWeb";
import FileViewerServiceWeb from "./services/FileViewerServiceWeb";
import FileDownloadServiceWeb from "./services/FileDownloadServiceWeb";
import PersistentConfigServiceWeb from "./services/PersistentConfigServiceWeb";
import ErrorPage from "./components/ErrorPage";
import Home from "./components/Home";
import Layout from "./components/Layout";
import NotFound from "./components/NotFound";
import OpenSourceDatasets from "./components/OpenSourceDatasets";
import UserGuide from "./components/UserGuide";
import { CONTENT } from "./components/UserGuide/content";
import SiteLogo from "../assets/site-logo.png";
import FmsFileExplorer from "../../core/App";
import S3StorageService from "../../core/services/S3StorageService";
import { createReduxStore } from "../../core/state";

import "../../core/styles/global.css";
import styles from "./src.module.css";

const APP_ID = "biofile-finder";

const userGuideHome = `/user-guide/${CONTENT[0].slug}/${CONTENT[0].pages[0].slug}`;
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
                // deprecated in favor of /user-guide
                // but kept for backward compatibility with old links
                {
                    path: "learn",
                    element: <Navigate to={userGuideHome} replace />,
                },
                {
                    path: "app",
                    element: <FmsFileExplorer className={styles.app} />,
                },
                {
                    path: "datasets",
                    element: <OpenSourceDatasets />,
                },
                {
                    path: "user-guide",
                    element: <Navigate to={userGuideHome} replace />,
                },
                {
                    path: "user-guide/:groupSlug/:pageSlug",
                    element: <UserGuide />,
                },
                {
                    path: "*", // Catches all URLs that do not match the above paths
                    element: <NotFound />,
                },
            ],
        },
    ],
    {
        basename: "",
    }
);

async function asyncRender() {
    const persistentConfigService = new PersistentConfigServiceWeb();
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
        fileDownloadService: new FileDownloadServiceWeb(new S3StorageService()),
        persistentConfigService,
    }));
    const store = createReduxStore({
        isOnWeb: true,
        persistedConfig: persistentConfigService.getAll(),
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
