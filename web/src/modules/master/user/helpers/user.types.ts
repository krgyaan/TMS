import type { User } from "@/types/api.types";

export interface UserViewDialogState {
    open: boolean;
    data: User | null;
}
