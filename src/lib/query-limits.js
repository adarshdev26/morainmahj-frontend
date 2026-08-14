/**
 * Row limit for queries that fetch related records for a whole set of parents in
 * one request — sessions for every league, RSVPs for every session, lessons for
 * every course, and so on.
 *
 * These used to be issued one request per parent id. They are now single requests
 * using an array filter value, which the API translates to `column = ANY(...)`.
 * That makes the default page size of 50 too small, so an explicit limit has to
 * be passed or the combined result would be silently truncated.
 */
export const RELATED_ROW_LIMIT = 500;
