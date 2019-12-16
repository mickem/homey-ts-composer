import * as ts from "typescript";
import { IAction, IArgument, IToken } from "./Model";
import {
    cleanTsObj,
    fetchDescriptionFromComment,
    getDropdown,
    getName,
    getNameOrUnknown,
    hasDropdown,
    stripTags,
} from "./Utils";

/**
 * Parse all actions from an interface in a .ts source file
 * @param sourceFile the parsed source code
 */
export function processActions(sourceFile: ts.SourceFile): IAction[] {
    for (const s of sourceFile.statements) {
        if (s.kind === ts.SyntaxKind.InterfaceDeclaration) {
            const cls = s as ts.InterfaceDeclaration;
            const triggers = [];
            const id = getName(cls.name);
            for (const c of cls.members) {
                if (c.kind === ts.SyntaxKind.MethodSignature) {
                    const member = parseMethod((c as any) as IJSDocMethod);
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
    console.error(`Failed to find any actions`);
    return [];
}

interface IJSDocMethod extends ts.MethodDeclaration {
    jsDoc: ts.JSDoc[];
}

function parseMethod(member: IJSDocMethod): IAction {
    try {
        const jsDoc = member.jsDoc[0];
        const functionComment = jsDoc.comment;
        const result: IAction = {
            args: [],
            id: getName(member.name),
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

function parseArguments(
    parameter: ts.ParameterDeclaration,
    jsDoc: ts.JSDoc
): IToken[] {
    const baseName = getNameOrUnknown(parameter.name);
    const ret: IToken[] = [];
    try {
        delete parameter.type.parent;
        const xx = parameter.type as any;
        for (const x of xx.members) {
            ret.push(parseArgument(x, jsDoc));
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

function parseArgument(parameter: ts.TypeLiteralNode, jsDoc: ts.JSDoc): IArgument {
    const name = getName((parameter as any).name);
    const type = getArgType((parameter as any).type.kind);

    try {
        let desc = "";
        try {
            for (const tag of jsDoc.tags) {
                if (!(tag as any).name || !(tag as any).name.right) {
                    console.error(`Failed to parse jsDoc ${name}: `, cleanTsObj(tag));
                    throw new Error(`Failed to parse jsDoc ${name}`);
                }
                if (getName((tag as any).name.right) === name) {
                    desc = tag.comment;
                }
            }
        } catch (error) {
            console.error(`Failed to parse jsDoc ${name}: `, error, jsDoc);
            throw new Error(`Failed to parse jsDoc ${name}: ${error}`);
        }
        if (hasDropdown(desc)) {
            const values = getDropdown(desc);
            return {
                name,
                title: {
                    en: stripTags(desc)
                },
                type: "dropdown",
                values: Object.keys(values).map((k: string) => ({ id: k, label: { en: values[k] } })),
            };
        }

        return {
            name,
            title: {
                en: stripTags(desc)
            },
            type
        };
    } catch (error) {
        console.error(`Failed to parse ${name}: `, error, cleanTsObj(parameter));
        throw new Error(`Failed to parse ${name}: ${error}`);
    }
}

function getArgType(kind: number) {
    if (kind === ts.SyntaxKind.StringKeyword) {
        return "text";
    }
    if (kind === ts.SyntaxKind.NumberKeyword) {
        return "number";
    }
    return "unknown";
}
