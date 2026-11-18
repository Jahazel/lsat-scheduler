import { isAdminUser } from "@/lib/accessControl";
import { clockForVerifiedUser, dateInScheduleTimezone } from "@/lib/adminTestWorkspace";
import { MAX_AHEAD_DAYS, addDays, mondayOf } from "@/lib/walkthrough";
import { listScheduledWeeksForAccount } from "@/lib/weeklyScheduleRepository";
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
import { TopBarStepCount } from "@/app/onboarding/StepCount";
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
    const currentUser = user.id ? await postgresAdminClock.findUser(user.id) : null;
    const clock = clockForVerifiedUser(currentUser, new Date());
    const state = user.id ? await loadStudentNavState(user.id, clock.now) : null;
    const today = dateInScheduleTimezone(clock.now);
    const walkthrough = user.id && isAdminUser(currentUser) ? {
      today, realDate: dateInScheduleTimezone(clock.real), simulated: clock.simulated,
      scheduledWeeks: await listScheduledWeeksForAccount(user.id, mondayOf(today), addDays(today, MAX_AHEAD_DAYS)),
    } : undefined;
    return (
      <AdminNav
        walkthrough={walkthrough}
        name={user.name?.trim() || null}
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
          <div className="flex min-w-0 items-center gap-4">
            <Logo href="/" form="mark-below-md" />
            <TopBarStepCount first={state ? "plan" : "goal"} />
          </div>
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
          name={user.name?.trim() || null}
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
