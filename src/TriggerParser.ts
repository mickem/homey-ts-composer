import * as ts from "typescript";
import { IToken, ITrigger, ILString } from "./Model";
import {
  cleanTsObj,
  fetchDescriptionFromComment,
  getExample,
  getName,
  getNameOrUnknown,
  IName,
  stripTags
} from "./Utils";

export function processTriggers(sourceFile: ts.SourceFile): ITrigger[] {
  for (const s of sourceFile.statements) {
    if (s.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const cls = s as ts.InterfaceDeclaration;
      const triggers = [];
      const id = getName(cls.name);
      for (const c of cls.members) {
        if (c.kind === ts.SyntaxKind.MethodSignature) {
          const member = parseMember((c as any) as IJSDocMethod);
          if (member) {
            triggers.push(member);
          }
        }
      }
      console.log(`Found ${triggers.length} in interface ${id}`);
      if (triggers.length > 0) {
        return triggers;
      }
    }
  }
  console.error(`Failed to find any triggers`);
  return [];
}

interface IJSDocTag {
  name: {
    right?: IName;
  };
  comment?: string;
}
interface IJSDoc {
  tags?: IJSDocTag[];
  comment?: string;
}
interface IJSDocMethod {
  jsDoc: IJSDoc[];
  name: IName;
  parameters: IParameter[];
}

function parseMember(member: IJSDocMethod): ITrigger {
  try {
    const jsDoc = member.jsDoc[0];
    const functionComment = jsDoc.comment;
    const result: ITrigger = {
      id: getName(member.name),
      title: {
        en: fetchDescriptionFromComment(functionComment)
      },
      tokens: []
    };
    for (const p of member.parameters) {
      if (p.kind === ts.SyntaxKind.Parameter) {
        result.tokens = parseArguments(p, jsDoc);
      }
    }
    return result;
  } catch (error) {
    console.error(`Failed to parse ${getName(member.name)}: `, error);
  }
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
function makeString(
  name: string,
  type: string,
  desc: string,
  example: ILString
) {
  return {
    example,
    name,
    title: {
      en: desc
    },
    type
  };
}
function makeNumber(name: string, type: string, desc: string, example: number) {
  return {
    example,
    name,
    title: {
      en: desc
    },
    type
  };
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
): IToken {
  const name = getName(parameter.name);
  if (!parameter.type || !parameter.type.kind) {
    throw new Error(`Missing type in: ${name}`);
  }
  const type = getParamType(parameter.type ? parameter.type.kind : -1);
  try {
    const desc = parseDescription(name, jsDoc);
    const example = getExample(desc, type);
    if (type === "string") {
      return makeString(name, type, stripTags(desc), example as ILString);
    } else {
      return makeNumber(name, type, stripTags(desc), example as number);
    }
  } catch (error) {
    console.error(`Failed to parse ${name}: `, error, cleanTsObj(parameter));
    throw new Error(`Failed to parse ${name}: ${error}`);
  }
}

function getParamType(kind: number): string {
  if (kind === ts.SyntaxKind.StringKeyword) {
    return "string";
  }
  if (kind === ts.SyntaxKind.NumberKeyword) {
    return "number";
  }
  return "unknown";
}
