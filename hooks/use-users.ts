import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export type Role = "ADMIN" | "ENGINEER" | "VIEWER";

export interface User {
  userId: string;
  email: string;
  role: Role;
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

/** Change a member's role. They are signed out of other devices so the new role takes effect. */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) =>
      (await authApi.patch<User>(`/api/v1/users/${userId}/role`, { role }))
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await authApi.delete(`/api/v1/users/${userId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
