import * as ts from "typescript";
import { getFirstJSDoc, hasJSDoc } from "./JSDocParser";
import { IDriver } from "./Model";
import {
  getClassTag,
  getName,
  stripTags,
  hasTag,
  removeTagText
} from "./Utils";

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
                const hasMaint = hasTag("#maintenanceAction", jsDoc.comment);
                const desc = hasMaint
                  ? removeTagText("#maintenanceAction", jsDoc.comment)
                  : jsDoc.comment;
                ret.capabilitiesOptions[capability] = {
                  title: { en: desc }
                };
                if (hasMaint) {
                  ret.capabilitiesOptions[capability].maintenanceAction = true;
                }
              }
            }
          }
        }
      }
    } else if (s.kind === ts.SyntaxKind.ClassDeclaration) {
      const clsDecl = s as ts.ClassDeclaration;
      if (!clsDecl || !(clsDecl as any).jsDoc) {
        console.error(
          `Failed to find description from class inside ${sourceFile.fileName}`
        );
        throw new Error(
          `Failed to find description from class inside ${sourceFile.fileName}`
        );
      }
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
      large: `/assets/drivers/${folder}/large.png`,
      small: `/assets/drivers/${folder}/small.png`
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
