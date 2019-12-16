import * as ts from "typescript";
import { getArgType, parseArgument, parseDescription, parseArguments, IParameter } from '../ActionParser';

describe('getArgType', () => {
    test('strings', () => {
        expect(getArgType(ts.SyntaxKind.StringKeyword)).toEqual('text');
    })
    test('numbers', () => {
        expect(getArgType(ts.SyntaxKind.NumberKeyword)).toEqual('number');
    })
    test('others', () => {
        expect(getArgType(ts.SyntaxKind.BooleanKeyword)).toEqual('unknown');
    })
})

describe('parseArgument', () => {
    const parameter = {
        name: {
            escapedText: 'the name'
        },
        type: {
            kind: ts.SyntaxKind.StringKeyword
        }
    };
    const jsDoc = {
        tags: [
            {
                comment: "comment",
                name: {
                    right: {
                        escapedText: "the name"
                    }
                },
            }
        ]
    };
    test('should work', () => {
        expect(parseArgument(parameter, jsDoc)).toEqual({ name: "the name", title: { en: "comment" }, type: "text" });
    })
    test('missing name should throw', () => {
        const param = { ...parameter };
        delete param.name;
        expect(() => parseArgument(param, jsDoc)).toThrow(/Failed to parse name from null.*/);
    })
    test('missing type should throw', () => {
        const param = { ...parameter };
        delete param.type;
        expect(() => parseArgument(param, jsDoc)).toThrow(/Missing type in: the name/);
    })
    test('missing jsDoc should throw', () => {
        expect(() => parseArgument(parameter, { tags: [] })).toThrow(/Failed to parse the name.*/);
    })
    test('dropdpwn should work', () => {
        const lJsDoc = { ...jsDoc };
        lJsDoc.tags[0].comment = ' comment #dropdown:{"a":"b","c":"d"}';
        expect(parseArgument(parameter, lJsDoc)).toEqual({ name: "the name", title: { en: "comment" }, type: "dropdown", values: [{ id: "a", label: { en: 'b' } }, { id: "c", label: { en: 'd' } }] });
    })
})


describe('parseDescription', () => {
    const jsDoc = {
        tags: [
            {
                name: {
                    right: {
                        escapedText: "the name"
                    }
                },
                comment: "comment",
            }
        ]
    };
    test('should work', () => {
        expect(parseDescription('the name', jsDoc)).toEqual('comment');

    })
    test('missing jstag name should throw', () => {
        const lJsDoc = { ...jsDoc };
        delete lJsDoc.tags[0].name.right;
        expect(() => parseDescription('the name', lJsDoc)).toThrow(/Failed to parse jsDoc the name:.*/);

    })
})

describe('parseArguments', () => {
    const param: IParameter = {
        name: {
            escapedText: "name",
        },
        kind: ts.SyntaxKind.Parameter,
        type: {
            members: [
                {
                    name: {
                        escapedText: "foo",
                    },
                    type: {
                        kind: ts.SyntaxKind.StringKeyword,
                    }
                }

            ]
        }
    }
    const jsDoc = {
        tags: [
            {
                name: {
                    right: {
                        escapedText: "foo"
                    }
                },
                comment: "comment",
            }
        ]
    };
    test('should work', () => {
        expect(parseArguments(param, jsDoc)).toEqual([{ name: "foo", title: { en: "comment" }, type: "text" }]);
    })
    test('missing jsdoc tag should throw', () => {
        const lJjsDoc = {...jsDoc};
        lJjsDoc.tags[0].name.right.escapedText = "bar";
        expect(() => parseArguments(param, jsDoc)).toThrow(/Failed to parse name:.*/);
    })

})
