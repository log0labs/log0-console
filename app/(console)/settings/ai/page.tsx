"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  useAiSettings,
  useResetAiSetting,
  useSaveAiSetting,
  useTestAiSetting,
} from "@/hooks/use-ai-config";
import {
  apiErrorMessage,
  buildSettingBody,
  checkErrorMessage,
  PROVIDER_OPTIONS,
  PURPOSE_INFO,
  validateSettingForm,
  type SettingForm,
} from "@/lib/ai-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { AiSetting } from "@/types/ai-config";

function SettingCard({ setting }: { setting: AiSetting }) {
  const info = PURPOSE_INFO[setting.purpose];
  const [form, setForm] = useState<SettingForm>({
    provider: setting.provider,
    model: setting.model,
    apiKey: "",
    temperature: setting.temperature?.toString() ?? "",
    maxTokens: setting.maxTokens?.toString() ?? "",
  });
  const save = useSaveAiSetting(setting.purpose);
  const reset = useResetAiSetting(setting.purpose);
  const test = useTestAiSetting(setting.purpose);
  const problem = validateSettingForm(form);
  const busy = save.isPending || reset.isPending || test.isPending;
  const set = (patch: Partial<SettingForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (problem || busy) return;
    save.mutate(buildSettingBody(form), {
      onSuccess: () => {
        set({ apiKey: "" }); // the key is never kept in the page after it was sent
        toast.success(`${info.label} setting saved`);
      },
      onError: (e) =>
        toast.error(apiErrorMessage(e, "Could not save the setting")),
    });
  }

  function onTest() {
    if (problem || busy) return;
    test.mutate(buildSettingBody(form), {
      onSuccess: (r) =>
        r.ok
          ? toast.success(`Connected (${r.latencyMs} ms)`)
          : toast.error(checkErrorMessage(r.error)),
      onError: (e) => toast.error(apiErrorMessage(e, "Could not run the test")),
    });
  }

  function onReset() {
    reset.mutate(undefined, {
      onSuccess: () =>
        toast.success(`${info.label} uses the platform default again`),
      onError: (e) =>
        toast.error(apiErrorMessage(e, "Could not reset the setting")),
    });
  }

  const id = (name: string) => `${setting.purpose}-${name}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{info.label}</CardTitle>
          <Badge variant="outline">
            {setting.source === "tenant" ? "Your setting" : "Platform default"}
          </Badge>
        </div>
        <CardDescription>{info.hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("provider")}>Provider</Label>
              <select
                id={id("provider")}
                value={form.provider}
                onChange={(e) => set({ provider: e.target.value })}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                {PROVIDER_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("model")}>Model</Label>
              <Input
                id={id("model")}
                value={form.model}
                onChange={(e) => set({ model: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("key")}>
              API key{" "}
              <span className="text-muted-foreground">
                {setting.keyLast4
                  ? `(saved, ends in ${setting.keyLast4}; leave empty to keep it)`
                  : "(optional: the platform key is used when empty)"}
              </span>
            </Label>
            <Input
              id={id("key")}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={form.apiKey}
              onChange={(e) => set({ apiKey: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("temperature")}>Temperature (0 to 2)</Label>
              <Input
                id={id("temperature")}
                inputMode="decimal"
                value={form.temperature}
                onChange={(e) => set({ temperature: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("max")}>Max tokens</Label>
              <Input
                id={id("max")}
                inputMode="numeric"
                value={form.maxTokens}
                onChange={(e) => set({ maxTokens: e.target.value })}
              />
            </div>
          </div>

          {problem && (
            <p role="alert" className="text-xs text-destructive">
              {problem}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {setting.source === "tenant" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onReset}
              >
                Use platform default
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!problem || busy}
              onClick={onTest}
            >
              {test.isPending ? "Testing…" : "Test connection"}
            </Button>
            <Button type="submit" size="sm" disabled={!!problem || busy}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AiSettingsPage() {
  const { data, isLoading, isError, refetch } = useAiSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">AI</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the model for each kind of AI work. Keys are stored encrypted
          and are never shown again, only their last four characters.
        </p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {isError && (
        <div className="flex items-center justify-between rounded-lg border p-4 text-sm">
          <span className="text-muted-foreground">
            Could not load settings.
          </span>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}
      {data?.map((setting) => (
        // remount when the saved values change, so the form shows what is stored
        <SettingCard
          key={`${setting.purpose}-${setting.source}-${setting.updatedAt}`}
          setting={setting}
        />
      ))}
    </div>
  );
}
