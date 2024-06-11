import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import OpenSourceDatasets from "../index";
import { initialState } from "../../../../../core/state";
import DatabaseServiceNoop from "../../../../../core/services/DatabaseService/DatabaseServiceNoop";

describe("<OpenSourceDatasets />", () => {
    const mockRouter = createBrowserRouter([
        {
            path: "/",
            element: <OpenSourceDatasets />,
        },
    ]);
    it("renders separate tables for internal and external datasets", () => {
        // Arrange
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    isOnWeb: true,
                    platformDependentServices: {
                        databaseService: new DatabaseServiceNoop(),
                    },
                },
            }),
        });
        const { getByText, getAllByRole } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );
        expect(getByText(/Allen Institute for Cell Science/)).to.exist;
        expect(getByText(/Additional contributed datasets/)).to.exist;
        expect(getAllByRole("grid").length).to.equal(2);
    });
});
