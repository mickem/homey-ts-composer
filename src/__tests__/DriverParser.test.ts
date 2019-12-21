import { processDriver } from "../DriverParser";
import { parseCode } from "../Utils";
import { IDriver } from "../Model";

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
            template: "list_devices",
            navigation: {
              next: "add_my_devices"
            }
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
        large: "/drivers/zone-temperature/assets/images/large.png",
        small: "/drivers/zone-temperature/assets/images/small.png"
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
