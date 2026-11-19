import { describe, expect, test } from "bun:test";
import { escapeLike, searchKey, searchText } from "./text";

describe("searchKey", () => {
  test("quita tildes y mayúsculas", () => {
    expect(searchKey("José Ángel NÚÑEZ")).toBe("jose angel nunez");
    expect(searchKey("Óscar Ávila")).toBe("oscar avila");
    expect(searchKey("güero")).toBe("guero");
  });
});

describe("searchText", () => {
  test("une las partes no vacías y las normaliza", () => {
    expect(searchText("Jugo de  Piña", "JP-01")).toBe("jugo de pina jp-01");
    expect(searchText("José", null, "  ", undefined, "Ávila")).toBe("jose avila");
    expect(searchText("Café molido")).toBe("cafe molido");
    expect(searchText()).toBe("");
  });
});

describe("escapeLike", () => {
  test("antepone la barra invertida a la barra invertida, % y _", () => {
    expect(escapeLike(String.raw`a%b_c\d`)).toBe(String.raw`a\%b\_c\\d`);
    expect(escapeLike("sin comodines")).toBe("sin comodines");
  });
});
