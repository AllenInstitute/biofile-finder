import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileMetadataSearchBar, { DATE_RANGE_SEPARATOR, extractDateFromDateString } from "../";
import FileFilter from "../../../entity/FileFilter";
import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import { initialState, selection } from "../../../state";

describe("<FileMetadataSearchBar />", () => {
    const ENTER_KEY = { keyCode: 13 };

    it("submits default file attribute when input is typed and submitted", async () => {
        // Arrange
        const { actions, logicMiddleware, store } = configureMockStore({ state: initialState });
        const { getByRole } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );
        const searchQuery = "21304104.czi";

        // Act
        fireEvent.change(getByRole("searchbox"), { target: { value: searchQuery } });
        fireEvent.keyDown(getByRole("searchbox"), ENTER_KEY);
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch(
                selection.actions.addFileFilter(
                    new FileFilter(AnnotationName.FILE_NAME, searchQuery)
                )
            )
        ).to.be.true;
    });

    it("submits newly chosen file attribute when input is typed and submitted", async () => {
        // Arrange
        const { actions, logicMiddleware, store } = configureMockStore({ state: initialState });
        const { getByRole, getByText } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );
        const searchQuery = "21304404.czi";

        // Act
        fireEvent.click(getByText("File name"));
        fireEvent.click(getByText("File ID"));
        fireEvent.change(getByRole("searchbox"), { target: { value: searchQuery } });
        fireEvent.keyDown(getByRole("searchbox"), ENTER_KEY);
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch(
                selection.actions.addFileFilter(new FileFilter(AnnotationName.FILE_ID, searchQuery))
            )
        ).to.be.true;
    });

    it("loads text search bar with filter from URL", () => {
        // Arrange
        const thumbnailDisplayName =
            TOP_LEVEL_FILE_ANNOTATIONS.find((a) => a.name === AnnotationName.THUMBNAIL_PATH)
                ?.displayName || "";
        const filter = new FileFilter(AnnotationName.THUMBNAIL_PATH, "/my/thumbnail.png");
        const state = {
            ...initialState,
            selection: {
                filters: [filter],
            },
        };
        const { store } = configureMockStore({ state });
        const { getByText, getByDisplayValue } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );

        // Assert
        expect(getByText(thumbnailDisplayName)).to.not.be.empty;
        expect(getByDisplayValue(filter.value)).to.not.be.empty;
    });

    it("loads date search bar with filter from URL", () => {
        // Arrange
        const uploadedDisplayName =
            TOP_LEVEL_FILE_ANNOTATIONS.find((a) => a.name === AnnotationName.UPLOADED)
                ?.displayName || "";
        const date1 = "2021-03-04";
        const date2 = "2020-08-30";
        const filter = new FileFilter(
            AnnotationName.UPLOADED,
            `${date1}${DATE_RANGE_SEPARATOR}${date2}`
        );
        const state = {
            ...initialState,
            selection: {
                filters: [filter],
            },
        };
        const { store } = configureMockStore({ state });
        const { getByText } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );

        // Assert
        expect(getByText(uploadedDisplayName)).to.not.be.empty;
        expect(getByText("Thu Mar 04 2021")).to.not.be.empty;
        expect(getByText("Sun Aug 30 2020")).to.not.be.empty;
    });

    it("defaults end date to start date when only start date is chosen", async () => {
        // Arrange
        const { actions, logicMiddleware, store } = configureMockStore({ state: initialState });
        const { getByText } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );
        const day = 17;
        const date = new Date();
        const expectedDate = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(
            -2
        )}-${day}`;
        const expectedRange = `${expectedDate}${DATE_RANGE_SEPARATOR}${expectedDate}`;

        // Act
        fireEvent.click(getByText("File name"));
        fireEvent.click(getByText("Uploaded"));
        fireEvent.click(getByText("Start of date range"));
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

    describe("extractDateFromDateString", () => {
        [
            ["2021-02-01", 1612137600000],
            ["3030-03-04", 33455721600000],
            ["2018-3-4", 1520150400000],
        ].forEach(([dateString, expectedInMs]) => {
            it(`returns expected point in time as date instance for ${dateString}`, () => {
                // Arrange
                const expected = new Date(expectedInMs);
                expected.setMinutes(expected.getTimezoneOffset());

                // Act
                const actual = extractDateFromDateString(dateString as string);

                // Assert
                expect(actual).to.not.be.undefined;
                expect(actual?.getFullYear()).to.equal(expected.getFullYear());
                expect(actual?.getMonth()).to.equal(expected.getMonth());
                expect(actual?.getDate()).to.equal(expected.getDate());
            });
        });

        it("returns undefined when given falsy input", () => {
            // Act
            const actual = extractDateFromDateString(undefined);

            // Assert
            expect(actual).to.be.undefined;
        });
    });
});
