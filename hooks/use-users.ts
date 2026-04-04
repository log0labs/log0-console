import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export interface User {
  userId: string;
  email: string;
  role: "ADMIN" | "ENGINEER" | "VIEWER";
  createdAt: string;
}

export function useUsers() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await authApi.get<User[]>("/api/v1/users");
      return data;
    },
    enabled: !!accessToken,
  });
}
