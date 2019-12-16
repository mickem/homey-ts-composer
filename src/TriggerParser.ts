import * as ts from "typescript";
import { IToken, ITrigger } from "./Model";
import {
  fetchDescriptionFromComment,
  getExample,
  getName,
  stripTags
} from "./Utils";

export function processTriggers(sourceFile: ts.SourceFile): ITrigger[] {
  for (const s of sourceFile.statements) {
    if (s.kind === ts.SyntaxKind.ClassDeclaration) {
      const cls = s as ts.ClassDeclaration;
      const triggers = [];
      const id = getName(cls.name);
      for (const c of cls.members) {
        if (c.kind === ts.SyntaxKind.MethodDeclaration) {
          const member = parseMember(c as ts.MethodDeclaration);
          if (member) {
            triggers.push(member);
          }
        }
      }
      console.log(`Found ${triggers.length} in class ${id}`);
      if (triggers.length > 0) {
        return triggers;
      }
    }
  }
  console.error(`Failed to find any triggers`);
  return [];
}

function parseMember(member: ts.MethodDeclaration): ITrigger {
  try {
    if (!getName(member.name).startsWith("on")) {
      return;
    }
    const functionComment = member
      .getFullText()
      .substring(0, member.getStart() - member.getFullStart())
      .trim();
    const result: ITrigger = {
      id: getName(member.name).substring(2),
      title: {
        en: fetchDescriptionFromComment(functionComment)
      },
      tokens: []
    };
    for (const p of member.parameters) {
      if (p.kind === ts.SyntaxKind.Parameter) {
        result.tokens.push(
          parseParameter(p as ts.ParameterDeclaration, functionComment)
        );
      }
    }
    return result;
  } catch (error) {
    console.error(`Failed to parse ${getName(member.name)}: `, error);
  }
}

function parseParameter(
  parameter: ts.ParameterDeclaration,
  functionComment: string
): IToken {
  const name = getName(parameter.name);
  try {
    const key = `@param ${name}`;
    const pos = functionComment.indexOf(key);
    let title = "";
    if (pos !== -1) {
      const pos2 = functionComment.indexOf("\n", pos);
      if (pos2 !== -1) {
        title = functionComment.substring(pos + key.length, pos2).trim();
      }
    }
    const type = getParamType(parameter.type.kind);
    if (type === "unknown") {
      console.log(parameter.type);
    }
    return {
      example: getExample(title, type),
      name,
      title: {
        en: stripTags(title)
      },
      type
    };
  } catch (error) {
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
