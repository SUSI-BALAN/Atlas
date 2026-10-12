import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const keyLength = 64;
const options = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const scrypt = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) => {
  scryptCallback(password, salt, keyLength, options, (error, hash) => error ? reject(error) : resolve(hash));
});

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1024) throw new Error("Password length is invalid");
  const salt = randomBytes(32);
  const hash = await scrypt(password, salt);
  return `scrypt-v1:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [version, saltHex, hashHex] = stored.split(":");
  if (version !== "scrypt-v1" || !saltHex || !hashHex || !/^[a-f\d]{64}$/i.test(saltHex) || !/^[a-f\d]{128}$/i.test(hashHex) || password.length > 1024) return false;
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, Buffer.from(hashHex, "hex"));
}
