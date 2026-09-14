import {redirect} from "next/navigation";

import {Gate} from "@/features/auth/Gate";
import {requireGateContext} from "@/features/auth/session";

export default async function GatePage() {
    const {session, email} = await requireGateContext();
    if (session.kind === "active") redirect("/");
    if (session.kind === "signed-out") redirect("/sign-in");
    return <Gate status={session.status} email={email}/>;
}
