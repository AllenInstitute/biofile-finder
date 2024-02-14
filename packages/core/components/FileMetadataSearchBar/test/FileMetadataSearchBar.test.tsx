import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileMetadataSearchBar, { extractDateFromDateString } from "../";
import FileFilter from "../../../entity/FileFilter";
import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import { initialState, reducer, reduxLogics, selection } from "../../../state";

describe("<FileMetadataSearchBar />", () => {
    const ENTER_KEY = { keyCode: 13 };

    it("submits default file attribute when input is typed and submitted with no filters applied", async () => {
        // Arrange
        const state = {
            ...initialState,
            selection: {
                filters: [],
            },
        };
        const { actions, logicMiddleware, store } = configureMockStore({ state });
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

    it("renders with past year date filter by default", async () => {
        const { store } = configureMockStore({ state: initialState });
        const dateUpper = new Date();
        const dateLower = new Date();
        const upperYear = dateUpper.getFullYear();
        dateLower.setFullYear(upperYear - 1);
        const upperDateString = dateUpper.toDateString();
        const lowerDateString = dateLower.toDateString();
        const { getByText } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );
        const uploadedDisplayName =
            TOP_LEVEL_FILE_ANNOTATIONS.find((a) => a.name === AnnotationName.UPLOADED)
                ?.displayName || "";
        expect(getByText(uploadedDisplayName)).to.not.be.empty;
        expect(getByText(upperDateString)).to.not.be.empty;
        expect(getByText(lowerDateString)).to.not.be.empty;
    });

    it("submits newly chosen file attribute when input is typed and submitted", async () => {
        // Arrange
        const { actions, logicMiddleware, store } = configureMockStore({
            state: initialState,
            reducer,
            logics: reduxLogics,
        });
        const { getByRole, getByText } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );
        const searchQuery = "21304404.czi";

        // Act
        fireEvent.click(getByText("Uploaded"));
        fireEvent.click(getByText("File ID"));
        fireEvent.change(getByRole("searchbox"), { target: { value: searchQuery } });
        fireEvent.keyDown(getByRole("searchbox"), ENTER_KEY);
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch(
                selection.actions.setFileFilters([
                    new FileFilter(AnnotationName.FILE_ID, searchQuery),
                ])
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

    describe("load date search bar with filter from URL", () => {
        [
            ["2022-01-01", "2022-02-01", "Sat Jan 01 2022", "Mon Jan 31 2022"],
            ["2022-01-01", "2022-01-31", "Sat Jan 01 2022", "Sun Jan 30 2022"],
            ["2022-01-01", "2022-02-02", "Sat Jan 01 2022", "Tue Feb 01 2022"],
            ["2022-01-31", "2022-01-02", "Mon Jan 31 2022", "Sat Jan 01 2022"],
        ].forEach(([dateLowerBound, dateUpperBound, expectedDate1, expectedDate2]) => {
            it(`loads correct dates for filter "RANGE(${dateLowerBound},{${dateUpperBound})"`, () => {
                // Arrange
                const uploadedDisplayName =
                    TOP_LEVEL_FILE_ANNOTATIONS.find((a) => a.name === AnnotationName.UPLOADED)
                        ?.displayName || "";
                const dateLowerAsDate = new Date(dateLowerBound);
                const dateUpperAsDate = new Date(dateUpperBound);
                const dateLowerISO = dateLowerAsDate.toISOString();
                const dateUpperISO = dateUpperAsDate.toISOString();
                const filter = new FileFilter(
                    AnnotationName.UPLOADED,
                    `RANGE(${dateLowerISO},${dateUpperISO})`
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
                expect(getByText(expectedDate1)).to.not.be.empty;
                expect(getByText(expectedDate2)).to.not.be.empty;
            });
        });
    });

    it("creates RANGE() file filter of RANGE(day,day+1) when only start date is selected", async () => {
        // Arrange
        const { actions, logicMiddleware, store } = configureMockStore({
            state: initialState,
            reducer,
            logics: reduxLogics,
        });
        const { getByText, getAllByRole, getByRole } = render(
            <Provider store={store}>
                <FileMetadataSearchBar />
            </Provider>
        );
        const startDate = new Date();
        const day = 15; // Arbitrary day of the month that won't show up twice in the Calendar popup
        startDate.setDate(day);
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        const expectedRange = `RANGE(${startDate.toISOString()},${endDate.toISOString()})`;

        // Act
        const dropdownComponent = getAllByRole("combobox").at(0) as HTMLElement;
        fireEvent.click(dropdownComponent);
        fireEvent.click(getByRole("option", { name: "Uploaded" }));
        fireEvent.click(getByText("Start of date range"));
        fireEvent.click(getByText(day));
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch(
                selection.actions.setFileFilters([
                    new FileFilter(AnnotationName.UPLOADED, expectedRange),
                ])
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
