import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileMetadataSearchBar, { DATE_RANGE_SEPARATOR } from "../";
import FileFilter from "../../../entity/FileFilter";
import { AnnotationName } from "../../../constants";
import { initialState, selection } from "../../../state";

describe("<FileMetadataSearchBar />", () => {
    // TODO: Figure out a way to test this. it doesn't seem like the <Searchbox />
    // component recognizes the react-testing-library "onSubmit" event signals nor
    // does it recognize an "Enter" keydown or keypress event.

    // it("submits default file attribute when input is typed and submitted", async () => {
    //     // Arrange
    //     const { actions, logicMiddleware, store } = configureMockStore({ state: initialState });
    //     const { getByRole } = render(
    //         <Provider store={store}>
    //             <FileMetadataSearchBar />
    //         </Provider>
    //     );
    //     const searchQuery = "21304104.czi";

    //     // Act
    //     fireEvent.change(getByRole("searchbox"), { target: { value: searchQuery } });
    //     fireEvent.submit(getByRole("searchbox"));
    //     await logicMiddleware.whenComplete();

    //     // Assert
    //     expect(JSON.stringify(actions.list)).to.be.true;
    //     expect(
    //         actions.includesMatch(
    //             selection.actions.addFileFilter(
    //                 new FileFilter(AnnotationName.FILE_NAME, searchQuery)
    //             )
    //         )
    //     ).to.be.true;
    // });

    // it("submits newly chosen file attribute when input is typed and submitted", async () => {
    //     // Arrange
    //     const { actions, logicMiddleware, store } = configureMockStore({ state: initialState });
    //     const { getByRole, getByText } = render(
    //         <Provider store={store}>
    //             <FileMetadataSearchBar />
    //         </Provider>
    //     );
    //     const searchQuery = "21304404.czi";

    //     // Act
    //     fireEvent.click(getByText("File name"));
    //     fireEvent.click(getByText("File ID"));
    //     fireEvent.change(getByRole("searchbox"), { target: { value: searchQuery } });
    //     fireEvent.submit(getByRole("searchbox"));
    //     await logicMiddleware.whenComplete();

    //     // Assert
    //     expect(JSON.stringify(actions.list)).to.be.true;
    //     expect(
    //         actions.includesMatch(
    //             selection.actions.addFileFilter(new FileFilter(AnnotationName.FILE_ID, searchQuery))
    //         )
    //     ).to.be.true;
    // });

    it("defaults end date to start date when only start date is chosen", async () => {
        // Arrange
        const { actions, logicMiddleware, store } = configureMockStore({ state: initialState });
        const { getByPlaceholderText, getByText } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );
        const day = 17;
        const date = new Date();
        date.setDate(day);
        const expectedDate = date.toISOString().split("T")[0];
        const expectedRange = `${expectedDate}${DATE_RANGE_SEPARATOR}${expectedDate}`;

        // Act
        fireEvent.click(getByText("File name"));
        fireEvent.click(getByText("Uploaded"));
        fireEvent.click(getByPlaceholderText("Start of date range"));
        fireEvent.click(getByText(`${day}`));
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch(
                selection.actions.addFileFilter(
                    new FileFilter(AnnotationName.UPLOADED, expectedRange)
                )
            )
        ).to.be.true;
    });
});
