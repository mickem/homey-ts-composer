export interface IApp {
  id: string;
  version: string;
  bugs: any;
  author: any;
  flow: IFlows;
}

export interface IFlows {
  triggers?: ITrigger[];
  actions?: IAction[];
}

export interface ITrigger {
  id: string;
  title: ILString;
  tokens: IToken[];
}

export interface ILString {
  [lang: string]: string;
}
export interface IToken {
  name: string;
  type: string;
  example?: ILString | number;
  title: ILString;
}

export interface IAction {
  id: string;
  title: ILString;
  args: IArgument[];
}
export interface IDropDownValue {
  id: string;
  label: ILString;
}
export interface IArgument {
  name: string;
  type: string;
  example?: ILString | number;
  title: ILString;
  values?: IDropDownValue[];
}
