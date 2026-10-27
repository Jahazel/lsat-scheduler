import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;
const HASH_THAT_NO_PASSWORD_MATCHES_FOR_UNKNOWN_EMAILS = "$2b$12$xVtZxreXrFVRzVXUrNaM6ODnLIzQKxnNuLnkRQoD04p2UEpckLfN6";

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

export async function passwordMatches(password: string, hash: string | null) {
  const matches = await bcrypt.compare(password, hash ?? HASH_THAT_NO_PASSWORD_MATCHES_FOR_UNKNOWN_EMAILS);
  return hash !== null && matches;
}
