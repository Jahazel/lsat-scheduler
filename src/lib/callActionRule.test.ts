import { ESLint } from "eslint";
import { expect, it } from "vitest";

const eslint = new ESLint();
const adapterMessages = async (code: string, filePath: string) =>
  (await eslint.lintText(code, { filePath })).flatMap((result) => result.messages)
    .filter((message) => message.ruleId === "drillmap/call-actions-through-adapter")
    .map((message) => message.line);

const screen = (directive: string) => `${directive}
import { useActionState } from "react";
import { ActionForm } from "@/components/FailureNotice";
import { Button } from "@/components/ui/Button";
import { callAction } from "@/lib/callAction";
import { changePassword, signOutAllDevices, type PasswordChangeRefusal } from "./actions";

export function Card({ refusal }: { refusal: PasswordChangeRefusal }) {
  const [, adapted] = useActionState(callAction(changePassword), null);
  const [, raw] = useActionState(changePassword, null);
  void signOutAllDevices();
  return <>
    <ActionForm action={signOutAllDevices} />
    <form action={signOutAllDevices} />
    <Button formAction={signOutAllDevices} />
    {String(refusal)}{String(adapted)}{String(raw)}
  </>;
}
`;

it("refuses a client screen that calls a Server Action without the adapter", async () => {
  expect(await adapterMessages(screen(`"use client";`), "src/app/account/Card.tsx")).toEqual([10, 11, 14, 15]);
});

it("refuses a client hook in a .ts file that calls a Server Action directly", async () => {
  expect(await adapterMessages(`"use client";
import { deleteAccount } from "./actions";
export const useDelete = () => () => deleteAccount(null, new FormData());
`, "src/app/account/useDelete.ts")).toEqual([3]);
});

it("lets a server component import Server Actions to pass them on", async () => {
  expect(await adapterMessages(screen(""), "src/app/account/Card.tsx")).toEqual([]);
});

const propScreen = (directive: string) => `${directive}
import type { confirmWeeklyUpload, saveStudySettings, StudySettingsAnswer } from "./actions";

interface FormProps {
  onSave: typeof saveStudySettings;
}

export function Form({ onSave }: FormProps) {
  const sent = (input: Parameters<typeof onSave>[0]) => onSave(input);
  return <button onClick={() => void callAction(onSave)(null!)}>{String(sent)}</button>;
}

export function Check(props: { onConfirm: typeof confirmWeeklyUpload; onBack: () => void }) {
  props.onBack();
  void props.onConfirm(null!);
  return <Form onSave={props.onConfirm} />;
}

export function Flow({ confirm }: { confirm?: typeof confirmWeeklyUpload }) {
  void confirm?.(null!);
  return <><Check onConfirm={confirm} onBack={() => {}} /><form action={confirm} /></>;
}

export function Renamed({ onSave: save = async () => null }: FormProps) {
  return <button onClick={() => void save(null!)} />;
}

export function Unpacked(props: { onSend: (input: number) => Promise<StudySettingsAnswer>; onDone: (answer: StudySettingsAnswer) => void }) {
  const { onSend, onDone } = props;
  void callAction(onSend)(1);
  void onSend(2).then(onDone);
  return null;
}

export type Save = typeof saveStudySettings;
export const pick: () => StudySettingsAnswer = () => null;

export function Picker({ onPick, answer }: {
  onPick: (load: () => StudySettingsAnswer) => void;
  answer: Awaited<ReturnType<typeof saveStudySettings>>;
}) {
  onPick(() => null);
  return <p>{String(answer)}{String(pick)}</p>;
}
`;

it("refuses a client screen that calls a Server Action prop without the adapter", async () => {
  expect(await adapterMessages(propScreen(`"use client";`), "src/app/settings/Form.tsx")).toEqual([9, 15, 20, 21, 25, 31]);
});

it("lets a server component call a Server Action prop", async () => {
  expect(await adapterMessages(propScreen(""), "src/app/settings/Form.tsx")).toEqual([]);
});
