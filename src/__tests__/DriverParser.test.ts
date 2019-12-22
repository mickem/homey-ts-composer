import { processDriver } from "../DriverParser";
import { IDriver } from "../Model";
import { parseCode } from "../Utils";

describe("full example", () => {
  const code = `
export const capabilities = {
  max: "measure_temperature.max",
  /**
   * Minimum temperature 
   */
  min: "measure_temperature.min",
  temp: "measure_temperature",
}

/**
 * Zone Temperature
 * #class:sensor
 */
class ZoneTemperatureDriver extends Driver {
}
    `;
  test("should parse correctly", () => {
    expect(
      processDriver("zone-temperature", parseCode(code), {
        pair: [
          {
            id: "list_devices",
            navigation: {
              next: "add_my_devices"
            },
            template: "list_devices"
          },
          {
            id: "add_my_devices",
            template: "add_devices"
          }
        ]
      } as IDriver)
    ).toEqual({
      capabilities: [
        "measure_temperature.max",
        "measure_temperature.min",
        "measure_temperature"
      ],
      capabilitiesOptions: {
        "measure_temperature.min": { title: { en: "Minimum temperature" } }
      },
      class: "sensor",
      id: "zone-temperature",
      images: {
        large: "/assets/drivers/zone-temperature/large.png",
        small: "/assets/drivers/zone-temperature/small.png"
      },
      name: {
        en: "Zone Temperature"
      },
      pair: [
        {
          id: "list_devices",
          navigation: {
            next: "add_my_devices"
          },
          template: "list_devices"
        },
        {
          id: "add_my_devices",
          template: "add_devices"
        }
      ]
    });
  });
});
