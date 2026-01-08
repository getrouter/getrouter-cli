import { describe, expect, it } from "vitest";
import { renderTable } from "../../src/core/output/table";

describe("table renderer", () => {
  it("renders headers and rows with alignment", () => {
    const out = renderTable(
      ["ID", "NAME"],
      [
        ["1", "alpha"],
        ["2", "beta"],
      ],
    );
    expect(out).toContain("ID");
    expect(out).toContain("NAME");
    expect(out).toContain("alpha");
  });

  it("truncates long cells", () => {
    const out = renderTable(["ID"], [["0123456789ABCDEFGHIJ"]], {
      maxColWidth: 8,
    });
    expect(out).toContain("01234...");
  });

  it("fills empty with dash", () => {
    const out = renderTable(["ID"], [[""]]);
    expect(out).toContain("-");
  });
});
