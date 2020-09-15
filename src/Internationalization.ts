import { IApp, ILString, IToken } from "./Model";

interface IKeyValue {
  [key: string]: string;
}

interface ITriggerList {
  [key: string]:
    | {
        title: string;
      }
    | IKeyValue;
}
interface IArgumentData {
  title: string;
  example?: string;
}
interface IArguments {
  [key: string]: IArgumentData | string;
}
export interface ILocaleData {
  common?: IKeyValue;
  flows?: {
    triggers?: ITriggerList;
    actions?: ITriggerList;
  };
  drivers?: IKeyValue;
}

function fetchExample(node: IToken, location?: string): string {
  try {
    if (node && node.example && (node.example as ILString).en) {
      return (node.example as ILString).en;
    }
    console.error(`Missign example at ${location}`, node);
    return `TODO: Add example at ${location}`;
  } catch (error) {
    console.log(`Failed to parse example: ${error}`, node);
    return `TODO: Add example at ${location}`;
  }
}

function applyValue(
  common: any,
  localeObj: any,
  realObj: any,
  language: string,
  key: string,
  desc: string
) {
  try {
    if (!realObj[key]) {
      console.error(
        `Ignoring missing key ${language} ${desc} (${key})`,
        realObj
      );
      return;
    }
    if (localeObj && localeObj[key]) {
      realObj[key][language] = localeObj[key];
    } else if (
      realObj[key] &&
      realObj[key].en &&
      realObj[key].en.startsWith("$common.")
    ) {
      if (common[realObj[key].en.substr(8)]) {
        realObj[key][language] = common[realObj[key].en.substr(8)];
      }
    } else {
      console.error(
        `Ignoring missing translation ${language} ${desc} (${key})`
      );
    }
  } catch (exception) {
    console.error(
      `Failed to translate key:  ${language} ${desc} (${key})`,
      exception
    );
  }
}

class CommonCollector {
  public keys: string[] = [];
  public collect(str: string) {
    if (str.startsWith("$common.")) {
      this.keys.push(str.substr("$common.".length));
    }
    return str;
  }
  public collectAndSet(str: string, obj: any, key: string) {
    const value = this.collect(str);
    if (!str.startsWith("$common.")) {
      obj[key] = value;
    }
  }
}

function ensureObj(obj) {
  if (obj) {
    return obj;
  }
  return {};
}

export function updateBaseLocale(
  result: IApp,
  localData: ILocaleData
): ILocaleData {
  const collector: CommonCollector = new CommonCollector();
  const triggerData = {};
  const driverData = {};
  if (result.flow && result.flow.triggers) {
    for (const t of result.flow.triggers) {
      triggerData[t.id] = {
        title: collector.collect(t.title.en)
      };
      for (const token of t.tokens) {
        triggerData[t.id][token.name] = {};
        collector.collectAndSet(
          token.title.en,
          triggerData[t.id][token.name],
          "title"
        );
        if (token.type === "string") {
          collector.collectAndSet(
            fetchExample(token, `${t.id} ${token.name}`),
            triggerData[t.id][token.name],
            "example"
          );
        }
        if (Object.keys(triggerData[t.id][token.name]).length === 0) {
          delete triggerData[t.id][token.name];
        }
      }
    }
  }
  const actionData = {};
  for (const t of result.flow.actions) {
    actionData[t.id] = {
      title: collector.collect(t.title.en)
    };
    for (const arg of t.args) {
      actionData[t.id][arg.name] = {};
      collector.collectAndSet(
        arg.title.en,
        actionData[t.id][arg.name],
        "title"
      );
      if (arg.type === "text") {
        collector.collectAndSet(
          fetchExample(arg, `${t.id} ${arg.name}`),
          actionData[t.id][arg.name],
          "example"
        );
      }
      if (Object.keys(actionData[t.id][arg.name]).length === 0) {
        delete actionData[t.id][arg.name];
      }
    }
  }
  localData.flows = ensureObj(localData.flows);

  if (result.drivers) {
    for (const d of result.drivers) {
      driverData[d.id] = {
        name: d.name.en
      };
      if (d.capabilitiesOptions) {
        for (const key in d.capabilitiesOptions) {
          if (!driverData[d.id].capabilities) {
            driverData[d.id].capabilities = {};
          }
          driverData[d.id].capabilities[key] = {
            title: d.capabilitiesOptions[key].title.en
          };
        }
      }
    }
  }

  if (collector.keys) {
    localData.common = ensureObj(localData.common);
    for (const k of Object.keys(collector.keys)) {
      if (!localData.common[collector.keys[k]]) {
        localData.common[collector.keys[k]] = "TODO";
      }
    }
  }
  localData.flows.triggers = triggerData;
  localData.flows.actions = actionData;
  localData.drivers = driverData;
  return localData;
}

export function addLocaleToResult(
  code: string,
  result: IApp,
  localData: ILocaleData
): IApp {
  if (localData.flows && localData.flows.triggers) {
    result.flow.triggers = result.flow.triggers.map(trigger => {
      const localeTrigger = localData.flows.triggers[trigger.id];
      if (!localeTrigger) {
        console.error(`Ignoring missing translation ${code} ${trigger.id}`);
        return trigger;
      }
      if (!trigger) {
        console.error(
          `Invalid data when parsing trigger:`,
          result.flow.triggers
        );
        throw new Error(`Invalid data when parsing trigger`);
      }
      applyValue(
        localData.common,
        localeTrigger,
        trigger,
        code,
        "title",
        `${code} ${trigger.id}`
      );
      trigger.tokens.forEach(token => {
        const localeToken = localeTrigger[token.name];
        applyValue(
          localData.common,
          localeToken,
          token,
          code,
          "title",
          `${code} ${trigger.id} / ${token.name}`
        );
        applyValue(
          localData.common,
          localeToken,
          token,
          code,
          "example",
          `${code} ${trigger.id} / ${token.name}`
        );
      });
      return trigger;
    });
  }
  if (localData.flows && localData.flows.actions) {
    result.flow.actions = result.flow.actions.map(action => {
      if (!action) {
        console.error(
          `Invalid data when parsing trigger:`,
          result.flow.actions
        );
        throw new Error(`Invalid data when parsing trigger`);
      }
      if (!localData.flows.actions[action.id]) {
        console.error(`Ignoring missing translation ${code} ${action.id}`);
        return action;
      }
      const localeAction = localData.flows.actions[action.id];
      applyValue(
        localData.common,
        localeAction,
        action,
        code,
        "title",
        `${code} ${action.id}`
      );
      action.args.forEach(arg => {
        const localeArg = localeAction[arg.name];
        applyValue(
          localData.common,
          localeArg,
          arg,
          code,
          "title",
          `${code} ${action.id} / ${arg.name}`
        );
        applyValue(
          localData.common,
          localeArg,
          arg,
          code,
          "example",
          `${code} ${action.id} / ${arg.name}`
        );
      });
      return action;
    });
  }
  return result;
}
