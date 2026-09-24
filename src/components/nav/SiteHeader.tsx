import Link from "next/link";
import { auth } from "@/auth";
import { initialsFor, loadStudentNavState } from "@/lib/studentNav";
import StudentNav, { StudentTabBar } from "./StudentNav";
import { logOut } from "./actions";

const HEADER = "sticky top-0 z-40 border-b border-ink-100 bg-white";
const BAR = "flex h-14 items-center justify-between px-4 md:h-16 md:px-8";
const LINK = "rounded-md px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600";

function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="font-semibold tracking-tight text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600">
      DrillMap
    </Link>
  );
}

function LogOutButton() {
  return (
    <form action={logOut}>
      <button type="submit" className={LINK}>Log out</button>
    </form>
  );
}

// Returns the header plus whether a floating tab bar needs room at the bottom of the page.
export default async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <header className={HEADER}>
        <div className={BAR}>
          <Logo href="/" />
          <nav aria-label="Primary" className="flex items-center gap-1">
            <Link href="/login" className={LINK}>Log in</Link>
            <Link href="/signup" className="rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600">
              Sign up
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  if (user.role === "admin") {
    return (
      <header className={HEADER}>
        <div className={BAR}>
          <Logo href="/admin" />
          <nav aria-label="Primary" className="flex items-center gap-1">
            <Link href="/admin" className={LINK}>Admin</Link>
            <LogOutButton />
          </nav>
        </div>
      </header>
    );
  }

  const state = user.id ? await loadStudentNavState(user.id) : null;
  if (!state) {
    return (
      <header className={HEADER}>
        <div className={BAR}>
          <Logo href="/" />
          <LogOutButton />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className={HEADER}>
        <StudentNav
          initials={initialsFor(user.name, user.email)}
          email={user.email ?? ""}
          countdownLabel={state.countdownLabel}
          isTestDay={state.isTestDay}
          uploadNeeded={state.uploadNeeded}
          logOut={logOut}
        />
      </header>
      <StudentTabBar uploadNeeded={state.uploadNeeded} />
    </>
  );
}
