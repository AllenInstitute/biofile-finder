import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { ContextMenuItem } from "../../ContextMenu";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileSort, { SortOrder } from "../../../entity/FileSort";
import Tutorial from "../../../entity/Tutorial";
import { initialState, interaction, selection } from "../../../state";

import Header from "../Header";

describe("<Header />", () => {
    it("dispatches sort action when clicked when file attribute", () => {
        // Arrange
        const annotations = [
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.FILE_SIZE,
            AnnotationName.UPLOADED,
        ];
        const state = mergeState(initialState, {
            metadata: {
                annotations: annotations.map((name) => ({
                    name,
                    displayName: name,
                    description: name,
                    type: AnnotationType.STRING,
                })),
            },
            selection: {
                columns: annotations.map((name) => ({
                    name: name,
                    width: 1 / annotations.length,
                })),
            },
        });
        const { actions, store } = configureMockStore({ state });
        const { getAllByText } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Act
        const fileSizeColumn = getAllByText(AnnotationName.FILE_SIZE)[0];
        fireEvent.click(fileSizeColumn);

        // Assert
        expect(actions.includesMatch(selection.actions.sortColumn(AnnotationName.FILE_SIZE))).to.be
            .true;
    });

    it("renders downward chevron when column is sorted descending", () => {
        // Arrange
        const annotations = [
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.FILE_SIZE,
            AnnotationName.UPLOADED,
        ];
        const state = mergeState(initialState, {
            metadata: {
                annotations: annotations.map((name) => ({
                    name,
                    displayName: name,
                    description: name,
                    type: AnnotationType.STRING,
                })),
            },
            selection: {
                columns: annotations.map((name) => ({
                    name: name,
                    width: 1 / annotations.length,
                })),
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC),
            },
        });
        const { store } = configureMockStore({ state });

        // Act
        const { getAllByText } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Assert
        const fileSizeCell = getAllByText(AnnotationName.FILE_SIZE)[0];
        fileSizeCell.querySelector("i[data-icon-name='ChevronDown']");
        expect(fileSizeCell).to.exist;
    });

    it("renders upward chevron when column is sorted ascending", () => {
        // Arrange
        const annotations = [
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.FILE_SIZE,
            AnnotationName.UPLOADED,
        ];
        const state = mergeState(initialState, {
            metadata: {
                annotations: annotations.map((name) => ({
                    name,
                    displayName: name,
                    description: name,
                    type: AnnotationType.STRING,
                })),
            },
            selection: {
                columns: annotations.map((name) => ({
                    name: name,
                    width: 1 / annotations.length,
                })),
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.ASC),
            },
        });
        const { store } = configureMockStore({ state });

        // Act
        const { getAllByText } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Assert
        const fileSizeCell = getAllByText(AnnotationName.FILE_SIZE)[0];
        fileSizeCell.querySelector("i[data-icon-name='ChevronUp']");
        expect(fileSizeCell).to.exist;
    });

    it("shows a menu with column ordering and column selection options on right-click", () => {
        // Arrange
        const annotations = [AnnotationName.FILE_NAME, AnnotationName.KIND];
        const state = mergeState(initialState, {
            metadata: {
                annotations: annotations.map((name) => ({
                    name,
                    displayName: name,
                    description: name,
                    type: AnnotationType.STRING,
                })),
            },
            selection: {
                columns: annotations.map((name) => ({ name, width: 150 })),
            },
        });
        const { actions, store } = configureMockStore({ state });
        const { getAllByText } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Act
        fireEvent.contextMenu(getAllByText(AnnotationName.KIND)[0]);

        // Assert
        const showContextMenuAction = actions.list.find(
            (action) => action.type === interaction.actions.SHOW_CONTEXT_MENU
        );
        expect(
            showContextMenuAction?.payload.items.map((item: ContextMenuItem) => item.key)
        ).to.eql(["Move to start", "Move to end", "modify-columns-divider", "modify-columns"]);
    });

    it("shows a menu with only column selection options when no column is right-clicked", () => {
        // Arrange
        const state = mergeState(initialState, {
            selection: { columns: [{ name: AnnotationName.FILE_NAME, width: 150 }] },
        });
        const { actions, store } = configureMockStore({ state });
        const { container } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Act: right-click the header itself rather than one of its columns
        fireEvent.contextMenu(container.querySelector(`#${Tutorial.COLUMN_HEADERS_ID}`) as Element);

        // Assert
        const showContextMenuAction = actions.list.find(
            (action) => action.type === interaction.actions.SHOW_CONTEXT_MENU
        );
        expect(
            showContextMenuAction?.payload.items.map((item: ContextMenuItem) => item.key)
        ).to.eql(["modify-columns"]);
    });

    it("opens the column picker when the header is clicked while no columns are displayed", () => {
        // Arrange
        const state = mergeState(initialState, { selection: { columns: [] } });
        const { actions, store } = configureMockStore({ state });
        const { container } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Act
        fireEvent.click(
            container.querySelector(`#${Tutorial.COLUMN_HEADERS_ID} > div > div`) as Element
        );

        // Assert: the picker itself is the menu, rather than an item that opens it
        const showContextMenuAction = actions.list.find(
            (action) => action.type === interaction.actions.SHOW_CONTEXT_MENU
        );
        expect(
            showContextMenuAction?.payload.items.map((item: ContextMenuItem) => item.key)
        ).to.eql(["available-annotations"]);
    });

    it("dispatches reorderColumns with reordered columns when column is dragged to new position", () => {
        // Arrange
        const annotations = [
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.FILE_SIZE,
            AnnotationName.UPLOADED,
        ];
        const columns = annotations.map((name) => ({
            name: name,
            width: 1 / annotations.length,
        }));
        const state = mergeState(initialState, {
            metadata: {
                annotations: annotations.map((name) => ({
                    name,
                    displayName: name,
                    description: name,
                    type: AnnotationType.STRING,
                })),
            },
            selection: { columns },
        });
        const { actions, store } = configureMockStore({ state });
        const { getAllByText } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Act: drag FILE_SIZE column (index 2) onto FILE_NAME column (index 0)
        const fileSizeCell = getAllByText(AnnotationName.FILE_SIZE)[0].closest(
            "[draggable]"
        ) as HTMLElement;
        const fileNameCell = getAllByText(AnnotationName.FILE_NAME)[0].closest(
            "[draggable]"
        ) as HTMLElement;
        fireEvent.dragStart(fileSizeCell);
        fireEvent.dragOver(fileNameCell);
        fireEvent.drop(fileNameCell);

        // Assert: FILE_SIZE should be moved to index 0, rest shift right
        expect(
            actions.includesMatch(
                selection.actions.reorderColumns([{ name: AnnotationName.FILE_SIZE, moveTo: 0 }])
            )
        ).to.be.true;
    });
});
