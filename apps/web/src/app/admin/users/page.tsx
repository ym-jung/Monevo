import {notFound} from "next/navigation";

import {ApprovalQueue} from "@/features/admin/ApprovalQueue";
import {requireActiveUser} from "@/features/auth/session";
import {apiGet} from "@/lib/api/server";
import type {AdminUserSummary, PageResponse} from "@/lib/api/types";

export default async function AdminUsersPage() {
    const user = await requireActiveUser();
    if (user.role !== "ADMIN") notFound();

    const pending = await apiGet<PageResponse<AdminUserSummary>>("admin/users", {
        query: {status: "PENDING", page: 0, size: 50},
    });

    return <ApprovalQueue viewer={user} initial={pending.items}/>;
}
