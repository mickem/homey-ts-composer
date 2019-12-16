import { readdirSync, readFileSync, writeFileSync } from "fs";
import * as ts from "typescript";
import * as yargs from "yargs";
import { processActions } from "./ActionParser";
import { IApp } from "./Model";
import { processTriggers } from "./TriggerParser";

function readFile(fileName: string) {
  try {
    return ts.createSourceFile(
      fileName,
      readFileSync(fileName).toString(),
      ts.ScriptTarget.Latest,
      true
    );
  } catch (error) {
    console.error(`Failed to read ${fileName}: ${error}`);
    throw new Error(`Failed to read ${fileName}: ${error}`);
  }
}
function readJsonFile(fileName: string) {
  try {
    return JSON.parse(readFileSync(fileName).toString());
  } catch (error) {
    console.error(`Failed to parse ${fileName}: ${error}`);
    throw new Error(`Failed to parse ${fileName}: ${error}`);
  }
}

function readAll(
  packageFile: string,
  appFile: string,
  triggerFile: string,
  actionFile: string
): IApp {
  const pkg = readJsonFile(packageFile);
  const baseline = readJsonFile(appFile) as IApp;
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
      baseline.flow = {};
    }
    baseline.flow.triggers = processTriggers(readFile(triggerFile));
  }
  if (actionFile) {
    if (!baseline.flow) {
      baseline.flow = {};
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
    return JSON.stringify(data);
  }
  return JSON.stringify(data, null, 2);
}

interface IExampleNode {
  example: {
    en: string;
  };
}
function fetchExample(node: IExampleNode): string {
  try {
    if (node && node.example.en) {
      return node.example.en;
    }
    return "TODO: Add example";
  } catch (error) {
    console.log(`Failed to parse example: `, node);
    return "TODO: Add example";
  }
}

function updateLocales(result, locale) {
  const localData = JSON.parse(readFileSync(locale).toString());
  const triggerData = {};
  for (const t of result.flow.triggers) {
    triggerData[t.id] = {
      title: t.title.en
    };
    for (const token of t.tokens) {
      triggerData[t.id][token.name] = {
        title: token.title.en
      };
      if (token.type === "string") {
        triggerData[t.id][token.name].example = fetchExample(token);
      }
    }
  }
  const actionData = {};
  for (const t of result.flow.actions) {
    actionData[t.id] = {
      title: t.title.en
    };
    for (const arg of t.args) {
      actionData[t.id][arg.name] = {
        title: arg.title.en
      };
      if (arg.type === "text") {
        actionData[t.id][arg.name].example = fetchExample(arg);
      }
    }
  }
  if (!localData.flows) {
    localData.flows = {};
  }
  localData.flows.triggers = triggerData;
  localData.flows.actions = actionData;
  writeFileSync(locale, JSON.stringify(localData, null, 2));
}

function addAllLanguages(result, locale) {
  for (const file of readdirSync(locale)) {
    console.log(`Adding strings from ${file}`);
    const code = file
      .split(".")
      .slice(0, -1)
      .join(".");
    const localData = JSON.parse(readFileSync(`${locale}/${file}`).toString());
    if (!localData.flows) {
      return result;
    }
    if (localData.flows.triggers) {
      result.flow.triggers = result.flow.triggers.map(trigger => {
        trigger.title[code] = localData.flows.triggers[trigger.id].title;
        trigger.tokens.map(token => {
          if (!localData.flows.triggers[trigger.id][token.name]) {
            console.log(localData.flows.triggers[trigger.id]);
            console.error(
              `Ignoring missing transalation ${code} ${trigger.id} / ${token.name}`
            );
            return;
          }
          if (localData.flows.triggers[trigger.id][token.name].title) {
            token.title[code] =
              localData.flows.triggers[trigger.id][token.name].title;
          }
          if (localData.flows.triggers[trigger.id][token.name].example) {
            token.example[code] =
              localData.flows.triggers[trigger.id][token.name].example;
          }
          return token;
        });
        return trigger;
      });
    }
  }
  return result;
}

const args = yargs
  .option("minify", {
    default: false,
    description: "Minimfy the resulting output file",
    type: "boolean"
  })
  .option("package-file", {
    default: "package.json",
    description: "The application manifest (read version etc. from this)"
  })
  .option("app-file", {
    default: "app.json",
    description: "The source app.json file to import baseline from"
  })
  .option("trigger-file", {
    description: "The typescript file to read triggers from"
  })
  .option("action-file", {
    description: "The typescript file to read actions from"
  })
  .option("locales", { description: "The folder to read locales from" })
  .command(
    "show",
    "Show the configuration",
    () => {},
    (argv: any) => {
      const result = readAll(
        argv.packageFile,
        argv.appFile,
        argv.triggerFile,
        argv.actionFile
      );
      console.log(formatResult(result, argv.minify));
    }
  )
  .command(
    "generate",
    "Update the app.json file",
    () => {},
    (argv: any) => {
      const result = readAll(
        argv.packageFile,
        argv.appFile,
        argv.triggerFile,
        argv.actionFile
      );
      updateLocales(result, argv.locales + "/en.json");
      const lResult = addAllLanguages(result, argv.locales);
      generate(argv.target, formatResult(lResult, argv.minify));
    }
  )
  .option("target", { description: "The app.json file to update" })
  .demandCommand()
  .help().argv;
