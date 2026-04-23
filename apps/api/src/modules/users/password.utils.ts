import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, stored: string): boolean => {
  const [salt, originalHash] = stored.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const currentHash = scryptSync(password, salt, 64);
  const expectedHash = Buffer.from(originalHash, "hex");

  return timingSafeEqual(currentHash, expectedHash);
};
