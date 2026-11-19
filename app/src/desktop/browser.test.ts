import { expect, test } from "bun:test";
import { browserCommand } from "./browser";

test("usa el abridor del sistema", () => {
  expect(browserCommand("http://localhost:4000/", "win32")).toEqual([
    "rundll32.exe",
    "url.dll,FileProtocolHandler",
    "http://localhost:4000/",
  ]);
  expect(browserCommand("http://localhost:4000/", "darwin")).toEqual(["open", "http://localhost:4000/"]);
  expect(browserCommand("http://localhost:4000/", "linux")).toEqual(["xdg-open", "http://localhost:4000/"]);
});
