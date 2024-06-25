import classNames from "classnames";
import Interactable from "@interactjs/core/Interactable"; // unfortunately necessary for the typings
import InteractEvent from "@interactjs/core/InteractEvent"; // unfortunately necessary for the typings
import interact from "interactjs";
import * as React from "react";

import styles from "./Cell.module.css";

export const NON_RESIZEABLE_CELL_TEST_ID = "non-resizeable-cell-test-id";

export interface CellProps {
    className?: string;
    columnKey: string;
    onContextMenu?: (evt: React.MouseEvent) => void;
    onResize?: (columnKey: string, nextWidth?: number) => void; // nextWith is a percentage of parent element's width, a number between 0 and 1.
    title?: string;
    width: number; // percentage of parent element's width, a number between 0 and 1.
}

interface CellState {
    containerClassName?: string;
    provisionalWidth?: number; // a percentage of parent element's width, a number between 0 and 1
    resizeTargetClassName: string;
}

enum ResizeDirection {
    BIGGER_OR_SMALLER,
    BIGGER,
}

/**
 * Akin to a cell within a spreadsheet, this represents a position within an x/y grid. A cell can either be resizable or
 * not resizable--this is determined by whether `props.onResize` is provided. If the cell is resizable, a user can reset
 * the width to its default by double clicking the cell.
 *
 * This component deals in percentage widths to avoid requiring components that make use of this to measure themselves; e.g.
 * it enables a configuration of, "each cell should take up 25% of the total width," without having to resolve that
 * within pixel space.
 */
export default class Cell extends React.Component<React.PropsWithChildren<CellProps>, CellState> {
    public static MINIMUM_WIDTH = 50; // px; somewhat arbitrary

    public state: CellState = {
        resizeTargetClassName: styles.cursorResizeEitherDirection,
    };

    private cell: React.RefObject<HTMLDivElement>;
    private resizeTarget: React.RefObject<HTMLDivElement>;
    private interactable: Interactable | undefined;

    constructor(props: CellProps) {
        super(props);

        this.cell = React.createRef();
        this.resizeTarget = React.createRef();

        this.onDoubleClick = this.onDoubleClick.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onResizeEnd = this.onResizeEnd.bind(this);
        this.onResizeStart = this.onResizeStart.bind(this);
    }

    public componentDidMount(): void {
        if (this.props.onResize && this.cell.current && this.resizeTarget.current) {
            this.interactable = interact(this.cell.current).resizable({
                edges: {
                    right: this.resizeTarget.current,
                },
                cursorChecker: () => {
                    return ""; // disable interact's mechanism for setting the cursor CSS prop; this is set manually
                },
            });
            this.interactable.on("resizestart", this.onResizeStart);
            this.interactable.on("resizemove", this.onResize);
            this.interactable.on("resizeend", this.onResizeEnd);
        }
    }

    public componentWillUnmount(): void {
        if (this.interactable) {
            this.interactable.unset();
        }
    }

    public render(): JSX.Element {
        if (this.props.onResize) {
            return this.renderResizeableCell();
        }

        return this.renderNonResizeableCell();
    }

    private renderResizeableCell(): JSX.Element {
        const { className, width } = this.props;
        const { containerClassName, provisionalWidth, resizeTargetClassName } = this.state;
        return (
            <div
                ref={this.cell}
                className={classNames(styles.resizableCell, containerClassName, className)}
                onContextMenu={this.props.onContextMenu}
                onDoubleClick={this.onDoubleClick}
                title={this.props.title}
                style={{
                    width: `${(provisionalWidth || width) * 100}%`,
                    minWidth: Cell.MINIMUM_WIDTH,
                }}
            >
                {this.props.children}
                <span
                    className={classNames(styles.resizeTarget, resizeTargetClassName)}
                    ref={this.resizeTarget}
                >
                    |
                </span>
            </div>
        );
    }

    private renderNonResizeableCell(): JSX.Element {
        return (
            <div
                className={classNames(styles.cell, this.props.className)}
                onContextMenu={this.props.onContextMenu}
                style={{ width: `${this.props.width * 100}%` }}
                data-testid={NON_RESIZEABLE_CELL_TEST_ID}
                title={this.props.title}
            >
                {this.props.children}
            </div>
        );
    }

    /**
     * On double click, trigger a reset of the column width.
     */
    private onDoubleClick(): void {
        const { columnKey, onResize } = this.props;

        if (onResize) {
            onResize(columnKey);
        }
    }

    /**
     * Determine total width of encompassing row this cell sits within. Used to translate full pixel width
     * into a percentage.
     */
    private measureRowWidth(): number {
        // If for some reason we don't have a reference to the cell's HTMLElement, well, return a number that
        // won't fail when used as a divisor.
        if (!this.cell.current) {
            return 1;
        }

        // The FileRow is an inline element, which for whatever reason doesn't report width
        // it's parent does, though. Huge shrug.
        return this.cell.current.parentElement?.parentElement?.clientWidth || 1;
    }

    /**
     * On start of resize, set expectations for what the user can do.
     */
    private onResizeStart(e: InteractEvent): void {
        const { width } = this.props;
        const allowedResizeDirection = this.getAllowedResizeDirection(width, e.target);

        this.setState({
            resizeTargetClassName: this.getResizeClassName(allowedResizeDirection),
        });
    }

    /**
     * At each resize step, determine if the resize is allowed, and if it is, set it as
     * provisional state to "preview" to the user what the resize would look like.
     */
    private onResize(e: InteractEvent): void {
        const { provisionalWidth } = this.state;

        const nextWidth = e.rect.width / this.measureRowWidth();
        const allowedResizeDirection = this.getAllowedResizeDirection(e.rect.width, e.target);

        let nextState: CellState = {
            resizeTargetClassName: this.getResizeClassName(allowedResizeDirection),
        };

        const dx = nextWidth - (provisionalWidth || nextWidth);
        if (this.resizeIsAllowed(dx, allowedResizeDirection)) {
            nextState = {
                ...nextState,
                provisionalWidth: nextWidth,
            };
        }

        this.setState(nextState);
    }

    /**
     * At the end of the resize, commit the provisional state previewed during resize events to state.
     */
    private onResizeEnd(): void {
        const { columnKey, onResize } = this.props;

        if (onResize) {
            onResize(columnKey, this.state.provisionalWidth);
        }

        this.setState({
            provisionalWidth: undefined,
        });
    }

    private getAllowedResizeDirection(
        expectedWidth: number,
        element: Element | null
    ): ResizeDirection {
        if (!element) {
            return ResizeDirection.BIGGER_OR_SMALLER;
        }

        if (expectedWidth <= Cell.MINIMUM_WIDTH) {
            return ResizeDirection.BIGGER;
        }

        return ResizeDirection.BIGGER_OR_SMALLER;
    }

    private resizeIsAllowed(deltaX: number, allowedResizeDirection: ResizeDirection): boolean {
        if (allowedResizeDirection === ResizeDirection.BIGGER_OR_SMALLER) {
            return true;
        }

        if (deltaX > 0 && allowedResizeDirection === ResizeDirection.BIGGER) {
            return true;
        }

        return false;
    }

    private getResizeClassName(allowedResizeDirection: ResizeDirection): string {
        switch (allowedResizeDirection) {
            case ResizeDirection.BIGGER:
                return styles.cursorResizeLargerOnly;
            case ResizeDirection.BIGGER_OR_SMALLER:
            // prettier-ignore
            default: // FALL-THROUGH
                return styles.cursorResizeEitherDirection;
        }
    }
}
