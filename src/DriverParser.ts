import * as ts from "typescript";
import { IDriver, ILString } from "./Model";
import { getClassTag, getName, stripTags } from "./Utils";
import { hasJSDoc, getFirstJSDoc } from "./JSDocParser";

/**
 * Parse all actions from an interface in a .ts source file
 * @param sourceFile the parsed source code
 */
export function processDriver(
  folder: string,
  sourceFile: ts.SourceFile,
  baseline: IDriver
): IDriver {
  const ret = baseline;
  if (!ret.capabilities) {
    ret.capabilities = [];
  }
  for (const s of sourceFile.statements) {
    if (s.kind === ts.SyntaxKind.VariableStatement) {
      const varr = (s as any) as ts.VariableStatement;
      delete s.parent;
      for (const d of varr.declarationList.declarations) {
        if (getName(d.name) === "capabilities") {
          for (const p of (d.initializer as ts.ObjectLiteralExpression)
            .properties) {
            const varInit = (p as any) as ts.VariableDeclaration;
            const capability = ((varInit.initializer as any) as ts.LiteralLikeNode)
              .text;
            if (!ret.capabilities.includes(capability)) {
              ret.capabilities.push(capability);
              if (hasJSDoc(p)) {
                const jsDoc = getFirstJSDoc(p);
                if (!ret.capabilitiesOptions) {
                  ret.capabilitiesOptions = {};
                }
                ret.capabilitiesOptions[capability] = { title: { en: jsDoc.comment } };
              }
            }
          }
        }
      }
    } else if (s.kind === ts.SyntaxKind.ClassDeclaration) {
      const clsDecl = s as ts.ClassDeclaration;
      const jsDoc = (clsDecl as any).jsDoc[0] as IJSDoc;
      if (!ret.name) {
        ret.name = {
          en: stripTags(jsDoc.comment)
        };
      }
      if (!ret.class) {
        ret.class = getClassTag(jsDoc.comment);
      }
    }
  }
  console.log(`Found driver ${folder}`);
  if (!ret.images) {
    ret.images = {
      large: `/drivers/${folder}/assets/images/large.png`,
      small: `/drivers/${folder}/assets/images/small.png`
    };
  }
  if (!ret.id) {
    ret.id = folder;
  }
  return ret;
}

interface IJSDoc {
  comment?: string;
}
