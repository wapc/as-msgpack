import { Decoder } from "./decoder";
import { Writer } from "./writer";

export interface Codec {
  decode(decoder: Decoder): void;
  encoder(encoder: Writer): void;
}
