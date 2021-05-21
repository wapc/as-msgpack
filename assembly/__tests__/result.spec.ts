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

  describe("unwrap_or", () => {
    it("returns t when Ok(T)", () => {
      expect(Result.ok<i32, string>(1).unwrap_or(2)).toBe(1);
    });

    it("returns the default value when Err(E)", () => {
      expect(Result.err<i32, string>("boom").unwrap_or(2)).toBe(2);
    });
  });
});
