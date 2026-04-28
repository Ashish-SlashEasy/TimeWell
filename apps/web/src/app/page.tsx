import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-serif text-5xl text-forest">Timewell</h1>
      <p className="mt-4 max-w-md text-base text-ink/70">
        Collaborative digital memory cards. The web client is bootstrapped — the full UI is built
        in milestones M2 through M5.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/signin"
          className="rounded-md bg-forest px-5 py-2.5 text-sm font-medium text-cream shadow-sm hover:bg-forest-dark"
        >
          Sign in
        </Link>
        <Link
          href="/help"
          className="rounded-md border border-forest/30 px-5 py-2.5 text-sm font-medium text-forest hover:bg-forest/5"
        >
          Help
        </Link>
      </div>
    </main>
  );
}
