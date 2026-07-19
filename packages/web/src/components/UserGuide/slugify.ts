/**
 * Convert heading text to a URL-safe slug for use as section ID.
 *
 * Some sections aren't crucial enough to warrant especially stable slugs like the page slugs
 * so this is a simple slugify function that just lowercases, trims, and replaces spaces with hyphens.
 * Example: "Creating a Metadata File" -> "creating-a-metadata-file"
 */
export default function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
}
