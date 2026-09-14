import {Suspense} from "react";

import {SignInForm} from "@/features/auth/SignInForm";

export default function SignInPage() {
    return (
        <Suspense>
            <SignInForm/>
        </Suspense>
    );
}
