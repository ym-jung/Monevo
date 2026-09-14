import {redirect} from "next/navigation";

import {ConfirmForm} from "@/features/auth/ConfirmForm";

export default async function ConfirmPage({searchParams}: { searchParams: Promise<{ email?: string }> }) {
    const {email} = await searchParams;
    if (!email) redirect("/sign-up");
    return <ConfirmForm email={email}/>;
}
