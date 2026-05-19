import { describe, expect, it } from "vitest";
import { getPaginationWindow } from "@/components/session-explorer";

describe("session explorer pagination", () => {
  it("keeps large local result sets on a bounded visible page", () => {
    expect(getPaginationWindow(151, 1)).toEqual({
      totalPages: 4,
      currentPage: 1,
      start: 0,
      end: 50
    });
    expect(getPaginationWindow(151, 4)).toEqual({
      totalPages: 4,
      currentPage: 4,
      start: 150,
      end: 151
    });
    expect(getPaginationWindow(151, 99)).toMatchObject({
      totalPages: 4,
      currentPage: 4
    });
  });
});
