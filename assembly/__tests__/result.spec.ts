import {Result} from '../result';

describe("Result", () => {
  describe("unwrap", () => {
    it("returns t when Ok(T)", () => {
      expect(Result.ok<i32>(1).unwrap()).toBe(1);
    });

    it("throws when Err(E)", () => {
      expect(() => {
        Result.err<i32>(new Error("boom")).unwrap();
      }).toThrow();
    });
  });

  describe("unwrapErr", () => {
    it("returns e when Err(E)", () => {
      const err = new Error("boom");
      expect(Result.err<i32>(err).unwrapErr()).toBe(err);
    });

    it("throws when Ok(T)", () => {
      expect(() => {
        Result.ok<i32>(1).unwrapErr();
      }).toThrow();
    });
  });
});
