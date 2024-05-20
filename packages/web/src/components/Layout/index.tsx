import * as React from "react";
import { Outlet } from "react-router-dom";
import Header from "../Header";

// Basic wrapper to maintain global header
export default function Layout() {
    return (
        <>
            <Header />
            <Outlet />
        </>
    );
}
