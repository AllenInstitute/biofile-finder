interface JSONReadyRange {
    start: number;
    end: number;
}

/**
 * An immutable, continuous range of numbers, inclusive of its bounds.
 */
export default class NumericRange {
    private readonly min: number;
    private readonly max: number;

    /**
     * Given variable number of ranges, reduce them to their most compact representation.
     */
    public static compact(...ranges: NumericRange[]): NumericRange[] {
        if (!ranges.length) {
            return [];
        }

        let compacted: NumericRange[] = [ranges[0]];
        for (const range of ranges) {
            compacted = compacted.reduce((accum, range2) => {
                if (range.equals(range2) || range.abuts(range2) || range.intersects(range2)) {
                    return [
                        ...accum.filter((r) => !r.equals(range) && !r.equals(range2)),
                        range.union(range2),
                    ];
                }

                return [...accum.filter((r) => !r.equals(range)), range];
            }, compacted);
        }

        return compacted;
    }

    public static fromRange(range: NumericRange): NumericRange {
        return new NumericRange(range.from, range.to);
    }

    public static isNumericRange(candidate: any): candidate is NumericRange {
        return candidate instanceof NumericRange;
    }

    public constructor(fromInclusive: number, toInclusive: number) {
        this.min = Math.min(fromInclusive, toInclusive);
        this.max = Math.max(fromInclusive, toInclusive);
    }

    public get from(): number {
        return this.min;
    }

    public get to(): number {
        return this.max;
    }

    /**
     * Used to answer the question: can this range instance be extended to include `element` without
     * including any other numbers.
     * E.g. Both 4 and 11 directly abut the range 5 - 10. 3 and 12 do not. Range bounds (5 and 10) do not abut themselves.
     */
    public abuts(element: number | NumericRange): boolean {
        if (NumericRange.isNumericRange(element)) {
            return this.abuts(element.min) || this.abuts(element.max);
        }
        return this.min - element === 1 || element - this.max === 1;
    }

    /**
     * Does this range contain the given element or wholly encompass another range?
     */
    public contains(element: number | NumericRange): boolean {
        if (NumericRange.isNumericRange(element)) {
            return this.contains(element.from) && this.contains(element.to);
        }

        return this.min <= element && this.max >= element;
    }

    public equals(other: NumericRange): boolean {
        if (other === this) {
            return true;
        }

        return this.from === other.from && this.to === other.to;
    }

    public expandTo(element: number): NumericRange {
        if (element > this.max) {
            return new NumericRange(this.min, element);
        }

        if (element < this.min) {
            return new NumericRange(element, this.max);
        }

        return NumericRange.fromRange(this);
    }

    public intersects(other: NumericRange): boolean {
        return (
            (this.min <= other.min && this.max >= other.min) ||
            (other.min <= this.min && other.max >= this.min)
        );
    }

    /**
     * Split a range into two discontinuous ranges at a particular point (exclusive of that point).
     *      E.g.: NumericRange(0, 100).partitionAt(50) -> [NumericRange(0, 49), NumericRange(51, 100)]
     * If given a partitionPoint that is at the bounds of the range, the range is shrunk.
     *      E.g.: NumericRange(0, 100).partitionAt(100) -> [NumericRange(0, 99)]
     */
    public partitionAt(partitionPoint: number): NumericRange[] {
        if (this.min === this.max) {
            throw new Error(
                `Unable to partition ${this} about ${partitionPoint}: NumericRange too small.`
            );
        }

        if (!this.contains(partitionPoint)) {
            throw new Error(`${partitionPoint} must be contained within ${this}`);
        }

        if (partitionPoint === this.min) {
            return [new NumericRange(this.min + 1, this.max)];
        }

        if (partitionPoint === this.max) {
            return [new NumericRange(this.min, this.max - 1)];
        }

        return [
            new NumericRange(this.min, partitionPoint - 1),
            new NumericRange(partitionPoint + 1, this.max),
        ];
    }

    public toJSON(): JSONReadyRange {
        return {
            start: this.min,
            end: this.max,
        };
    }

    public toString(): string {
        return `<NumericRange(from: ${this.min}, to: ${this.max})>`;
    }

    public union(other: NumericRange) {
        return new NumericRange(Math.min(other.min, this.min), Math.max(other.max, this.max));
    }
}
