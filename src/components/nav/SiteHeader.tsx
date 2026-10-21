import { isAdminUser } from "@/lib/accessControl";
import { dateInScheduleTimezone, timeForVerifiedUser } from "@/lib/adminTestWorkspace";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { postgresAdminClock, studentSideNow } from "@/lib/studentClock";
import Link from "next/link";
import { auth } from "@/auth";
import { initialsFor, loadStudentNavState } from "@/lib/studentNav";
import AdminNav from "./AdminNav";
import StudentNav, { StudentTabBar } from "./StudentNav";
import { logOut } from "./actions";
import { FOCUS, Logo, cx } from "./shared";

const HEADER = "sticky top-0 z-40 border-b border-vellum-line bg-paper";
const BAR = "flex h-14 items-center justify-between px-4 md:h-16 md:px-8";
const LINK = cx("rounded-sm px-3 py-2 text-small text-smoke hover:bg-vellum", FOCUS);

function LogOutButton() {
  return (
    <form action={logOut}>
      <button type="submit" className={LINK}>Log out</button>
    </form>
  );
}

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
            <Link href="/signup" className={cx("rounded-sm bg-ink px-3 py-2 text-small font-medium text-chalk hover:bg-graphite-raised", FOCUS)}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  if (isAdminUser(user)) {
    const realNow = new Date();
    const currentUser = user.id ? await postgresAdminClock.findUser(user.id) : null;
    const now = timeForVerifiedUser(currentUser, realNow);
    const state = user.id ? await loadStudentNavState(user.id, now) : null;
    const testState = isAdminUser(currentUser) ? {
      date: dateInScheduleTimezone(now), realDate: dateInScheduleTimezone(realNow),
      weekStartDate: currentWeekInTimezone(now, SCHEDULE_TIMEZONE),
      simulated: !!currentUser.simulatedDate, onboarded: !!state,
      canRebuild: state?.hasCurrentWeek ?? false,
    } : undefined;
    return (
      <AdminNav
        testState={testState}
        initials={initialsFor(user.name, user.email)}
        email={user.email ?? ""}
        countdownLabel={state?.countdownLabel ?? null}
        isTestDay={state?.isTestDay ?? false}
        uploadNeeded={state?.uploadNeeded ?? false}
        logOut={logOut}
      />
    );
  }

  const state = user.id ? await loadStudentNavState(user.id, await studentSideNow(user)) : null;
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
