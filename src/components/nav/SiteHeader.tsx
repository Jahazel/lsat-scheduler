import { isAdminUser } from "@/lib/accessControl";
import { dateInScheduleTimezone, timeForVerifiedUser } from "@/lib/adminTestWorkspace";
import { currentWeekInTimezone, isUploadWeekend } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { postgresAdminClock, studentSideNow } from "@/lib/studentClock";
import { auth } from "@/auth";
import { SignOutForm } from "@/components/SignOutForm";
import { Button, ButtonLink } from "@/components/ui/Button";
import { initialsFor, loadStudentNavState } from "@/lib/studentNav";
import AdminNav from "./AdminNav";
import StudentNav, { StudentTabBar } from "./StudentNav";
import { logOut } from "./actions";
import { BAR, HEADER, Logo } from "./shared";

function LogOutButton() {
  return (
    <SignOutForm action={logOut}>
      <Button type="submit" variant="text" size="md">Log out</Button>
    </SignOutForm>
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
            <ButtonLink href="/login" variant="text" size="md">Log in</ButtonLink>
            <ButtonLink href="/signup" size="md">Sign up</ButtonLink>
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
      weekHasSchedule: state?.hasCurrentWeek ?? false,
      uploadWeekend: isUploadWeekend(now, SCHEDULE_TIMEZONE),
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
