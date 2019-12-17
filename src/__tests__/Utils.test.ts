import {
  cleanTsObj,
  fetchDescriptionFromComment,
  getDropdown,
  getExample,
  getName,
  getNameOrUnknown,
  hasDropdown,
  hasExample,
  stripTags
} from "../Utils";

describe("Test getName", () => {
  test("Should work", () => {
    expect(getName({ escapedText: "text" })).toEqual("text");
  });
  test("Should throw on invalid input", () => {
    expect(() => getName(undefined)).toThrow(
      "Failed to parse name from null value"
    );
    expect(() => getName({})).toThrow("Failed to parse name from null value");
  });
});

describe("Test getNameOrUnknown", () => {
  test("Should work", () => {
    expect(getNameOrUnknown({ escapedText: "text" })).toEqual("text");
  });
  test("Should return unknown on invalid input", () => {
    expect(getNameOrUnknown(undefined)).toEqual("unknown");
    expect(getNameOrUnknown({})).toEqual("unknown");
  });
});

describe("Test cleanTsObj", () => {
  test("Should remove parent object", () => {
    expect(cleanTsObj({ keep: 42, parent: "dont keep" })).toEqual({ keep: 42 });
  });
  test("Should ignore missing parent", () => {
    expect(cleanTsObj({ keep: 42 })).toEqual({ keep: 42 });
  });
});

describe("Test getName", () => {
  test("Should remove return descriptions", () => {
    expect(fetchDescriptionFromComment("this is a comment")).toEqual(
      "this is a comment"
    );
  });
  test("Should stop on @param", () => {
    expect(fetchDescriptionFromComment("this is a comment  @param")).toEqual(
      "this is a comment"
    );
  });
  test("Should trim strings", () => {
    expect(
      fetchDescriptionFromComment(
        "     \n\n \t\t this is a comment     \n\n \t\t     "
      )
    ).toEqual("this is a comment");
  });
  test("Should ignore leading comments", () => {
    expect(
      fetchDescriptionFromComment("///*****//this is a comment  @param")
    ).toEqual("this is a comment");
  });
  test("Should ignore ending comments", () => {
    expect(fetchDescriptionFromComment("this is a comment  *****")).toEqual(
      "this is a comment"
    );
  });
});

describe("Test hasExample", () => {
  test("#sample should be found", () => {
    expect(hasExample("dont keep #sample:foo bar")).toBeTruthy();
  });
  test("missing #sample should be false", () => {
    expect(hasExample("dont keep")).toBeFalsy();
  });
});

describe("Test getExample", () => {
  test("should return value of", () => {
    expect(getExample("dont keep #sample:foo bar", "string")).toEqual({
      en: "foo bar"
    });
  });
  test("numbers should be numbers", () => {
    expect(getExample("dont keep #sample:42", "number")).toEqual(42);
  });
  test("missing tag should throw", () => {
    expect(() => getExample("dont keep", "string")).toThrow(
      "Missing example tag #sample: in dont keep"
    );
  });
});

describe("Test hasDropdown", () => {
  test("#dropdown should be found", () => {
    expect(hasDropdown("dont keep #dropdown:foo bar")).toBeTruthy();
  });
  test("missing #dropdown should be false", () => {
    expect(hasDropdown("dont keep")).toBeFalsy();
  });
});

describe("Test getDropdown", () => {
  test("should return value of", () => {
    expect(getDropdown('dont keep #dropdown:{"foo":"bar"}')).toEqual({
      foo: "bar"
    });
  });
  test("missing tag should throw", () => {
    expect(() => getDropdown("dont keep")).toThrow(
      "Missing example tag #dropdown: in dont keep"
    );
  });
  test("invalid json should throw", () => {
    expect(() => getDropdown('dont keep #dropdown:{"foo":"bar"')).toThrow(
      "Failed to parse"
    );
  });
});

describe("Test stripTags", () => {
  test("no tags should be ignored", () => {
    expect(stripTags("  keep  ")).toEqual("  keep  ");
  });
  test("#dropdown should stripped", () => {
    expect(stripTags("keep #dropdown:ignore")).toEqual("keep");
  });
  test("#sample should stripped", () => {
    expect(stripTags("keep #sample:ignore")).toEqual("keep");
  });
  test("ALl tags should be removed", () => {
    expect(stripTags("keep #sample:ignore #dropdown:ignore")).toEqual("keep");
  });
});
