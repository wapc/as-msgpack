export class Result<T, E> {
  public readonly isOk: boolean;
  private readonly ok: T;
  private readonly err: E;

  static ok<T, E>(t: T): Result<T, E> {
    return new Result<T, E>(true, t, dummy<E>());
  }

  static err<T, E>(err: E): Result<T, E> {
    return new Result<T, E>(false, dummy<T>(), err);
  }

  protected constructor(isOk: boolean, ok: T, err: E) {
    this.isOk = isOk;
    this.ok = ok;
    this.err = err;
  }

  map<U>(fn: (t: T) => U): Result<U, E> {
    if (this.isOk) {
      return Result.ok<U, E>(fn(this.ok));
    }
    return Result.err<U, E>(this.err);
  }

  unwrap(): T {
    if (this.isOk) {
      return this.ok;
    }
    throw new Error("called unwrap on Err(E)");
  }

  unwrap_err(): E {
    if (!this.isOk) {
      return this.err;
    }
    throw new Error("called unwrap_err on Ok(T)");
  }

  unwrap_or(t: T): T {
    if (this.isOk) {
      return this.ok;
    } else {
      return t;
    }
  }

  get isErr(): boolean { return !this.isOk }
}

function dummy<T>(): T {
  if (isInteger<T>()) {
    return <T>0;
  } else if (isFloat<T>()) {
    return <T>0.0;
  } else {
    assert(isReference<T>())
    return changetype<T>(0);
  }
}
