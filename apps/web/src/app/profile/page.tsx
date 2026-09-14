import {redirect} from "next/navigation";

import {ProfileForm} from "@/features/auth/ProfileForm";
import {currentSession} from "@/features/auth/session";

export default async function ProfilePage() {
    const session = await currentSession();
    if (session.kind === "signed-out") redirect("/sign-in");
    if (!session.user) redirect("/gate");
    return <ProfileForm user={session.user}/>;
}
