interface JwtPayload {
  userId: string;
  tenantId: string;
  role: "ADMIN" | "ENGINEER" | "VIEWER";
}

export function decodeJwt(token: string): JwtPayload {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload)) as JwtPayload;
}
