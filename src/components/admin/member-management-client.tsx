"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MemberItem = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
};

type MemberManagementClientProps = {
  members: MemberItem[];
  createMemberAction: (formData: FormData) => Promise<void>;
  updateMemberAction: (formData: FormData) => Promise<void>;
  setMemberPasswordAction: (formData: FormData) => Promise<void>;
  deleteMemberAction: (formData: FormData) => Promise<void>;
};

const PASSWORD_LENGTH = 16;
const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGIT_CHARS = "0123456789";
const SYMBOL_CHARS = "!@#$%^&*()-_=+[]{}";
const ALL_PASSWORD_CHARS =
  LOWERCASE_CHARS + UPPERCASE_CHARS + DIGIT_CHARS + SYMBOL_CHARS;

function randomChar(charset: string): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const randomIndex = randomValues[0] % charset.length;
  return charset[randomIndex] ?? charset[0];
}

function shuffle(value: string): string {
  const chars = value.split("");
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    const nextIndex = randomValues[0] % (index + 1);
    const current = chars[index];
    chars[index] = chars[nextIndex] ?? chars[0] ?? "";
    chars[nextIndex] = current ?? "";
  }
  return chars.join("");
}

function generateStrongPassword(): string {
  // Ensure one char per required class, then fill with mixed random chars.
  const requiredChars = [
    randomChar(LOWERCASE_CHARS),
    randomChar(UPPERCASE_CHARS),
    randomChar(DIGIT_CHARS),
    randomChar(SYMBOL_CHARS),
  ];
  const remainingChars = Array.from(
    { length: PASSWORD_LENGTH - requiredChars.length },
    () => randomChar(ALL_PASSWORD_CHARS),
  );
  return shuffle([...requiredChars, ...remainingChars].join(""));
}

type PasswordFieldWithToolsProps = {
  name: string;
  placeholder: string;
  copiedLabel: string;
  copyLabel: string;
  generateLabel: string;
  defaultValue?: string;
};

function PasswordFieldWithTools({
  name,
  placeholder,
  copiedLabel,
  copyLabel,
  generateLabel,
  defaultValue,
}: PasswordFieldWithToolsProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          name={name}
          required
          minLength={8}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (copied) {
              setCopied(false);
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const nextPassword = generateStrongPassword();
            setValue(nextPassword);
            setCopied(false);
          }}
        >
          {generateLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={value.length === 0}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  );
}

export function MemberManagementClient({
  members,
  createMemberAction,
  updateMemberAction,
  setMemberPasswordAction,
  deleteMemberAction,
}: MemberManagementClientProps) {
  const t = useTranslations("admin.members");
  const orderedMembers = useMemo(() => members, [members]);

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">{t("addMemberTitle")}</h2>
        <form
          action={createMemberAction}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto]"
        >
          <label className="space-y-1">
            <span className="text-sm">{t("fields.name")}</span>
            <Input name="name" required type="text" />
          </label>
          <label className="space-y-1">
            <span className="text-sm">{t("fields.email")}</span>
            <Input name="email" required type="email" />
          </label>
          <label className="space-y-1">
            <span className="text-sm">{t("fields.password")}</span>
            {/* Champ contrôlé pour gérer génération + copie côté client. */}
            <PasswordFieldWithTools
              name="password"
              placeholder={t("fields.password")}
              generateLabel={t("generatePassword")}
              copyLabel={t("copyPassword")}
              copiedLabel={t("copiedPassword")}
            />
          </label>
          <div className="flex items-end gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="isAdmin" value="true" className="size-4" />
              <span>{t("fields.isAdmin")}</span>
            </label>
            <Button type="submit" size="sm">
              {t("addMember")}
            </Button>
          </div>
        </form>
      </section>

      {orderedMembers.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {orderedMembers.map((member) => {
            return (
              <li key={member.id} className="space-y-3 px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {member.email}
                    </p>
                  </div>
                  <Badge variant={member.isAdmin ? "default" : "secondary"}>
                    {member.isAdmin ? t("admin") : t("member")}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form
                    action={updateMemberAction}
                    className="grid w-full gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
                  >
                    <input type="hidden" name="id" value={member.id} />
                    <Input name="name" defaultValue={member.name} required type="text" />
                    <Input name="email" defaultValue={member.email} required type="email" />
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="isAdmin"
                        value="true"
                        defaultChecked={member.isAdmin}
                        className="size-4"
                      />
                      <span>{t("fields.isAdmin")}</span>
                    </label>
                    <Button type="submit" size="sm" variant="outline" className="w-fit">
                      {t("saveMember")}
                    </Button>
                  </form>

                  <form
                    id={`set-password-${member.id}`}
                    action={setMemberPasswordAction}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={member.id} />
                    <div className="w-[28rem] max-w-full">
                      <PasswordFieldWithTools
                        name="password"
                        placeholder={t("fields.password")}
                        generateLabel={t("generatePassword")}
                        copyLabel={t("copyPassword")}
                        copiedLabel={t("copiedPassword")}
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" size="sm" variant="outline">
                          {t("setPassword")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("confirm.password.title")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("confirm.password.description", { name: member.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("confirm.cancel")}</AlertDialogCancel>
                          {/* Bouton submit du formulaire parent via form attr. */}
                          <AlertDialogAction type="submit" form={`set-password-${member.id}`}>
                            {t("confirm.password.confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </form>

                  <form id={`delete-member-${member.id}`} action={deleteMemberAction}>
                    <input type="hidden" name="id" value={member.id} />
                  </form>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" size="sm" variant="destructive">
                        {t("delete")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirm.delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("confirm.delete.description", { name: member.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("confirm.cancel")}</AlertDialogCancel>
                        <AlertDialogAction type="submit" form={`delete-member-${member.id}`}>
                          {t("confirm.delete.confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
