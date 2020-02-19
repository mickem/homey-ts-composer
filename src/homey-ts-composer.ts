import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import * as ts from "typescript";
import * as yargs from "yargs";
import { processActions } from "./ActionParser";
import { processDriver } from "./DriverParser";
import { addLocaleToResult, updateBaseLocale } from "./Internationalization";
import { IApp, IDriver } from "./Model";
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
function readComposer(fileName: string) {
  try {
    if (existsSync(fileName)) {
      return JSON.parse(readFileSync(fileName).toString());
    }
  } catch (error) {
    console.error(`Failed to parse ${fileName}: ${error}`);
  }
  return {};
}

function readAllDrivers(drivers: string): IDriver[] {
  const ret: IDriver[] = [];
  for (const file of readdirSync(drivers)) {
    console.log(`Adding drivers from ${drivers}/${file}`);
    const baseline = readComposer(`${drivers}/${file}/driver.compose.json`);
    if (existsSync(`${drivers}/${file}/DriverImpl.ts`)) {
      ret.push(
        processDriver(
          file,
          readFile(`${drivers}/${file}/DriverImpl.ts`),
          baseline
        )
      );
    } else if (existsSync(`${drivers}/${file}/driver.ts`)) {
      ret.push(
        processDriver(file, readFile(`${drivers}/${file}/driver.ts`), baseline)
      );
    }
  }
  return ret;
}
function readAll(
  packageFile: string,
  appFile: string,
  triggerFile: string,
  actionFile: string,
  drivers: string
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
  baseline.drivers = readAllDrivers(drivers);
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

function updateEnLocale(result: IApp, locale) {
  const baseLocale = JSON.parse(readFileSync(locale).toString());
  const localData = updateBaseLocale(result, baseLocale);
  writeFileSync(locale, JSON.stringify(localData, null, 2));
}

function addAllLanguages(result: IApp, localePath) {
  for (const file of readdirSync(localePath).filter(f => !f.endsWith('en.json'))) {
    console.log(`Adding strings from ${file}`);
    const code = file
      .split(".")
      .slice(0, -1)
      .join(".");
    const localData = JSON.parse(readFileSync(`${localePath}/${file}`).toString());
    addLocaleToResult(code, result, localData);
  }
  const enLocalData = JSON.parse(readFileSync(`${localePath}/en.json`).toString());
  addLocaleToResult('en', result, enLocalData);
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
    default: "triggers.ts",
    description: "The typescript file to read triggers from"
  })
  .option("action-file", {
    default: "actions.ts",
    description: "The typescript file to read actions from"
  })
  .option("drivers", {
    default: "drivers",
    description: "The folder to read drivers from"
  })
  .option("locales", { description: "The folder to read locales from" })
  .command(
    "show",
    "Show the configuration",
    () => { },
    (argv: any) => {
      const result = readAll(
        argv.packageFile,
        argv.appFile,
        argv.triggerFile,
        argv.actionFile,
        argv.drivers
      );
      console.log(formatResult(result, argv.minify));
    }
  )
  .command(
    "generate",
    "Update the app.json file",
    () => { },
    (argv: any) => {
      const result = readAll(
        argv.packageFile,
        argv.appFile,
        argv.triggerFile,
        argv.actionFile,
        argv.drivers
      );
      updateEnLocale(result, argv.locales + "/en.json");
      const lResult = addAllLanguages(result, argv.locales);
      generate(argv.target, formatResult(lResult, argv.minify));
    }
  )
  .option("target", { description: "The app.json file to update" })
  .demandCommand()
  .help().argv;
