import * as ts from "typescript";
import {
  getArgType,
  IParameter,
  parseArgument,
  parseArguments,
  parseDescription,
  processActions
} from "../ActionParser";
import { parseCode } from "../Utils";

describe("full example", () => {
  const code = `
    export interface IActionHandler {
        /**
         * Set the maximum or minimum temperature bounds
         * @param args.type the type of bound to set #dropdown:{"min":"Minimum", "max":"Maximum"}
         * @param args.temperature $common.temperature
         */
        SetTemperatureBounds(args: { type: string; temperature: number }): boolean;
        /**
         * Set the mode for a given zone
         * @param args.zone $common.zone
         * @param args.mode mode #dropdown:{"disabled":"Disabled", "enabled":"Enabled", "monitored":"Monitored"}
         */
        SetZoneMode(args: { zone: string; mode: string }): boolean;
      }
    `;
  test("should parse correctly", () => {
    expect(processActions(parseCode(code))).toEqual([
      {
        args: [
          {
            name: "type",
            title: { en: "the type of bound to set" },
            type: "dropdown",
            values: [
              { id: "min", label: { en: "Minimum" } },
              { id: "max", label: { en: "Maximum" } }
            ]
          },
          {
            name: "temperature",
            title: { en: "$common.temperature" },
            type: "number"
          }
        ],
        id: "SetTemperatureBounds",
        title: { en: "Set the maximum or minimum temperature bounds" }
      },
      {
        args: [
          { name: "zone", title: { en: "$common.zone" }, type: "text" },
          {
            name: "mode",
            title: { en: "mode" },
            type: "dropdown",
            values: [
              { id: "disabled", label: { en: "Disabled" } },
              { id: "enabled", label: { en: "Enabled" } },
              { id: "monitored", label: { en: "Monitored" } }
            ]
          }
        ],
        id: "SetZoneMode",
        title: { en: "Set the mode for a given zone" }
      }
    ]);
  });
});

describe("getArgType", () => {
  test("strings", () => {
    expect(getArgType(ts.SyntaxKind.StringKeyword)).toEqual("text");
  });
  test("numbers", () => {
    expect(getArgType(ts.SyntaxKind.NumberKeyword)).toEqual("number");
  });
  test("others", () => {
    expect(getArgType(ts.SyntaxKind.BooleanKeyword)).toEqual("unknown");
  });
});

describe("parseArgument", () => {
  const parameter = {
    name: {
      escapedText: "the name"
    },
    type: {
      kind: ts.SyntaxKind.StringKeyword
    }
  };
  const jsDoc = {
    tags: [
      {
        comment: "comment",
        name: {
          right: {
            escapedText: "the name"
          }
        }
      }
    ]
  };
  test("should work", () => {
    expect(parseArgument(parameter, jsDoc)).toEqual({
      name: "the name",
      title: { en: "comment" },
      type: "text"
    });
  });
  test("missing name should throw", () => {
    const param = { ...parameter };
    delete param.name;
    expect(() => parseArgument(param, jsDoc)).toThrow(
      /Failed to parse name from null.*/
    );
  });
  test("missing type should throw", () => {
    const param = { ...parameter };
    delete param.type;
    expect(() => parseArgument(param, jsDoc)).toThrow(
      /Missing type in: the name/
    );
  });
  test("missing jsDoc should throw", () => {
    expect(() => parseArgument(parameter, { tags: [] })).toThrow(
      /Failed to parse the name.*/
    );
  });
  test("dropdpwn should work", () => {
    const lJsDoc = { ...jsDoc };
    lJsDoc.tags[0].comment = ' comment #dropdown:{"a":"b","c":"d"}';
    expect(parseArgument(parameter, lJsDoc)).toEqual({
      name: "the name",
      title: { en: "comment" },
      type: "dropdown",
      values: [
        { id: "a", label: { en: "b" } },
        { id: "c", label: { en: "d" } }
      ]
    });
  });
});

describe("parseDescription", () => {
  const jsDoc = {
    tags: [
      {
        comment: "comment",
        name: {
          right: {
            escapedText: "the name"
          }
        }
      }
    ]
  };
  test("should work", () => {
    expect(parseDescription("the name", jsDoc)).toEqual("comment");
  });
  test("missing jstag name should throw", () => {
    const lJsDoc = { ...jsDoc };
    delete lJsDoc.tags[0].name.right;
    expect(() => parseDescription("the name", lJsDoc)).toThrow(
      /Failed to parse jsDoc the name:.*/
    );
  });
});

describe("parseArguments", () => {
  const param: IParameter = {
    kind: ts.SyntaxKind.Parameter,
    name: {
      escapedText: "name"
    },
    type: {
      members: [
        {
          name: {
            escapedText: "foo"
          },
          type: {
            kind: ts.SyntaxKind.StringKeyword
          }
        }
      ]
    }
  };
  const jsDoc = {
    tags: [
      {
        comment: "comment",
        name: {
          right: {
            escapedText: "foo"
          }
        }
      }
    ]
  };
  test("should work", () => {
    expect(parseArguments(param, jsDoc)).toEqual([
      { name: "foo", title: { en: "comment" }, type: "text" }
    ]);
  });
  test("missing jsdoc tag should throw", () => {
    const lJjsDoc = { ...jsDoc };
    lJjsDoc.tags[0].name.right.escapedText = "bar";
    expect(() => parseArguments(param, jsDoc)).toThrow(
      /Failed to parse name:.*/
    );
  });
});
