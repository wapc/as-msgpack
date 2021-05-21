export class Result<T> {
  public readonly isOk: boolean;
  private readonly ok: T;
  private readonly err: Error;

  static ok<T>(t: T): Result<T> {
    return new Result<T>(true, t, phantomType<Error>());
  }

  static err<T>(err: Error): Result<T> {
    return new Result<T>(false, phantomType<T>(), err);
  }

  protected constructor(isOk: boolean, ok: T, err: Error) {
    this.isOk = isOk;
    this.ok = ok;
    this.err = err;
  }

  unwrap(): T {
    if (this.isOk) {
      return this.ok;
    }
    throw this.err;
  }

  unwrapErr(): Error {
    if (this.isOk) {
      throw new Error("called unwrapErr on Ok(T)");
    }
    return this.err;
  }

  get isErr(): boolean { return !this.isOk }
}

function phantomType<T>(): T {
  if (isInteger<T>()) {
    return <T>0;
  } else if (isFloat<T>()) {
    return <T>0.0;
  } else {
    assert(isReference<T>())
    return changetype<T>(0);
  }
}
