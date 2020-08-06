import * as classNames from "classnames";
import Interactable from "@interactjs/core/Interactable"; // unfortunately necessary for the typings
import InteractEvent from "@interactjs/core/InteractEvent"; // unfortunately necessary for the typings
import interact from "interactjs";
import * as React from "react";

const styles = require("./Cell.module.css");

export interface CellProps {
    className?: string;
    columnKey: string;
    onResize?: (columnKey: string, deltaX?: number) => void;
    width: number; // percentage of parent element's width, a number between 0 and 1.
}

interface CellState {
    containerClassName?: string;
    provisionalWidth?: number;
    resizeTargetClassName: string;
}

enum ResizeDirection {
    BIGGER_OR_SMALLER,
    BIGGER,
    SMALLER,
}

/**
 * Akin to a cell within a spreadsheet, this represents a position within an x/y grid. A cell can either be resizable or
 * not resizable--this is determined by whether `props.onResize` is provided. If the cell is resizable, a user can reset
 * the width to its default by double clicking the cell.
 */
export default class Cell extends React.Component<CellProps, CellState> {
    public static MINIMUM_WIDTH = 32; // px; somewhat arbitrary, but tied to 2 * padding.

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
        const widthPercent = (provisionalWidth || width) * 100;
        const resizeTargetClassNames = classNames(styles.resizeTarget, resizeTargetClassName);

        return (
            <div
                ref={this.cell}
                className={classNames(styles.resizableCell, containerClassName, className)}
                onDoubleClick={this.onDoubleClick}
                style={{
                    flexBasis: `${widthPercent}%`,
                    minWidth: Cell.MINIMUM_WIDTH,
                }}
            >
                {this.props.children}
                <span className={resizeTargetClassNames} ref={this.resizeTarget}>
                    |
                </span>
            </div>
        );
    }

    private renderNonResizeableCell(): JSX.Element {
        return (
            <div
                className={classNames(styles.cell, this.props.className)}
                style={{ width: `${this.props.width * 100}%` }}
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

    private getRowWidth() {
        if (!this.cell.current) {
            return 1;
        }

        return this.cell.current.parentElement?.clientWidth || 1;
    }

    /**
     * On start of resize, set expectations for what the user can do.
     */
    private onResizeStart(e: InteractEvent): void {
        const { width } = this.props;
        const allowedResizeDirection = this.getAllowedResizeDirection(width, e.target);

        this.setState({
            containerClassName: styles.resizing,
            resizeTargetClassName: this.getResizeClassName(allowedResizeDirection),
        });
    }

    /**
     * At each resize step, determine if the resize is allowed.
     */
    private onResize(e: InteractEvent): void {
        const { provisionalWidth } = this.state;

        const widthPercent = e.rect.width / this.getRowWidth();
        const allowedResizeDirection = this.getAllowedResizeDirection(widthPercent, e.target);

        let nextState: CellState = {
            resizeTargetClassName: this.getResizeClassName(allowedResizeDirection),
        };

        const dx = widthPercent - (provisionalWidth || widthPercent);
        if (this.resizeIsAllowed(dx, allowedResizeDirection)) {
            nextState = {
                ...nextState,
                provisionalWidth: widthPercent,
            };
        }

        this.setState(nextState);
    }

    /**
     * At the end of the resize, clear out intermediate state to return this to being a controlled component.
     */
    private onResizeEnd(): void {
        const { columnKey, onResize } = this.props;

        if (onResize) {
            onResize(columnKey, this.state.provisionalWidth);
        }

        this.setState({
            containerClassName: undefined,
            provisionalWidth: undefined,
        });
    }

    private getAllowedResizeDirection(
        widthPercent: number,
        element: Element | null
    ): ResizeDirection {
        if (!element) {
            return ResizeDirection.BIGGER_OR_SMALLER;
        }

        const parentWidth = this.getRowWidth();
        const expectedWidth = widthPercent * parentWidth;
        const siblingWidth = element.nextElementSibling?.clientWidth || Cell.MINIMUM_WIDTH;
        const siblingCanShrink = siblingWidth > Cell.MINIMUM_WIDTH;

        if (expectedWidth <= Cell.MINIMUM_WIDTH && siblingCanShrink) {
            return ResizeDirection.BIGGER;
        }

        // make sure its sibling to the right is at least MINIMUM_WIDTH
        if (expectedWidth > Cell.MINIMUM_WIDTH && !siblingCanShrink) {
            return ResizeDirection.SMALLER;
        }

        return ResizeDirection.BIGGER_OR_SMALLER;
    }

    private resizeIsAllowed(deltaX: number, allowedResizeDirection: ResizeDirection): boolean {
        if (allowedResizeDirection === ResizeDirection.BIGGER_OR_SMALLER) {
            return true;
        }

        if (deltaX < 0 && allowedResizeDirection === ResizeDirection.SMALLER) {
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
            case ResizeDirection.SMALLER:
                return styles.cursorResizeSmallerOnly;
            case ResizeDirection.BIGGER_OR_SMALLER:
            default:
                // FALL-THROUGH
                return styles.cursorResizeEitherDirection;
        }
    }
}
