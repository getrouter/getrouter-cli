import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "../../../src/core/api/pagination";

type PageResponse = {
  items: number[];
  nextPageToken: string | undefined;
};

describe("fetchAllPages", () => {
  it("fetches single page when no next token", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      items: [1, 2, 3],
      nextPageToken: undefined,
    });

    const result = await fetchAllPages<PageResponse, number>(
      fetchPage,
      (res) => res.items,
      (res) => res.nextPageToken,
    );

    expect(result).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(undefined);
  });

  it("fetches multiple pages", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        items: [1, 2],
        nextPageToken: "page2",
      })
      .mockResolvedValueOnce({
        items: [3, 4],
        nextPageToken: "page3",
      })
      .mockResolvedValueOnce({
        items: [5],
        nextPageToken: undefined,
      });

    const result = await fetchAllPages<PageResponse, number>(
      fetchPage,
      (res) => res.items,
      (res) => res.nextPageToken,
    );

    expect(result).toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "page2");
    expect(fetchPage).toHaveBeenNthCalledWith(3, "page3");
  });

  it("returns empty array when first page is empty", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      items: [],
      nextPageToken: undefined,
    });

    const result = await fetchAllPages<PageResponse, number>(
      fetchPage,
      (res) => res.items,
      (res) => res.nextPageToken,
    );

    expect(result).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("stops when nextPageToken is empty string", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({
      items: [1],
      nextPageToken: "",
    });

    const result = await fetchAllPages<PageResponse, number>(
      fetchPage,
      (res) => res.items,
      (res) => res.nextPageToken || undefined,
    );

    expect(result).toEqual([1]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
