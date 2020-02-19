import { updateBaseLocale, addLocaleToResult } from "../Internationalization";

const exampleData = {
  flow: {
    actions: [
      {
        args: [
          {
            name: "type",
            title: { en: "the type of bound to set" },
            type: "dropdown",
            values: [
              { id: "min", label: { en: "Minimum" } },
              { id: "max", label: { en: "Maximum" } }
            ]
          },
          {
            name: "temperature",
            title: { en: "$common.temperature" },
            type: "number"
          }
        ],
        id: "SetTemperatureBounds",
        title: { en: "Set the maximum or minimum temperature bounds" }
      },
      {
        args: [
          { name: "zone", title: { en: "$common.zone" }, type: "text" },
          {
            name: "mode",
            title: { en: "mode" },
            type: "dropdown",
            values: [
              { id: "disabled", label: { en: "Disabled" } },
              { id: "enabled", label: { en: "Enabled" } },
              { id: "monitored", label: { en: "Monitored" } }
            ]
          }
        ],
        id: "SetZoneMode",
        title: { en: "Set the mode for a given zone" }
      }
    ]
  }
};

const clone = obj => JSON.parse(JSON.stringify(obj));

describe("updateBaseLocale", () => {
  test("Common keys should be populated", () => {
    const value = updateBaseLocale(clone(exampleData), {});
    expect(value).toMatchSnapshot();
    expect(value.common).toEqual({
      temperature: "TODO",
      zone: "TODO"
    });
  });

  test("Common keys should be reused", () => {
    const value = updateBaseLocale(clone(exampleData), {
      common: {
        temperature: "The temperature"
      }
    });
    expect(value).toMatchSnapshot();
    expect(value.common).toEqual({
      temperature: "The temperature",
      zone: "TODO"
    });
  });
});

describe("addLocaleToResult", () => {
  test("Empty locale should be same", () => {
    expect(addLocaleToResult("sv", clone(exampleData), {})).toEqual(
      exampleData
    );
  });

  test("Regular value should be translated", () => {
    const value = addLocaleToResult("sv", clone(exampleData), {
      flows: {
        actions: {
          SetTemperatureBounds: {
            temperature: {
              title: "Temperatur"
            },
            title: "Svenska"
          }
        }
      }
    });
    expect(value).toMatchSnapshot();
    expect(
      value.flow.actions.find(a => a.id === "SetTemperatureBounds").title["sv"]
    ).toEqual("Svenska");
    expect(
      value.flow.actions.find(a => a.id === "SetTemperatureBounds").args[1]
        .title["sv"]
    ).toEqual("Temperatur");
  });
  test("Expanded value should be translated", () => {
    const value = addLocaleToResult("sv", clone(exampleData), {
      common: {
        temperature: "Temperatur"
      },
      flows: {
        actions: {
          SetTemperatureBounds: {
            title: "Svenska"
          }
        }
      }
    });
    expect(value).toMatchSnapshot();
    expect(
      value.flow.actions.find(a => a.id === "SetTemperatureBounds").title["sv"]
    ).toEqual("Svenska");
    expect(
      value.flow.actions.find(a => a.id === "SetTemperatureBounds").args[1]
        .title["sv"]
    ).toEqual("Temperatur");
  });

  test("Expanded value should overwrite existing keys", () => {
    const value = addLocaleToResult("en", clone(exampleData), {
      common: {
        temperature: "Temp"
      },
      flows: {
        actions: {
          SetTemperatureBounds: {
            title: "English"
          }
        }
      }
    });
    expect(value).toMatchSnapshot();
    expect(
      value.flow.actions.find(a => a.id === "SetTemperatureBounds").title["en"]
    ).toEqual("English");
    expect(
      value.flow.actions.find(a => a.id === "SetTemperatureBounds").args[1]
        .title["en"]
    ).toEqual("Temp");
  });
});
