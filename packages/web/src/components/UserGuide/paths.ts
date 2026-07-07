/** Base route for the in-app user guide. */
export const USER_GUIDE_BASE = "/user-guide";

/** Build the route to a specific user guide page. */
export function userGuidePath(groupSlug: string, pageSlug: string): string {
    return `${USER_GUIDE_BASE}/${groupSlug}/${pageSlug}`;
}
