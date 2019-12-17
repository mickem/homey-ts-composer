import { processTriggers } from "../TriggerParser";
import { parseCode } from "../Utils";

describe("full example", () => {
  const code = `
    export interface ITriggers {
        /**
         * A temperature changed
         * @param args.zone zone #sample:Kitchen
         * @param args.temperature average temperature #sample:14.5
         */
        TemperatureChanged(args: { zone: string, temperature: number }): Promise<void>;
        /**
         * The maximum temperature for a zone changed
         * @param args.zone zone #sample:Kitchen
         * @param args.device Thermometer #sample:Wall thermometer
         * @param args.temperature maximum temperature #sample:14.5
         */
        MaxTemperatureChanged(args: { zone: string, device: string, temperature: number }): Promise<void>;
        /**
         * The minimum temperature for a zone changed
         * @param args.zone zone #sample:Kitchen
         * @param args.device Thermometer #sample:Wall thermometer
         * @param args.temperature minimum temperature #sample:14.5
         */
        MinTemperatureChanged(args: { zone: string, device: string, temperature: number }): Promise<void>;
        /**
         * The temperature is too warm
         * @param args.zone zone #sample:Kitchen
         * @param args.temperature temperature #sample:14.5
         */
        TooWarm(args: { zone: string, temperature: number }): Promise<void>;
        /**
         * The temperature is too cold
         * @param args.zone zone #sample:Kitchen
         * @param args.temperature temperature #sample:14.5
         */
        TooCold(args: { zone: string, temperature: number }): Promise<void>;
      }
      
    `;
  test("should parse correctly", () => {
    expect(processTriggers(parseCode(code))).toEqual([
      {
        id: "TemperatureChanged",
        title: {
          en: "A temperature changed"
        },
        tokens: [
          {
            example: { en: "Kitchen" },
            name: "zone",
            title: {
              en: "zone"
            },
            type: "string"
          },
          {
            example: 14.5,
            name: "temperature",
            title: {
              en: "average temperature"
            },
            type: "number"
          }
        ]
      },
      {
        id: "MaxTemperatureChanged",
        title: {
          en: "The maximum temperature for a zone changed"
        },
        tokens: [
          {
            example: {
              en: "Kitchen"
            },
            name: "zone",
            title: {
              en: "zone"
            },
            type: "string"
          },
          {
            example: {
              en: "Wall thermometer"
            },
            name: "device",
            title: {
              en: "Thermometer"
            },
            type: "string"
          },
          {
            example: 14.5,
            name: "temperature",
            title: {
              en: "maximum temperature"
            },
            type: "number"
          }
        ]
      },
      {
        id: "MinTemperatureChanged",
        title: {
          en: "The minimum temperature for a zone changed"
        },
        tokens: [
          {
            example: {
              en: "Kitchen"
            },
            name: "zone",
            title: {
              en: "zone"
            },
            type: "string"
          },
          {
            example: {
              en: "Wall thermometer"
            },
            name: "device",
            title: {
              en: "Thermometer"
            },
            type: "string"
          },
          {
            example: 14.5,
            name: "temperature",
            title: {
              en: "minimum temperature"
            },
            type: "number"
          }
        ]
      },
      {
        id: "TooWarm",
        title: {
          en: "The temperature is too warm"
        },
        tokens: [
          {
            example: {
              en: "Kitchen"
            },
            name: "zone",
            title: {
              en: "zone"
            },
            type: "string"
          },
          {
            example: 14.5,
            name: "temperature",
            title: {
              en: "temperature"
            },
            type: "number"
          }
        ]
      },
      {
        id: "TooCold",
        title: {
          en: "The temperature is too cold"
        },
        tokens: [
          {
            example: {
              en: "Kitchen"
            },
            name: "zone",
            title: {
              en: "zone"
            },
            type: "string"
          },
          {
            example: 14.5,
            name: "temperature",
            title: {
              en: "temperature"
            },
            type: "number"
          }
        ]
      }
    ]);
  });
});
