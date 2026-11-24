import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <Suspense>
        <SignUp />
      </Suspense>
    </main>
  );
}
