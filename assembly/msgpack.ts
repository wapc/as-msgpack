import { DataReader } from "./datareader";
import { E_INVALIDLENGTH } from "util/error";

export class Decoder {
  private reader: DataReader;

  constructor(ua: ArrayBuffer) {
    this.reader = new DataReader(ua, 0, ua.byteLength);
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
    throw new Error("bad value for bool");
  }

  readInt8(): i8 {
    const value = this.readInt64();
    if (value <= <i64>i8.MAX_VALUE || value >= <i64>i8.MIN_VALUE) {
      return <i8>value;
    }
    throw new Error(
      "interger overflow: value = " + value.toString() + "; bits = 8"
    );
  }
  readInt16(): i16 {
    const value = this.readInt64();
    if (value <= <i64>i16.MAX_VALUE || value >= <i64>i16.MIN_VALUE) {
      return <i16>value;
    }
    throw new Error(
      "interger overflow: value = " + value.toString() + "; bits = 16"
    );
  }
  readInt32(): i32 {
    const value = this.readInt64();
    if (value <= <i64>i32.MAX_VALUE || value >= <i64>i32.MIN_VALUE) {
      return <i32>value;
    }
    throw new Error(
      "interger overflow: value = " + value.toString() + "; bits = 32"
    );
  }

  readInt64(): i64 {
    const prefix = this.reader.getUint8();

    if (this.isFixedInt(prefix) || this.isNegativeFixedInt(prefix)) {
      return <i64>prefix;
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
      default:
        throw new Error("bad prefix for int");
    }
  }

  readUInt8(): u8 {
    const value = this.readUInt64();
    if (value <= <u64>u8.MAX_VALUE || value >= <u64>u8.MIN_VALUE) {
      return <u8>value;
    }
    throw new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 8"
    );
  }

  readUInt16(): u16 {
    const value = this.readUInt64();
    if (value <= <u64>u16.MAX_VALUE || value >= <u64>u16.MIN_VALUE) {
      return <u16>value;
    }
    throw new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 16"
    );
  }

  readUInt32(): u32 {
    const value = this.readUInt64();
    if (value <= <u64>u32.MAX_VALUE || value >= <u64>u32.MIN_VALUE) {
      return <u32>value;
    }
    throw new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 32"
    );
  }

  readUInt64(): u64 {
    const prefix = this.reader.getUint8();

    if (this.isFixedInt(prefix)) {
      return <u64>prefix;
    } else if (this.isNegativeFixedInt(prefix)) {
      throw new Error("bad prefix");
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
      default:
        throw new Error("bad prefix for unsigned int");
    }
  }

  readFloat32(): f32 {
    const prefix = this.reader.getUint8();
    if (this.isFloat32(prefix)) {
      return <f32>this.reader.getFloat32();
    }
    throw new Error("bad prefix");
  }

  readFloat64(): f64 {
    const prefix = this.reader.getUint8();
    if (this.isFloat64(prefix)) {
      return <f64>this.reader.getFloat64();
    }
    throw new Error("bad prefix");
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
    switch (leadByte) {
      case Format.STR8:
        return <u32>this.reader.getUint8();
      case Format.STR16:
        return <u32>this.reader.getUint16();
      case Format.STR32:
        return this.reader.getUint32();
    }

    throw new RangeError(E_INVALIDLENGTH + leadByte.toString());
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
    throw new RangeError(E_INVALIDLENGTH);
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
    } else if (leadByte == Format.ARRAY16) {
      return <u32>this.reader.getUint16();
    } else if (leadByte == Format.ARRAY32) {
      return this.reader.getUint32();
    } else if (leadByte == Format.NIL) {
      return 0;
    }
    throw new RangeError(E_INVALIDLENGTH + leadByte.toString());
  }

  readMapSize(): u32 {
    const leadByte = this.reader.getUint8();
    if (this.isFixedMap(leadByte)) {
      return <u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    } else if (leadByte == Format.MAP16) {
      return <u32>this.reader.getUint16();
    } else if (leadByte == Format.MAP32) {
      return this.reader.getUint32();
    }
    throw new RangeError(E_INVALIDLENGTH);
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
      this.getSize(); // discard next object
      numberOfObjectsToDiscard--;
    }
  }

  getSize(): i32 {
    const leadByte = this.reader.getUint8(); // will discard one
    let objectsToDiscard = <i32>0;
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
          objectsToDiscard = <i32>(
            (leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE)
          );
        } else if (this.isFixedMap(leadByte)) {
          // TODO handle overflow
          objectsToDiscard =
            2 * <i32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
        } else {
          throw new TypeError(
            "invalid prefix, bad encoding for val: " + leadByte.toString()
          );
        }
    }

    return objectsToDiscard;
  }
}

export class Encoder {
  private reader: DataReader;

  constructor(ua: ArrayBuffer) {
    this.reader = new DataReader(ua, 0, ua.byteLength);
  }

  writeNil(): void {
    this.reader.setUint8(<u8>Format.NIL);
  }

  writeBool(value: bool): void {
    this.reader.setUint8(value ? <u8>Format.TRUE : <u8>Format.FALSE);
  }

  writeInt8(value: i8): void {
    this.writeInt64(<i64>value);
  }
  writeInt16(value: i16): void {
    this.writeInt64(<i64>value);
  }
  writeInt32(value: i32): void {
    this.writeInt64(<i64>value);
  }
  writeInt64(value: i64): void {
    if (value >= 0 && value < 1 << 7) {
      this.reader.setUint8(<u8>value);
    } else if (value < 0 && value >= -(1 << 5)) {
      this.reader.setUint8((<u8>value) | (<u8>Format.NEGATIVE_FIXINT));
    } else if (value <= <i64>i8.MAX_VALUE && value >= <i64>i8.MIN_VALUE) {
      this.reader.setUint8(<u8>Format.INT8);
      this.reader.setInt8(<i8>value);
    } else if (value <= <i64>i16.MAX_VALUE && value >= <i64>i16.MIN_VALUE) {
      this.reader.setUint8(<u8>Format.INT16);
      this.reader.setInt16(<i16>value);
    } else if (value <= <i64>i32.MAX_VALUE && value >= <i64>i32.MIN_VALUE) {
      this.reader.setUint8(<u8>Format.INT32);
      this.reader.setInt32(<i32>value);
    } else {
      this.reader.setUint8(<u8>Format.INT64);
      this.reader.setInt64(value);
    }
  }

  writeUInt8(value: u8): void {
    this.writeUInt64(<u64>value);
  }
  writeUInt16(value: u16): void {
    this.writeUInt64(<u64>value);
  }
  writeUInt32(value: u32): void {
    this.writeUInt64(<u64>value);
  }
  writeUInt64(value: u64): void {
    if (value < 1 << 7) {
      this.reader.setUint8(<u8>value);
    } else if (value <= <u64>i8.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.INT8);
      this.reader.setUint8(<u8>value);
    } else if (value <= <u64>i16.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.INT16);
      this.reader.setUint16(<u16>value);
    } else if (value <= <u64>i32.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.INT32);
      this.reader.setUint32(<u32>value);
    } else {
      this.reader.setUint8(<u8>Format.INT64);
      this.reader.setUint64(value);
    }
  }

  writeFloat32(value: f32): void {
    this.reader.setUint8(<u8>Format.FLOAT32);
    this.reader.setFloat32(value);
  }

  writeFloat64(value: f64): void {
    this.reader.setUint8(<u8>Format.FLOAT64);
    this.reader.setFloat64(value);
  }

  writeStringLength(length: u32): void {
    if (length < 32) {
      this.reader.setUint8((<u8>length) | (<u8>Format.FIXSTR));
    } else if (length <= <u32>u8.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.STR8);
      this.reader.setUint8(<u8>length);
    } else if (length <= <u32>u16.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.STR16);
      this.reader.setUint16(<u16>length);
    } else {
      this.reader.setUint8(<u8>Format.STR32);
      this.reader.setUint32(length);
    }
  }

  writeString(value: string): void {
    const buf = String.UTF8.encode(value);
    this.writeStringLength(buf.byteLength);
    this.reader.setBytes(buf);
  }

  writeBinLength(length: u32): void {
    if (length <= <u32>u8.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.BIN8);
      this.reader.setUint8(<u8>length);
    } else if (length <= <u32>u16.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.BIN16);
      this.reader.setUint16(<u16>length);
    } else {
      this.reader.setUint8(<u8>Format.BIN32);
      this.reader.setUint32(length);
    }
  }

  writeByteArray(ab: ArrayBuffer): void {
    if (ab.byteLength == 0) {
      this.writeNil();
      return
    }
    this.writeBinLength(ab.byteLength);
    this.reader.setBytes(ab);
  }

  writeArraySize(length: u32): void {
    if (length < 16) {
      this.reader.setInt8((<u8>length) | (<u8>Format.FIXARRAY));
    } else if (length <= <u32>u16.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.ARRAY16);
      this.reader.setUint16(<u16>length);
    } else {
      this.reader.setUint8(<u8>Format.ARRAY32);
      this.reader.setUint32(length);
    }
  }

  writeMapSize(length: u32): void {
    if (length < 16) {
      this.reader.setInt8((<u8>length) | (<u8>Format.FIXMAP));
    } else if (length <= <u32>u16.MAX_VALUE) {
      this.reader.setUint8(<u8>Format.MAP16);
      this.reader.setUint16(<u16>length);
    } else {
      this.reader.setUint8(<u8>Format.MAP32);
      this.reader.setUint32(length);
    }
  }
}

export class Sizer {
  length: i32;

  constructor() {}

  writeNil(): void {
    this.length++;
  }

  writeString(value: string): void {
    const buf = String.UTF8.encode(value);
    this.writeStringLength(buf.byteLength);
    this.length += buf.byteLength;
  }

  writeStringLength(length: u32): void {
    if (length < 32) {
      this.length++;
    } else if (length <= <u32>u8.MAX_VALUE) {
      this.length += 2;
    } else if (length <= <u32>u16.MAX_VALUE) {
      this.length += 3;
    } else {
      this.length += 5;
    }
  }

  writeBool(value: bool): void {
    this.length++;
  }

  writeArraySize(length: u32): void {
    if (length < 16) {
      this.length++;
    } else if (length <= <u32>u16.MAX_VALUE) {
      this.length += 3;
    } else {
      this.length += 5;
    }
  }

  writeBinLength(length: u32): void {
    if (length <= <u32>u8.MAX_VALUE) {
      this.length += 2;
    } else if (length <= <u32>u16.MAX_VALUE) {
      this.length += 3;
    } else {
      this.length += 5;
    }
  }

  writeByteArray(ab: ArrayBuffer): void {
    if (ab.byteLength == 0) {
      this.length++; //nil byte
      return
    }
    this.writeBinLength(ab.byteLength);
    this.length += ab.byteLength + 1;
  }

  writeMapSize(length: u32): void {
    if (length < 16) {
      this.length++;
    } else if (length <= <u32>u16.MAX_VALUE) {
      this.length += 3;
    } else {
      this.length += 5;
    }
  }

  writeInt8(value: i8): void {
    this.writeInt64(<i64>value);
  }
  writeInt16(value: i16): void {
    this.writeInt64(<i64>value);
  }
  writeInt32(value: i32): void {
    this.writeInt64(<i64>value);
  }
  writeInt64(value: i64): void {
    if (value >= -(1 << 5) && value < 1 << 7) {
      this.length++;
    } else if (value < 1 << 7 && value >= -(1 << 7)) {
      this.length += 2;
    } else if (value < 1 << 15 && value >= -(1 << 15)) {
      this.length += 3;
    } else if (value < 1 << 31 && value >= -(1 << 31)) {
      this.length += 5;
    } else {
      this.length += 9;
    }
  }

  writeUInt8(value: u8): void {
    this.writeUInt64(<u64>value);
  }
  writeUInt16(value: u16): void {
    this.writeUInt64(<u64>value);
  }
  writeUInt32(value: u32): void {
    this.writeUInt64(<u64>value);
  }
  writeUInt64(value: u64): void {
    if (value < 1 << 7) {
      this.length++;
    } else if (value < 1 << 8) {
      this.length += 2;
    } else if (value < 1 << 16) {
      this.length += 3;
    } else if (value < 1 << 32) {
      this.length += 5;
    } else {
      this.length += 9;
    }
  }

  writeFloat32(value: f32): void {
    this.length += 5;
  }
  writeFloat64(value: f64): void {
    this.length += 9;
  }
}

const enum Format {
  ERROR = 0,
  Four_Bytes = 0xffffffff,
  FOUR_LEAST_SIG_BITS_IN_BYTE = 0x0f,
  FOUR_SIG_BITS_IN_BYTE = 0xf0,
  POSITIVE_FIXINT = 0x00,
  FIXMAP = 0x80,
  FIXARRAY = 0x90,
  FIXSTR = 0xa0,
  NIL = 0xc0,
  FALSE = 0xc2,
  TRUE = 0xc3,
  BIN8 = 0xc4,
  BIN16 = 0xc5,
  BIN32 = 0xc6,
  EXT8 = 0xc7,
  EXT16 = 0xc8,
  EXT32 = 0xc9,
  FLOAT32 = 0xca,
  FLOAT64 = 0xcb,
  UINT8 = 0xcc,
  UINT16 = 0xcd,
  UINT32 = 0xce,
  UINT64 = 0xcf,
  INT8 = 0xd0,
  INT16 = 0xd1,
  INT32 = 0xd2,
  INT64 = 0xd3,
  FIXEXT1 = 0xd4,
  FIXEXT2 = 0xd5,
  FIXEXT4 = 0xd6,
  FIXEXT8 = 0xd7,
  FIXEXT16 = 0xd8,
  STR8 = 0xd9,
  STR16 = 0xda,
  STR32 = 0xdb,
  ARRAY16 = 0xdc,
  ARRAY32 = 0xdd,
  MAP16 = 0xde,
  MAP32 = 0xdf,
  NEGATIVE_FIXINT = 0xe0
}
