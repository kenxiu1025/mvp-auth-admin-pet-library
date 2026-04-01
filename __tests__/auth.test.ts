import { hashPassword, verifyPassword, validatePassword } from "@/lib/auth";

describe("validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("short")).toBe(false);
    expect(validatePassword("1234567")).toBe(false);
    expect(validatePassword("")).toBe(false);
  });

  it("accepts passwords of 8 or more characters", () => {
    expect(validatePassword("12345678")).toBe(true);
    expect(validatePassword("longpassword")).toBe(true);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies a password correctly", () => {
    const password = "TestPass123";
    const hash = hashPassword(password);
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("CorrectPassword1");
    expect(verifyPassword("WrongPassword1", hash)).toBe(false);
  });

  it("returns false for null or empty hash", () => {
    expect(verifyPassword("anything", null)).toBe(false);
    expect(verifyPassword("anything", undefined)).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });

  it("produces different hashes for the same password (random salt)", () => {
    const password = "SamePassword1";
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    expect(hash1).not.toBe(hash2);
    expect(verifyPassword(password, hash1)).toBe(true);
    expect(verifyPassword(password, hash2)).toBe(true);
  });
});
