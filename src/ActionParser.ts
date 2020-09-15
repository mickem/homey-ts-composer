import * as ts from "typescript";
import { IJSDoc } from "./JSDocParser";
import { IAction, IArgument, ILString, IToken } from "./Model";
import {
  cleanTsObj,
  fetchDescriptionFromComment,
  getDropdown,
  getExample,
  getName,
  getNameOrUnknown,
  hasDropdown,
  hasExample,
  IName,
  stripTags,
  hasDevice,
  getDevice
} from "./Utils";

/**
 * Parse all actions from an interface in a .ts source file
 * @param sourceFile the parsed source code
 */
export function processActions(sourceFile: ts.SourceFile): IAction[] {
  const interfaces = sourceFile.statements.filter(s => s.kind === ts.SyntaxKind.InterfaceDeclaration);

  const triggers = [];
  for (const s of sourceFile.statements) {
    if (s.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const cls = s as ts.InterfaceDeclaration;
      const id = getName((cls as any).name);
      const prefix = interfaces.length > 1 ? `${id}.` : '';
      for (const c of cls.members) {
        if (c.kind === ts.SyntaxKind.MethodSignature) {
          const member = parseMethod(prefix, (c as any) as IJSDocMethod);
          if (member) {
            triggers.push(member);
          }
        }
      }
      console.log(`Found ${triggers.length} in interface ${id}`);
    }
  }
  if (triggers.length > 0) {
    return triggers;
  }
console.error(`Failed to find any actions`);
  return [];
}

function parseMethod(prefix: string, member: IJSDocMethod): IAction {
  try {
    const jsDoc = member.jsDoc[0];
    const functionComment = jsDoc.comment;
    const result: IAction = {
      args: [],
      id: prefix + getName(member.name),
      title: {
        en: fetchDescriptionFromComment(functionComment)
      }
    };
    for (const p of member.parameters) {
      if (p.kind === ts.SyntaxKind.Parameter) {
        result.args = parseArguments(p, jsDoc);
      }
    }
    return result;
  } catch (error) {
    console.error(`Failed to parse ${getName(member.name)}: `, error);
  }
}

interface IJSDocMethod {
  jsDoc: IJSDoc[];
  name: IName;
  parameters: IParameter[];
}
export interface IParameter {
  name: IName;
  kind: number;
  type: {
    members: IArgumentTypeNode[];
  };
}
export function parseArguments(parameter: IParameter, jsDoc: IJSDoc): IToken[] {
  const baseName = getNameOrUnknown(parameter.name);
  const ret: IToken[] = [];
  try {
    for (const arg of parameter.type.members) {
      ret.push(parseArgument(arg, jsDoc));
    }
  } catch (error) {
    console.error(
      `Failed to parse ${baseName}: `,
      error,
      cleanTsObj(parameter)
    );
    throw new Error(`Failed to parse ${baseName}: ${error}`);
  }
  return ret;
}

export function parseDescription(name: string, jsDoc: IJSDoc): string {
  try {
    for (const tag of jsDoc.tags) {
      if (!tag.name || !tag.name.right) {
        console.error(
          `Failed to parse jsDoc of ${name} (missing name.right): `,
          cleanTsObj(tag)
        );
        throw new Error(
          `Failed to parse jsDoc of ${name} (missing name.right)`
        );
      }
      if (getName(tag.name.right) === name) {
        return tag.comment;
      }
    }
  } catch (error) {
    console.error(`Failed to parse jsDoc ${name}: `, error, jsDoc);
    throw new Error(`Failed to parse jsDoc ${name}: ${error}`);
  }
  console.error(
    `Failed to find jsdoc tag matching ${name}: `,
    cleanTsObj(jsDoc)
  );
  throw new Error(`Failed to find jsdoc tag matching ${name}`);
}
function makeDropDown(name: string, desc: string): IArgument {
  const values = getDropdown(desc);
  return {
    name,
    title: {
      en: stripTags(desc)
    },
    type: "dropdown",
    values: Object.keys(values).map((k: string) => ({
      id: k,
      label: { en: values[k] }
    }))
  };
}
function makeDevice(name: string, desc: string): IArgument {
  const device = getDevice(desc);
  return {
    filter: device.filter,
    name,
    title: {
      en: stripTags(desc)
    },
    type: "device",
  };
}
function makeString(
  name: string,
  type: string,
  desc: string,
  example: number | ILString | undefined
): IArgument {
  const ret: IArgument = {
    name,
    title: {
      en: desc
    },
    type
  };
  if (example) {
    ret.example = example;
  }
  return ret;
}
interface IArgumentTypeNode {
  name: {
    escapedText: string;
  };
  type: {
    kind: number;
  };
}
export function parseArgument(
  parameter: IArgumentTypeNode,
  jsDoc: IJSDoc
): IArgument {
  const name = getName(parameter.name);
  if (!parameter.type || !parameter.type.kind) {
    throw new Error(`Missing type in: ${name}`);
  }
  const type = getArgType(parameter.type ? parameter.type.kind : -1);
  try {
    const desc = parseDescription(name, jsDoc);
    if (hasDevice(desc)) {
      return makeDevice(name, desc);
    }
    if (hasDropdown(desc)) {
      return makeDropDown(name, desc);
    }
    const example = hasExample(desc) ? getExample(desc, type) : undefined;
    return makeString(name, type, stripTags(desc), example);
  } catch (error) {
    console.error(`Failed to parse ${name}: `, error, cleanTsObj(parameter));
    throw new Error(`Failed to parse ${name}: ${error}`);
  }
}

export function getArgType(kind: number) {
  if (kind === ts.SyntaxKind.StringKeyword) {
    return "text";
  }
  if (kind === ts.SyntaxKind.NumberKeyword) {
    return "number";
  }
  return "unknown";
}
