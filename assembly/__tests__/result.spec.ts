import {Result} from '../result';

describe("Result", () => {
  describe("unwrap", () => {
    it("returns t when Ok(T)", () => {
      expect(Result.ok<i32, string>(1).unwrap()).toBe(1);
    });

    it("throws when Err(E)", () => {
      expect(() => {
        Result.err<i32, string>("boom").unwrap();
      }).toThrow();
    });
  });

  describe("unwrapErr", () => {
    it("returns e when Err(E)", () => {
      expect(Result.err<i32, string>("boom").unwrapErr()).toBe("boom");
    });

    it("throws when Ok(T)", () => {
      expect(() => {
        Result.ok<i32, string>(1).unwrapErr();
      }).toThrow();
    });
  });

  describe("unwrapOr", () => {
    it("returns t when Ok(T)", () => {
      expect(Result.ok<i32, string>(1).unwrapOr(2)).toBe(1);
    });

    it("returns the default value when Err(E)", () => {
      expect(Result.err<i32, string>("boom").unwrapOr(2)).toBe(2);
    });
  });
});
