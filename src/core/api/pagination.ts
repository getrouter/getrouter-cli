/**
 * Fetches all pages from a paginated API endpoint.
 *
 * @param fetchPage - Function that fetches a single page given a pageToken
 * @param getItems - Function that extracts items from the response
 * @param getNextToken - Function that extracts the next page token from the response
 * @returns Array of all items across all pages
 */
export async function fetchAllPages<TResponse, TItem>(
  fetchPage: (pageToken?: string) => Promise<TResponse>,
  getItems: (response: TResponse) => TItem[],
  getNextToken: (response: TResponse) => string | undefined,
): Promise<TItem[]> {
  const allItems: TItem[] = [];
  let pageToken: string | undefined;

  do {
    const response = await fetchPage(pageToken);
    const items = getItems(response);
    allItems.push(...items);
    pageToken = getNextToken(response);
  } while (pageToken);

  return allItems;
}
