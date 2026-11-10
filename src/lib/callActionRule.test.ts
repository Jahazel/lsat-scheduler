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
