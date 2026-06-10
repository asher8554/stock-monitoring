// 포트폴리오 암호화와 복호화를 담당한다.
export interface EncryptedPayload {
  version: 1;
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  algorithm: "AES-GCM";
  iv: string;
  ciphertext: string;
  createdAt: string;
}

export interface EncryptionOptions {
  iterations?: number;
  salt?: Uint8Array;
  iv?: Uint8Array;
}

const DEFAULT_ITERATIONS = 310_000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function encryptPayload(payload: unknown, password: string, options: EncryptionOptions = {}): Promise<EncryptedPayload> {
  assertPassword(password);
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const iv = options.iv ?? crypto.getRandomValues(new Uint8Array(12));
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const key = await deriveAesKey(password, salt, iterations);
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(plaintext));

  return {
    version: 1,
    kdf: "PBKDF2-SHA-256",
    iterations,
    salt: toBase64(salt),
    algorithm: "AES-GCM",
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
  };
}

export async function decryptPayload(encrypted: EncryptedPayload, password: string): Promise<unknown> {
  assertPassword(password);
  const salt = fromBase64(encrypted.salt);
  const iv = fromBase64(encrypted.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);
  const key = await deriveAesKey(password, salt, encrypted.iterations);
  const plaintext = await crypto.subtle.decrypt({ name: encrypted.algorithm, iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext));
  return JSON.parse(textDecoder.decode(plaintext));
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

function assertPassword(password: string): void {
  if (!password) {
    throw new Error("Password is required");
  }
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
