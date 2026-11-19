import { expect, test } from "bun:test";
import { namedBits, oid, smallInteger, time, tlv, unsignedInteger } from "./der";

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

test("DER: longitudes cortas y largas", () => {
  expect(hex(tlv(0x04, new Uint8Array(3)))).toBe("0403000000");
  expect(hex(tlv(0x04, new Uint8Array(200)).subarray(0, 3))).toBe("0481c8");
  expect(hex(tlv(0x04, new Uint8Array(300)).subarray(0, 4))).toBe("0482012c");
});

test("DER: enteros positivos con cero de signo y sin ceros sobrantes", () => {
  expect(hex(smallInteger(2))).toBe("020102");
  expect(hex(smallInteger(0))).toBe("020100");
  expect(hex(unsignedInteger(Uint8Array.of(0x80, 0x01)))).toBe("0203008001");
  expect(hex(unsignedInteger(Uint8Array.of(0, 0, 0x7f)))).toBe("02017f");
});

test("DER: OID", () => {
  expect(hex(oid("1.2.840.113549"))).toBe("06062a864886f70d");
  expect(hex(oid("2.5.29.17"))).toBe("0603551d11");
  expect(() => oid("1")).toThrow(RangeError);
});

test("DER: BIT STRING de keyUsage", () => {
  expect(hex(namedBits([0]))).toBe("03020780");
  expect(hex(namedBits([0, 5]))).toBe("03020284");
});

test("DER: UTCTime hasta 2049 y GeneralizedTime desde 2050", () => {
  const utc = time(new Date(Date.UTC(2036, 0, 2, 3, 4, 5)));
  expect(utc[0]).toBe(0x17);
  expect(Buffer.from(utc).subarray(2).toString()).toBe("360102030405Z");
  const generalized = time(new Date(Date.UTC(2050, 11, 31, 23, 59, 59)));
  expect(generalized[0]).toBe(0x18);
  expect(Buffer.from(generalized).subarray(2).toString()).toBe("20501231235959Z");
});
