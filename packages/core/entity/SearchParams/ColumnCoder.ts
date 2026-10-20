// Somewhat arbitrary default column width in pixels;
// used as a fallback when calculating column widths based on content,
// and as the default width when resetting column widths
export const DEFAULT_COLUMN_WIDTH = 150;
export const MINIMUM_COLUMN_WIDTH = 50; // px; somewhat arbitrary;

// Used to indicate that we're using an annotation's prefix substring instead of its full name
export const PREFIX_MARKER = "~";
const isWhitespace = (c: string) => /\s/u.test(c);

export interface Column {
    name: string;
    width: number; // width in pixels
}

// Reduces a string to its simpler, canonical form using Unicode Normalization
export function normalizeString(s: string): string {
    return s.normalize("NFC").toLowerCase();
}

interface TreeNode {
    children: Map<string, TreeNode>;
}

function buildPathTree(paths: string[][]): TreeNode {
    const root: TreeNode = { children: new Map() };
    for (const path of paths) {
        let node = root;
        for (const segment of path) {
            if (!node.children.has(segment)) {
                node.children.set(segment, { children: new Map() });
            }
            node = node.children.get(segment) as TreeNode;
        }
    }
    return root;
}

export default class ColumnCoder {
    private static readonly COLUMN_DELIMITER = ",";
    private static readonly VALUE_DELIMITER = ":";
    private static readonly COLUMN_VALUE_PRECISION = 10; // The divisor used when encoding column widths to shorten the resulting URL; this is an arbitrary choice to balance URL length with precision of column widths
    // Arbitrary URL length limit; default columns beyond this regenerate on load anyway
    private static readonly DEFAULT_COLUMN_LIMIT = 6;

    public static encode(
        columns: Column[],
        areColumnsUserSelected = false,
        prefixes?: Map<string, string>
    ): string {
        const candidateColumns = columns
            // Encode width as divided by COLUMN_VALUE_PRECISION to shorten the resulting URL;
            // this is an arbitrary choice to balance URL length with precision of column widths
            .map((column) => {
                const name = prefixes?.get(column.name) ?? column.name;
                return `${name}${ColumnCoder.VALUE_DELIMITER}${Math.ceil(
                    column.width / ColumnCoder.COLUMN_VALUE_PRECISION
                )}`;
            })
            .slice(0, areColumnsUserSelected ? columns.length : ColumnCoder.DEFAULT_COLUMN_LIMIT);
        return candidateColumns.join(ColumnCoder.COLUMN_DELIMITER);
    }

    public static decode(encoded: string): Column[] {
        return encoded
            .split(ColumnCoder.COLUMN_DELIMITER)
            .filter((unparsedColumn) => !!unparsedColumn)
            .map((unparsedColumn) => {
                const [name, widthAsStr] = unparsedColumn.split(ColumnCoder.VALUE_DELIMITER);
                const parsedWidth = parseFloat(widthAsStr);
                // The column width was previously encoded as a number between 0 and 1 representing the percentage of available
                // space the column should take up, but this was difficult to work with and unintuitive for users.
                // Now we encode the actual pixel width, which is more straightforward to understand and work with when manually editing URLs.
                // To maintain backwards compatibility with existing URLs, we continue to support previously encoded widths as percentages,
                // but we default them to a default column width in pixels in the decoding process.
                // Also, multiply the parsedWidth by COLUMN_VALUE_PRECISION because it is encoded as the actual width divided by COLUMN_VALUE_PRECISION to
                // shorten the resulting URL; this is an arbitrary choice to balance URL length with precision of column widths.
                const width =
                    parsedWidth <= 1
                        ? DEFAULT_COLUMN_WIDTH
                        : parsedWidth * ColumnCoder.COLUMN_VALUE_PRECISION;
                return { name, width };
            });
    }

    public static buildPrefixesFromFullPaths(paths: string[][]): Map<string, string> {
        const prefixMap = new Map<string, string>();
        if (!paths.length) return prefixMap;

        // Tree walk through nested annotation paths
        const treeWalk = (node: TreeNode, path: string[], segmentPrefixes: string[]) => {
            if (node.children.size === 0) {
                // at leaf
                const fullAnnotationName = path.join(".");
                // To do: Will have dots in annotation names cause problems?
                prefixMap.set(fullAnnotationName, segmentPrefixes.join("."));
                return;
            }
            const siblingPrefixes = ColumnCoder.buildColumnPrefixes([...node.children.keys()]);
            for (const [segment, child] of node.children) {
                treeWalk(
                    child,
                    [...path, segment],
                    [...segmentPrefixes, siblingPrefixes.get(segment) as string]
                );
            }
        };

        treeWalk(buildPathTree(paths), [], []);
        return prefixMap;
    }

    // Given a list of annotation names/segments (e.g., "Dose" in "Well.Dose.Unit"), return a map of uniquely identifiable string prefixes
    public static buildColumnPrefixes(names: string[]): Map<string, string> {
        // Map annotation names to normalized/shortened versions and sort alphabetically
        const sortedEntries = names
            .map((name) => {
                return {
                    name,
                    chars: [...normalizeString(name)],
                };
            })
            .sort((a, b) => (a.chars.join("") < b.chars.join("") ? -1 : 1));

        const leastCommonPrefix = (a: string[], b: string[]) => {
            let index = 0;
            while (index < a.length && index < b.length && a[index] === b[index]) index++;
            return index;
        };

        const prefixMap = new Map<string, string>();

        sortedEntries.forEach((entry, i) => {
            const previousNeighborLCP =
                i > 0 ? leastCommonPrefix(entry.chars, sortedEntries[i - 1].chars) : 0;
            const nextNeighborLCP =
                i < sortedEntries.length - 1
                    ? leastCommonPrefix(entry.chars, sortedEntries[i + 1].chars)
                    : 0;
            // Shortest unique prefix for each annotation is whichever neighbor's LCP is longer + 1
            let uniquePrefixLength = Math.max(previousNeighborLCP, nextNeighborLCP) + 1;
            // Avoid ending on a whitespace character
            while (
                uniquePrefixLength < entry.chars.length &&
                isWhitespace(entry.chars[uniquePrefixLength - 1])
            ) {
                uniquePrefixLength++;
            }

            // If unique prefix length + PREFIX_MARKER is >= the actual annotation length, just use the full name.
            // Otherwise, indicate it's a prefix with PREFIX_MARKER
            const uniquePrefix =
                uniquePrefixLength + 1 >= entry.chars.length
                    ? entry.name
                    : `${entry.chars.slice(0, uniquePrefixLength).join("")}${PREFIX_MARKER}`;
            prefixMap.set(entry.name, uniquePrefix);
        });

        return prefixMap;
    }

    /**
     * Builds a tree of annotation paths and creates a function to resolve column prefixes.
     * Only gets called once each time a set of annotations are loaded from a data source
     * @param paths
     * @returns a function that maps a column prefix back to full annotation name
     */
    public static createPrefixResolver(paths: string[][]): (prefix: string) => string | undefined {
        const root = buildPathTree(paths);
        const fullNames = new Set(paths.map((path) => path.join(".")));

        const prefixResolver = (prefix: string) => {
            // not shortened; already a full name
            if (fullNames.has(prefix)) return prefix;

            let current = root;
            const nameSoFar: string[] = [];

            for (const part of prefix.split(".")) {
                let match: string | undefined;
                if (current.children.has(part)) {
                    // used full name
                    match = part;
                } else if (part.endsWith(PREFIX_MARKER)) {
                    const trimmedPrefix = part.slice(0, -PREFIX_MARKER.length);
                    const hits = trimmedPrefix
                        ? [...current.children.keys()].filter((segment) => {
                              return normalizeString(segment).startsWith(trimmedPrefix);
                          })
                        : [];
                    if (hits.length === 1) match = hits[0];
                    else if (hits.length > 1) {
                        console.warn(
                            `Cannot resolve prefix "${part}" to a single annotation. Found multiple potential matches: ${hits.join(", ")}`
                        );
                        return undefined;
                    }
                }

                // Don't try to guess if ambiguous
                if (match === undefined) {
                    console.warn(`Failed to find an annotation matching prefix "${part}".`);
                    return undefined;
                }
                nameSoFar.push(match);
                current = current.children.get(match) as TreeNode;
            }
            return nameSoFar.join("."); // to do: Do we need to check if the node is a leaf? can a column be anything other than a leaf?
        };

        return prefixResolver;
    }
}
