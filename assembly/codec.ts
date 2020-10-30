import { Decoder } from "./decoder";
import { Writer } from "./writer";

export interface Codec {
  decode(decoder: Decoder): void;
  encode(encoder: Writer): void;
}
