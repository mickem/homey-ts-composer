import { IName } from "./Utils";

export interface IJSDocTag {
  name: {
    right?: IName;
  };
  comment?: string;
}
export interface IJSDoc {
  tags?: IJSDocTag[];
  comment?: string;
}

export function hasJSDoc(object: any) {
  if (object !== undefined) {
    return "jsDoc" in object;
  }
  return false;
}

export function getFirstJSDoc(object: any): IJSDoc | undefined {
  if (!hasJSDoc(object)) {
    return undefined;
  }
  if (object.jsDoc && object.jsDoc[0]) {
    return object.jsDoc[0] as IJSDoc;
  }
  return undefined;
}
