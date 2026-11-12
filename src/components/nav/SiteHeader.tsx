import { isAdminUser } from "@/lib/accessControl";
import { dateInScheduleTimezone, timeForVerifiedUser } from "@/lib/adminTestWorkspace";
import { currentWeekInTimezone, isUploadWeekend } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { postgresAdminClock, studentSideNow } from "@/lib/studentClock";
import { auth } from "@/auth";
import { loadAccountPlan } from "@/lib/billingRepository";
import { SignOutButton, SignOutForm } from "@/components/SignOutForm";
import { TAP_AREA } from "@/components/ui/classes";
import { initialsFor, loadStudentNavState } from "@/lib/studentNav";
import AdminNav from "./AdminNav";
import StudentNav, { StudentTabBar } from "./StudentNav";
import { logOut } from "./actions";
import SignedOutTopBar from "./SignedOutTopBar";
import { BAR, HEADER, Logo } from "./shared";

function LogOutButton() {
  return (
    <SignOutForm action={logOut}>
      <SignOutButton variant="text" size="md" className={TAP_AREA}>Log out</SignOutButton>
    </SignOutForm>
  );
}

export default async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return <SignedOutTopBar />;
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
      uploadWeekHasSchedule: state?.hasUploadWeek ?? false,
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
  if (!state || (await loadAccountPlan(user.id ?? "")).status.kind === "no_plan") {
    return (
      <header data-site-header="workspace" className={HEADER}>
        <div className={BAR}>
          <Logo href="/" form="mark-below-md" />
          <div data-page-fade>
            <LogOutButton />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header data-site-header="workspace" className={HEADER}>
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
