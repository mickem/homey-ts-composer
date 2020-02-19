import * as ts from "typescript";
import { ILString } from "./Model";

const EXAMPLE_TAG = "#sample:";
const DROPDOWN_TAG = "#dropdown:";
const CLASS_TAG = "#class:";

export interface IName {
  escapedText?: string;
}
export function getName(
  name: IName | ts.Identifier | ts.PropertyName | ts.BindingName
): string {
  if (name === undefined || !(name as IName).escapedText) {
    console.error(`Failed to parse name from null value: `, name);
    throw new Error(`Failed to parse name from null value`);
  }
  return (name as ts.Identifier).escapedText as string;
}
export function getNameOrUnknown(name: IName) {
  try {
    return getName(name);
  } catch (error) {
    return "unknown";
  }
}
export function cleanTsObj(obj: any) {
  delete obj.parent;
  return obj;
}

export function fetchDescriptionFromComment(text: string) {
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

function getTagText(tag: string, text: string): string {
  const pos = text.indexOf(tag);
  if (pos === -1) {
    throw new Error(`Missing example tag ${tag} in ${text}`);
  }
  return text.substring(pos + tag.length).trim();
}
function hasTag(tag: string, text: string): boolean {
  return text.indexOf(tag) !== -1;
}

export function hasExample(text: string): boolean {
  return hasTag(EXAMPLE_TAG, text);
}
export function getExample(text: string, type: string): ILString | number {
  const tmp = getTagText(EXAMPLE_TAG, text);
  if (type === "number") {
    return +tmp;
  }
  return {
    en: tmp
  };
}
export interface IDropdown {
  [key: string]: string;
}

export function hasDropdown(text: string): boolean {
  return hasTag(DROPDOWN_TAG, text);
}
function parseJsonOrThrow(str: string) {
  try {
    return JSON.parse(str);
  } catch (error) {
    throw new Error(`Failed to parse ${str}: ${error}`);
  }
}
export function getDropdown(text: string): IDropdown {
  return parseJsonOrThrow(getTagText(DROPDOWN_TAG, text)) as IDropdown;
}
export function getClassTag(text: string): string {
  return getTagText(CLASS_TAG, text);
}

function findFirst(text: string, keys: string[]): number {
  let firstPos = -1;
  for (const key of keys) {
    const pos = text.indexOf(key);
    if (pos !== -1) {
      if (firstPos === -1) {
        firstPos = pos;
      } else {
        firstPos = Math.min(firstPos, pos);
      }
    }
  }
  return firstPos;
}

export function stripTags(text: string): string {
  const pos = findFirst(text, [EXAMPLE_TAG, DROPDOWN_TAG, CLASS_TAG]);
  if (pos === -1) {
    return text;
  }
  return text.substring(0, pos).trim();
}

export function parseCode(data: string) {
  return ts.createSourceFile("test", data, ts.ScriptTarget.Latest, true);
}


export function expandKeys(key: string) {
  if (key.startsWith('$')) {
    return "lookup";
  }
  return key;
}