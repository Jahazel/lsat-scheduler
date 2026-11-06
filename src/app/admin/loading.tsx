import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";

const STUDENTS = [
  ["amy", "amy@example.test · 10 h 30 min per week"],
  ["benjamin", "benjamin@example.test · 9 h per week"],
  ["cy", "cy@example.test · 12 h per week"],
  ["dana", "dana@example.test · 10 h 30 min per week"],
  ["eli", "eli@example.test · 7 h 30 min per week"],
];

export default function AllStudentsLoading() {
  return (
    <PagePlaceholder>
      <div className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <p className="text-h3 font-semibold"><span className={PLACEHOLDER_SHAPE}>All students</span></p>
          <ul className="mt-8 divide-y divide-vellum-line border-y border-vellum-line">
            {STUDENTS.map(([name, line]) => (
              <li key={name} className="px-1 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx(PLACEHOLDER_SHAPE, "font-medium")}>{name}</span>
                  <span className="inline-flex items-center rounded-full bg-vellum-line px-2 py-0.5 text-caption font-medium text-transparent">Needs analytics</span>
                </div>
                <p className="mt-1 truncate text-small"><span className={PLACEHOLDER_SHAPE}>{line}</span></p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PagePlaceholder>
  );
}
