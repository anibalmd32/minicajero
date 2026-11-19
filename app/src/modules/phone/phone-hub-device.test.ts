import { expect, test } from "bun:test";
import { describeDevice } from "./device";
import { ANDROID_CHROME } from "./phone-hub.test-support";

test("el nombre del dispositivo resume el user-agent", () => {
  expect(describeDevice(ANDROID_CHROME)).toBe("Android · Chrome");
  expect(describeDevice("Mozilla/5.0 (Linux; Android 13) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36")).toBe(
    "Android · Samsung Internet",
  );
  expect(
    describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1"),
  ).toBe("iPhone · Safari");
  expect(describeDevice(null)).toBe("Teléfono");
});
