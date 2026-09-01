import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-8 text-2xl font-bold">
        Razex<span className="brand-text"> Labs</span>
      </Link>
      <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-8">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Enter your dashboard password.
        </p>
        <form
          action={async (formData: FormData) => {
            "use server";
            try {
              await signIn("credentials", {
                password: formData.get("password"),
                redirectTo: "/dashboard",
              });
            } catch (e) {
              if (e instanceof AuthError) redirect("/login?error=1");
              throw e;
            }
          }}
        >
          <input
            name="password"
            type="password"
            required
            autoFocus
            placeholder="Password"
            className="mt-6 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-3 text-center"
          />
          {error && (
            <p className="mt-3 text-sm text-red-400">Wrong password.</p>
          )}
          <button className="brand-gradient mt-4 w-full rounded-full px-6 py-3 font-semibold text-white">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
