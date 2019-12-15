import { readdirSync, readFileSync, writeFileSync } from "fs";
import * as ts from "typescript";
import * as yargs from 'yargs'

function getType(kind: number) {
  if (kind === ts.SyntaxKind.StringKeyword) {
    return 'string';
  }
  if (kind === ts.SyntaxKind.NumberKeyword) {
    return 'number';
  }
  return 'unknown';
}

function parseFirstLine(text: string) {
  let tmp = text;
  const pos = text.indexOf("@param");
  if (pos !== -1) {
    tmp = text.substring(0, pos);

  }
  tmp = tmp.trim();
  while (tmp.substr(0, 1) === "*" || tmp.substr(0, 1) === "/") {
    tmp = tmp.substr(1).trim();
  }
  while (tmp.substr(tmp.length - 1, 1) === "*") {
    tmp = tmp.substr(0, tmp.length - 1).trim();
  }
  return tmp;
}

const EXAMPLE_TAG = "@sample:";
function getExample(text: string, type: string): ILString | number {
  const pos = text.indexOf(EXAMPLE_TAG);
  if (pos === -1) {
    throw new Error(`Mssing example tag ${EXAMPLE_TAG}text`);
  }
  if (type === "number") {
    return +text.substring(pos + EXAMPLE_TAG.length).trim();
  }
  return {
    en: text.substring(pos + EXAMPLE_TAG.length).trim()
  }
}
function removeExample(text: string): string {
  const pos = text.indexOf(EXAMPLE_TAG);
  if (pos === -1) {
    return text;
  }
  return text.substring(0, pos).trim();
}
interface ILString {
  en: string;
}
interface IToken {
  name: string,
  type: string,
  example?: ILString | number,
  title: {
    en: string,
  },
}
interface ITrigger {
  id: string,
  title: ILString,
  tokens: IToken[],
}
interface IArgs {
  id: string,
  title: ILString,
  args: IToken[],
}

function parseMember(member: ts.MethodDeclaration): ITrigger {
  try {
    if (!((member.name as any).escapedText as string).startsWith('on')) {
      return;
    }
    const functionComment = member.getFullText().substring(0, member.getStart() - member.getFullStart()).trim();
    const result: ITrigger = {
      id: (member.name as any).escapedText.substring(2),
      "title": {
        "en": parseFirstLine(functionComment),
      },
      tokens: [],
    }
    for (const p of member.parameters) {
      if (p.kind === ts.SyntaxKind.Parameter) {
        result.tokens.push(parseParameter(p as ts.ParameterDeclaration, functionComment));
      }
    }
    return result;
  } catch (error) {
    console.error(`Failed to parse ${(member.name as any).escapedText}: `, error);
  }

}

function parseParameter(parameter: ts.ParameterDeclaration, functionComment: string): IToken {
  const name = (parameter.name as any).escapedText;
  try {
    const key = `@param ${name}`;
    const pos = functionComment.indexOf(key);
    let title = "";
    if (pos !== -1) {
      const pos2 = functionComment.indexOf('\n', pos);
      if (pos2 !== -1) {
        title = functionComment.substring(pos + key.length, pos2).trim();
      }
    }
    const type = getType(parameter.type.kind);
    return {
      example: getExample(title, type),
      name,
      title: {
        en: removeExample(title),
      },
      type,
    }
  } catch (error) {
    throw new Error(`Failed to parse ${name}: ${error}`);
  }
}

export function processTriggers(sourceFile: ts.SourceFile) {
  for (const s of sourceFile.statements) {
    if (s.kind === ts.SyntaxKind.ClassDeclaration) {
      const cls = (s as ts.ClassDeclaration);
      const triggers = [];
      const id = (cls.name.escapedText as string);
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


function parseParameterSimple(parameter: ts.ParameterDeclaration, jsDoc: ts.JSDoc): IToken {
  const name = (parameter.name as any).escapedText;
  const type = getType(parameter.type.kind);
  let desc = "";
  for (const tag of jsDoc.tags) {
    if ((tag as any).name.escapedText === name) {
      desc = tag.comment;
    }
  }
  return {
    name,
    title: {
      en: removeExample(desc),
    },
    type,
  }
}


function parseMethod(member: ts.MethodDeclaration): IArgs {
  try {
    const jsDoc: ts.JSDoc = (member as any).jsDoc[0];
    const functionComment = jsDoc.comment;
    const result: IArgs = {
      args: [],
      id: (member.name as any).escapedText,
      title: {
        en: parseFirstLine(functionComment),
      },
    }
    for (const p of member.parameters) {
      if (p.kind === ts.SyntaxKind.Parameter) {
        result.args.push(parseParameterSimple(p as ts.ParameterDeclaration, jsDoc));
      }
    }
    return result;
  } catch (error) {
    console.error(`Failed to parse ${(member.name as any).escapedText}: `, error);
  }

}

export function processActions(sourceFile: ts.SourceFile) {
  for (const s of sourceFile.statements) {
    if (s.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const cls = (s as ts.InterfaceDeclaration);
      const triggers = [];
      const id = (cls.name.escapedText as string);
      for (const c of cls.members) {
        if (c.kind === ts.SyntaxKind.MethodSignature) {
          delete c.parent;
          const member = parseMethod((c as any) as ts.MethodDeclaration);
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
function readFile(fileName: string) {
  return ts.createSourceFile(
    fileName,
    readFileSync(fileName).toString(),
    ts.ScriptTarget.Latest,
    true
  );
}


function readAll(packageFile: string, appFile: string, triggerFile: string, actionFile: string) {
  const pkg = JSON.parse(readFileSync(packageFile).toString());
  const baseline = JSON.parse(readFileSync(appFile).toString());
  baseline.version = pkg.version;
  baseline.id = pkg.name;
  if (pkg.bugs) {
    baseline.bugs = pkg.bugs;
  }
  if (pkg.author) {
    baseline.author = pkg.author;
  }
  if (triggerFile) {
    if (!baseline.flow) {
      baseline.flow = {}
    }
    baseline.flow.triggers = processTriggers(readFile(triggerFile));
  }
  if (actionFile) {
    if (!baseline.flow) {
      baseline.flow = {}
    }
    baseline.flow.actions = processActions(readFile(actionFile));
  }
  return baseline;
}
function generate(targetFile: string, data: any) {
  writeFileSync(targetFile, data);
}
function formatResult(data: any, minify: boolean) {
  if (minify) {
    return JSON.stringify(data)
  }
  return JSON.stringify(data, null, 2)
}


function updateLocales(result, locale) {
  const localData = JSON.parse(readFileSync(locale).toString());
  const triggerData = {}
  for (const t of result.flow.triggers) {
    triggerData[t.id] = {
      title: t.title.en,
    }
    for (const token of t.tokens) {
      triggerData[t.id][token.name] = {
        title: token.title.en,
      }
      if (token.type === "string") {
        triggerData[t.id][token.name].example = token.example.en;
      }
    }
  }
  const actionData = {}
  for (const t of result.flow.actions) {
    actionData[t.id] = {
      title: t.title.en,
    }
    for (const arg of t.args) {
      actionData[t.id][arg.name] = {
        title: arg.title.en,
      }
      if (arg.type === "string") {
        actionData[t.id][arg.name].example = arg.example.en;
      }
    }
  }
  if (!localData.flows) {
    localData.flows = {}
  }
  localData.flows.triggers = triggerData;
  localData.flows.actions = actionData;
  writeFileSync(locale, JSON.stringify(localData, null, 2));
}

function addAllLanguages(result, locale) {
  for (const file of readdirSync(locale)) {
    console.log(`Adding strings from ${file}`);
    const code = file.split('.').slice(0, -1).join('.');
    const localData = JSON.parse(readFileSync(`${locale}${file}`).toString());
    if (!localData.flows) {
      return result;
    }
    if (localData.flows.triggers) {
      result.flow.triggers = result.flow.triggers.map(trigger => {
        trigger.title[code] = localData.flows.triggers[trigger.id].title;
        trigger.tokens.map(token => {
          if (!localData.flows.triggers[trigger.id][token.name]) {
            console.log(localData.flows.triggers[trigger.id])
            console.error(`Ignoring missing transalation ${code} ${trigger.id} / ${token.name}`);
            return;
          }
          if (localData.flows.triggers[trigger.id][token.name].title) {
            token.title[code] = localData.flows.triggers[trigger.id][token.name].title;
          }
          if (localData.flows.triggers[trigger.id][token.name].example) {
            token.example[code] = localData.flows.triggers[trigger.id][token.name].example;
          }
          return token;
        })
        return trigger;
      })
    }

  }
  return result;
}

const args = yargs
  .option('minify', { default: false, type: 'boolean', description: "Minimfy the resulting output file" })
  .option('package-file', { default: 'package.json', description: "The application manifest (read version etc. from this)" })
  .option('app-file', { default: 'app.json', description: "The source app.json file to import baseline from" })
  .option('trigger-file', { description: "The typescript file to read triggers from" })
  .option('action-file', { description: "The typescript file to read actions from" })
  .option('locales', { description: "The folder to read locales from" })
  .command('show', "Show the configuration", () => { }, (argv: any) => {
    const result = readAll(argv.packageFile, argv.appFile, argv.triggerFile, argv.actionFile);
    console.log(formatResult(result, argv.minify));
  })
  .command('generate', "Update the app.json file", () => { }, (argv: any) => {
    const result = readAll(argv.packageFile, argv.appFile, argv.triggerFile, argv.actionFile);
    updateLocales(result, argv.locales + "/en.json");
    const lResult = addAllLanguages(result, argv.locales);
    generate(argv.target, formatResult(lResult, argv.minify));
  })
  .option('target', { description: "The app.json file to update" })
  .demandCommand()
  .help()
  .argv
  ;
