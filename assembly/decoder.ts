import { DataReader } from "./datareader";
import { Format } from "./format";
import { E_INVALIDLENGTH } from "util/error";

export class Decoder {
  private reader: DataReader;
  private err: Error | null;

  constructor(ua: ArrayBuffer) {
    this.reader = new DataReader(ua, 0, ua.byteLength);
  }

  private setError(error: Error): void {
    if (!this.err) {
      this.err = error;
    }
  }

  isNextNil(): bool {
    if (this.reader.peekUint8() == Format.NIL) {
      this.reader.discard(1);
      return true;
    }
    return false;
  }

  readBool(): bool {
    const value = this.reader.getUint8();
    if (value == Format.TRUE) {
      return true;
    } else if (value == Format.FALSE) {
      return false;
    }
    this.setError(new Error("bad value for bool"));
    return false;
  }

  readInt8(): i8 {
    const value = this.readInt64();
    if (value <= <i64>i8.MAX_VALUE && value >= <i64>i8.MIN_VALUE) {
      return <i8>value;
    }
    this.setError(new Error(
      "interger overflow: value = " + value.toString() + "; bits = 8"
    ));
    return 0;
  }
  readInt16(): i16 {
    const value = this.readInt64();
    if (value <= <i64>i16.MAX_VALUE && value >= <i64>i16.MIN_VALUE) {
      return <i16>value;
    }
    this.setError(new Error(
      "interger overflow: value = " + value.toString() + "; bits = 16"
    ));
    return 0;
  }
  readInt32(): i32 {
    const value = this.readInt64();
    if (value <= <i64>i32.MAX_VALUE && value >= <i64>i32.MIN_VALUE) {
      return <i32>value;
    }
    this.setError(new Error(
      "interger overflow: value = " + value.toString() + "; bits = 32"
    ));
    return 0;
  }

  readInt64(): i64 {
    const prefix = this.reader.getUint8();

    if (this.isFixedInt(prefix)) {
      return <i64>prefix;
    }
    if (this.isNegativeFixedInt(prefix)) {
      return <i64>(<i8>prefix);
    }
    switch (prefix) {
      case Format.INT8:
        return <i64>this.reader.getInt8();
      case Format.INT16:
        return <i64>this.reader.getInt16();
      case Format.INT32:
        return <i64>this.reader.getInt32();
      case Format.INT64:
        return this.reader.getInt64();
      case Format.UINT8:
        return <i64>this.reader.getUint8();
      case Format.UINT16:
        return <i64>this.reader.getUint16();
      case Format.UINT32:
        return <i64>this.reader.getUint32();
      case Format.UINT64: {
        const value = this.reader.getUint64();
        if (value <= <u64>i64.MAX_VALUE) {
          return <i64>value;
        }
        this.setError(new Error(
          "interger overflow: value = " + value.toString() + "; type = i64"
        ));
        return 0;
      }
      default:
        this.setError(new Error("bad prefix for int"));
        return 0;
    }
  }

  readUInt8(): u8 {
    const value = this.readUInt64();
    if (value <= <u64>u8.MAX_VALUE) {
      return <u8>value;
    }
    this.setError(new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 8"
    ));
    return 0;
  }

  readUInt16(): u16 {
    const value = this.readUInt64();
    if (value <= <u64>u16.MAX_VALUE) {
      return <u16>value;
    }
    this.setError(new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 16"
    ));
    return 0;
  }

  readUInt32(): u32 {
    const value = this.readUInt64();
    if (value <= <u64>u32.MAX_VALUE) {
      return <u32>value;
    }
    this.setError(new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 32"
    ));
    return 0;
  }

  readUInt64(): u64 {
    const prefix = this.reader.getUint8();

    if (this.isFixedInt(prefix)) {
      return <u64>prefix;
    } else if (this.isNegativeFixedInt(prefix)) {
      this.setError(new Error("bad prefix for unsigned int"));
      return 0;
    }

    switch (prefix) {
      case Format.UINT8:
        return <u64>this.reader.getUint8();
      case Format.UINT16:
        return <u64>this.reader.getUint16();
      case Format.UINT32:
        return <u64>this.reader.getUint32();
      case Format.UINT64:
        return this.reader.getUint64();
      case Format.INT8: {
        const value = this.reader.getInt8();
        if (value >= 0) {
          return <u64>value;
        }
        this.setError(new Error(
          "interger underflow: value = " + value.toString() + "; type = u64"
        ));
        return 0;
      }
      case Format.INT16: {
        const value = this.reader.getInt16();
        if (value >= 0) {
          return <u64>value;
        }
        this.setError(new Error(
          "interger underflow: value = " + value.toString() + "; type = u64"
        ));
        return 0;
      }
      case Format.INT32: {
        const value = this.reader.getInt32();
        if (value >= 0) {
          return <u64>value;
        }
        this.setError(new Error(
          "interger underflow: value = " + value.toString() + "; type = u64"
        ));
        return 0;
      }
      case Format.INT64: {
        const value = this.reader.getInt64();
        if (value >= 0) {
          return <u64>value;
        }
        this.setError(new Error(
          "interger underflow: value = " + value.toString() + "; type = u64"
        ));
        return 0;
      }
      default:
        this.setError(new Error("bad prefix for int"));
        return 0;
    }
  }

  readFloat32(): f32 {
    const prefix = this.reader.getUint8();
    if (this.isFloat32(prefix)) {
      return <f32>this.reader.getFloat32();
    } else if (this.isFloat64(prefix)) {
      const value = this.reader.getFloat64();
      const diff = <f64>f32.MAX_VALUE - value;

      if (abs(diff) <= <f64>f32.EPSILON) {
        return f32.MAX_VALUE;
      } else if (diff < 0) {
        this.setError(new Error(
          "float overflow: value = " + value.toString() + "; type = f32"
        ));
        return 0;
      } else {
        return <f32>value;
      }
    }
    if (this.isFixedInt(prefix)) {
      return <f32>prefix;
    }
    if (this.isNegativeFixedInt(prefix)) {
      return <f32>(<i8>prefix);
    }
    switch (prefix) {
      case Format.INT8:
        return <f32>this.reader.getInt8();
      case Format.INT16:
        return <f32>this.reader.getInt16();
      case Format.INT32:
        return <f32>this.reader.getInt32();
      case Format.INT64:
        return <f32>this.reader.getInt64();
      case Format.UINT8:
        return <f32>this.reader.getUint8();
      case Format.UINT16:
        return <f32>this.reader.getUint16();
      case Format.UINT32:
        return <f32>this.reader.getUint32();
      case Format.UINT64:
        return <f32>this.reader.getUint64();
    }
    this.setError(new Error("bad prefix for float"));
    return 0;
  }

  readFloat64(): f64 {
    const prefix = this.reader.getUint8();
    if (this.isFloat64(prefix)) {
      return <f64>this.reader.getFloat64();
    } else if (this.isFloat32(prefix)) {
      return <f64>this.reader.getFloat32();
    }
    switch (prefix) {
      case Format.INT8:
        return <f64>this.reader.getInt8();
      case Format.INT16:
        return <f64>this.reader.getInt16();
      case Format.INT32:
        return <f64>this.reader.getInt32();
      case Format.INT64:
        return <f64>this.reader.getInt64();
      case Format.UINT8:
        return <f64>this.reader.getUint8();
      case Format.UINT16:
        return <f64>this.reader.getUint16();
      case Format.UINT32:
        return <f64>this.reader.getUint32();
      case Format.UINT64:
        return <f64>this.reader.getUint64();
    }
    this.setError(new Error("bad prefix for float"));
    return 0;
  }

  readString(): string {
    const strLen = this.readStringLength();
    const stringBytes = this.reader.getBytes(strLen);
    return String.UTF8.decode(stringBytes);
  }

  readStringLength(): u32 {
    const leadByte = this.reader.getUint8();
    if (this.isFixedString(leadByte)) {
      return leadByte & 0x1f;
    }
    if (this.isFixedArray(leadByte)) {
      return <u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    }
    switch (leadByte) {
      case Format.STR8:
        return <u32>this.reader.getUint8();
      case Format.STR16:
        return <u32>this.reader.getUint16();
      case Format.STR32:
        return this.reader.getUint32();
    }

    this.setError(new RangeError(E_INVALIDLENGTH + leadByte.toString()));
    return 0;
  }

  readBinLength(): u32 {
    if (this.isNextNil()) {
      return 0;
    }
    const leadByte = this.reader.getUint8();
    if (this.isFixedArray(leadByte)) {
      return <u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    }
    switch (leadByte) {
      case Format.BIN8:
        return <u32>this.reader.getUint8();
      case Format.BIN16:
        return <u32>this.reader.getUint16();
      case Format.BIN32:
        return this.reader.getUint32();
    }
    this.setError(new RangeError(E_INVALIDLENGTH));
    return 0;
  }

  readByteArray(): ArrayBuffer {
    const arrLength = this.readBinLength();
    const arrBytes = this.reader.getBytes(arrLength);
    return arrBytes;
  }

  readArraySize(): u32 {
    const leadByte = this.reader.getUint8();
    if (this.isFixedArray(leadByte)) {
      return <u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    }

    switch (leadByte) {
      case Format.ARRAY16:
        return <u32>this.reader.getUint16();
      case Format.ARRAY32:
        return this.reader.getUint32();
      case Format.NIL:
        return 0;
    }

    this.setError(new RangeError(E_INVALIDLENGTH + leadByte.toString()));
    return 0;
  }

  readMapSize(): u32 {
    const leadByte = this.reader.getUint8();
    if (this.isFixedMap(leadByte)) {
      return <u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    }
    switch (leadByte) {
      case Format.MAP16:
        return <u32>this.reader.getUint16();
      case Format.MAP32:
        return this.reader.getUint32();
      case Format.NIL:
        return 0;
    }

    this.setError(new RangeError(E_INVALIDLENGTH + leadByte.toString()));
    return 0;
  }

  isFloat32(u: u8): bool {
    return u == Format.FLOAT32;
  }

  isFloat64(u: u8): bool {
    return u == Format.FLOAT64;
  }

  isFixedInt(u: u8): bool {
    return u >> 7 == 0;
  }

  isNegativeFixedInt(u: u8): bool {
    return (u & 0xe0) == Format.NEGATIVE_FIXINT;
  }

  isFixedMap(u: u8): bool {
    return (u & 0xf0) == Format.FIXMAP;
  }

  isFixedArray(u: u8): bool {
    return (u & 0xf0) == Format.FIXARRAY;
  }

  isFixedString(u: u8): bool {
    return (u & 0xe0) == Format.FIXSTR;
  }

  isNil(u: u8): bool {
    return u == Format.NIL;
  }

  skip(): void {
    // getSize handles discarding 'msgpack header' info
    let numberOfObjectsToDiscard = this.getSize();

    while (numberOfObjectsToDiscard > 0) {
      this.skip(); // discard next object
      numberOfObjectsToDiscard--;
    }
  }

  getSize(): i32 {
    const leadByte = this.reader.getUint8(); // will discard one
    let objectsToDiscard = <i32>0;
    // Handled for fixed values
    if (this.isNegativeFixedInt(leadByte)) {
      // noop, will just discard the leadbyte
    } else if (this.isFixedInt(leadByte)) {
      // noop, will just discard the leadbyte
    } else if (this.isFixedString(leadByte)) {
      let strLength = leadByte & 0x1f;
      this.reader.discard(strLength);
    } else if (this.isFixedArray(leadByte)) {
      // TODO handle overflow
      objectsToDiscard = <i32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    } else if (this.isFixedMap(leadByte)) {
      // TODO handle overflow
      objectsToDiscard =
        2 * <i32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    } else {
      switch (leadByte) {
        case Format.NIL:
          break;
        case Format.TRUE:
          break;
        case Format.FALSE:
          break;
        case Format.BIN8:
          this.reader.discard(<i32>this.reader.getUint8());
          break;
        case Format.BIN16:
          this.reader.discard(<i32>this.reader.getUint16());
          break;
        case Format.BIN32:
          this.reader.discard(<i32>this.reader.getUint32());
          break;
        case Format.FLOAT32:
          this.reader.discard(4);
          break;
        case Format.FLOAT64:
          this.reader.discard(8);
          break;
        case Format.UINT8:
          this.reader.discard(1);
          break;
        case Format.UINT16:
          this.reader.discard(2);
          break;
        case Format.UINT32:
          this.reader.discard(4);
          break;
        case Format.UINT64:
          this.reader.discard(8);
          break;
        case Format.INT8:
          this.reader.discard(1);
          break;
        case Format.INT16:
          this.reader.discard(2);
          break;
        case Format.INT32:
          this.reader.discard(4);
          break;
        case Format.INT64:
          this.reader.discard(8);
          break;
        case Format.FIXEXT1:
          this.reader.discard(2);
          break;
        case Format.FIXEXT2:
          this.reader.discard(3);
          break;
        case Format.FIXEXT4:
          this.reader.discard(5);
          break;
        case Format.FIXEXT8:
          this.reader.discard(9);
          break;
        case Format.FIXEXT16:
          this.reader.discard(17);
          break;
        case Format.STR8:
          this.reader.discard(this.reader.getUint8());
          break;
        case Format.STR16:
          this.reader.discard(this.reader.getUint16());
          break;
        case Format.STR32:
          // TODO overflow, need to modify discard and underlying array buffer
          this.reader.discard(this.reader.getUint32());
          break;
        case Format.ARRAY16:
          //TODO OVERFLOW
          objectsToDiscard = <i32>this.reader.getUint16();
          break;
        case Format.ARRAY32:
          //TODO OVERFLOW
          objectsToDiscard = <i32>this.reader.getUint32();
          break;
        case Format.MAP16:
          //TODO OVERFLOW
          objectsToDiscard = 2 * <i32>this.reader.getUint16();
          break;
        case Format.MAP32:
          //TODO OVERFLOW
          objectsToDiscard = 2 * <i32>this.reader.getUint32();
          break;
        default:
          this.setError(new TypeError(
            "invalid prefix, bad encoding for val: " + leadByte.toString()
          ));
          return 0;
      }
    }

    return objectsToDiscard;
  }

  readArray<T>(fn: (decoder: Decoder) => T): Array<T> {
    const size = this.readArraySize();
    let a = new Array<T>();
    for (let i: u32 = 0; i < size; i++) {
      const item = fn(this);
      a.push(item);
    }
    return a;
  }

  readNullableArray<T>(fn: (decoder: Decoder) => T): Array<T> | null {
    if (this.isNextNil()) {
      return null;
    }
    return this.readArray(fn);
  }

  readMap<K, V>(
    keyFn: (decoder: Decoder) => K,
    valueFn: (decoder: Decoder) => V
  ): Map<K, V> {
    const size = this.readMapSize();
    let m = new Map<K, V>();
    for (let i: u32 = 0; i < size; i++) {
      const key = keyFn(this);
      const value = valueFn(this);
      m.set(key, value);
    }
    return m;
  }

  readNullableMap<K, V>(
    keyFn: (decoder: Decoder) => K,
    valueFn: (decoder: Decoder) => V
  ): Map<K, V> | null {
    if (this.isNextNil()) {
      return null;
    }
    return this.readMap(keyFn, valueFn);
  }

  error(): Error | null {
    if (this.err) {
      return this.err;
    }
    return this.reader.error();
  }
}
