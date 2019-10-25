import * as classNames from "classnames";
import Interactable from "@interactjs/core/Interactable"; // unfortunately necessary for the typings
import InteractEvent from "@interactjs/core/InteractEvent"; // unfortunately necessary for the typings
import interact from "interactjs";
import * as React from "react";

const styles = require("./Cell.module.css");

export interface CellProps {
    columnKey: string;
    onResize?: (columnKey: string, deltaX?: number) => void;
    width?: number;
}

interface CellState {
    containerClassName: string;
}

/**
 * Akin to a cell within a spreadsheet, this represents a position within an x/y grid. A cell can either be resizable or
 * not resizable--this is determined by whether `props.onResize` is provided. If the cell is resizable, a user can reset
 * the width to its default by double clicking the cell.
 */
export default class Cell extends React.Component<CellProps, CellState> {
    public static MINIMUM_WIDTH = 32; // px; somewhat arbitrary, but tied to 2 * padding.

    public state: CellState = {
        containerClassName: styles.cursorDefault,
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
        return (
            <div
                ref={this.cell}
                className={classNames(styles.resizableCell, this.state.containerClassName)}
                onDoubleClick={this.onDoubleClick}
                style={{ width: this.props.width }}
            >
                {this.props.children}
                <span className={styles.resizeTarget} ref={this.resizeTarget}>
                    |
                </span>
            </div>
        );
    }

    private renderNonResizeableCell(): JSX.Element {
        return (
            <div className={styles.cell} style={{ width: this.props.width }}>
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

    private onResizeStart(): void {
        this.setState({
            containerClassName: styles.cursorResize,
        });
    }

    /**
     * At each resize step, capture the change in the x direction of the column width. Will stop calling onResize
     * handler when the delta would cause the cell to become smaller than Cell.MINIMUM_WIDTH.
     */
    private onResize(e: InteractEvent): void {
        const { columnKey, onResize, width } = this.props;

        if (onResize) {
            if (width !== undefined && width + e.dx >= Cell.MINIMUM_WIDTH) {
                onResize(columnKey, e.dx);
            }
        }
    }

    private onResizeEnd(): void {
        this.setState({
            containerClassName: styles.cursorDefault,
        });
    }
}
