import { readFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { NextRequest } from "next/server";

export const fixture = (name: string) => readFileSync(path.join(__dirname, name));

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Buffer) => (bytes.reduce((c, byte) => CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function frameControl(sequence: number, width: number, height: number) {
  const data = Buffer.alloc(26);
  data.writeUInt32BE(sequence, 0);
  data.writeUInt32BE(width, 4);
  data.writeUInt32BE(height, 8);
  data.writeUInt16BE(1, 20);
  data.writeUInt16BE(10, 22);
  return chunk("fcTL", data);
}

export function png(width: number, height: number, { animated = false } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 1;
  const pixels = deflateSync(Buffer.alloc(height * (1 + Math.ceil(width / 8))));
  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(2, 0);
  const secondFrame = Buffer.concat([Buffer.from([0, 0, 0, 2]), pixels]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    ...(animated ? [chunk("acTL", actl), frameControl(0, width, height)] : []),
    chunk("IDAT", pixels),
    ...(animated ? [frameControl(1, width, height), chunk("fdAT", secondFrame)] : []),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function screenshotRequest(url: string, fields: Record<string, string | File>, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  const encoded = new Request(url, { method: "POST", body: form });
  const body = await encoded.arrayBuffer();
  return new NextRequest(url, {
    method: "POST",
    body,
    headers: { ...headers, "content-type": encoded.headers.get("content-type") ?? "", "content-length": String(body.byteLength) },
  });
}
