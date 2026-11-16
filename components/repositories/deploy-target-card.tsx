"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeployAccess,
  useDeployRules,
  useDeployTarget,
  useRemoveDeployTarget,
  useSaveDeployTarget,
} from "@/hooks/use-deploy-targets";
import { useRepositories } from "@/hooks/use-ai-config";
import { apiErrorMessage } from "@/lib/ai-config";
import {
  buildConfig,
  DAYS,
  emptyForm,
  formFromConfig,
  MAX_FREEZE_WINDOWS,
  newEnvironment,
  newFreezeWindow,
  sameForm,
  summary,
  validateTarget,
  type DeployTargetConfig,
  type EnvironmentForm,
  type FreezeForm,
  type TargetForm,
} from "@/lib/deploy-target";
import { useAuthStore } from "@/store/auth";
import type { Repository } from "@/types/ai-config";

/** Which repositories log0 may deploy for, and how: the workflow, the environments in promotion order, the rules of each. */
export function DeployTargetsCard() {
  const repositories = useRepositories();
  const role = useAuthStore((s) => s.role);
  const candidates = (repositories.data ?? []).filter((r) => r.installationId !== null);

  if (repositories.isLoading) return <Skeleton className="h-12 w-full" />;
  if (role !== "ADMIN") {
    return <p className="text-sm text-muted-foreground">Only an admin can change how repositories are deployed.</p>;
  }
  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">Connect a repository through the GitHub App first.</p>;
  }
  return (
    <ul className="divide-y">
      {candidates.map((repo) => (
        <DeployTargetRow key={repo.id} repo={repo} />
      ))}
    </ul>
  );
}

function DeployTargetRow({ repo }: { repo: Repository }) {
  const [open, setOpen] = useState(false);
  const target = useDeployTarget(repo.id);
  const access = useDeployAccess(repo.installationId);
  const config = target.data?.config ?? null;

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-2 max-sm:flex-col max-sm:items-start">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm">
            {repo.owner}/{repo.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {target.isLoading ? "Loading…" : summary(config)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Close" : config ? "Edit" : "Set up"}
        </Button>
      </div>
      {access.data && !access.data.canDeploy && (
        <p role="alert" className="text-xs text-severity-high">
          The GitHub App has not been granted: {access.data.missing.join(", ")}. Approve the new permissions for this
          installation in GitHub first.
        </p>
      )}
      {open && !target.isLoading && (
        <TargetEditor repo={repo} original={config} onDone={() => setOpen(false)} />
      )}
    </li>
  );
}

function TargetEditor({
  repo,
  original,
  onDone,
}: {
  repo: Repository;
  original: DeployTargetConfig | null;
  onDone: () => void;
}) {
  const initial = original ? formFromConfig(original) : emptyForm();
  const [form, setForm] = useState<TargetForm>(initial);
  const save = useSaveDeployTarget(repo.id);
  const remove = useRemoveDeployTarget(repo.id);
  const rules = useDeployRules();
  const problem = validateTarget(form, original, rules);
  const changed = !sameForm(form, initial);

  const setEnv = (index: number, patch: Partial<EnvironmentForm>) =>
    setForm((f) => ({ ...f, environments: f.environments.map((e, i) => (i === index ? { ...e, ...patch } : e)) }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem) return;
    save.mutate(buildConfig(form, original), {
      onSuccess: () => {
        toast.success("Deploy settings saved");
        onDone();
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not save")),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`wf-${repo.id}`}>Deploy workflow</Label>
        <Input
          id={`wf-${repo.id}`}
          value={form.workflowFile}
          onChange={(e) => setForm((f) => ({ ...f, workflowFile: e.target.value }))}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          A GitHub Actions file in this repository. It must accept the inputs <code>sha</code>, <code>environment</code> and{" "}
          <code>correlation_id</code>, and put the correlation id in its <code>run-name</code>. log0 starts it; it holds no
          cloud credentials.
        </p>
      </div>

      {form.environments.map((env, index) => (
        <fieldset key={index} className="flex flex-col gap-2 rounded-lg border p-2.5">
          <div className="flex items-center justify-between gap-2">
            <Input
              aria-label="Environment name"
              value={env.name}
              onChange={(e) => setEnv(index, { name: e.target.value })}
              className="h-8 max-w-48 font-mono"
              placeholder="staging"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="chip"
                size="xs"
                aria-pressed={env.enabled}
                onClick={() => setEnv(index, { enabled: !env.enabled })}
                title="Off means log0 offers no deploys to this environment"
              >
                {env.enabled ? "On" : "Off"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={form.environments.length === 1}
                onClick={() => setForm((f) => ({ ...f, environments: f.environments.filter((_, i) => i !== index) }))}
              >
                Remove
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <NumberField label="Watch (min)" value={env.soakMinutes} onChange={(v) => setEnv(index, { soakMinutes: v })} />
            <NumberField label="Timeout (min)" value={env.timeoutMinutes} onChange={(v) => setEnv(index, { timeoutMinutes: v })} />
            <NumberField label="Min log lines" value={env.minTraffic} onChange={(v) => setEnv(index, { minTraffic: v })} />
            <NumberField label="Margin (%)" value={env.marginPercent} onChange={(v) => setEnv(index, { marginPercent: v })} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Approved by</span>
            {(["ENGINEER", "ADMIN"] as const).map((approver) => (
              <Button
                key={approver}
                type="button"
                variant="chip"
                size="xs"
                aria-pressed={env.approver === approver}
                onClick={() => setEnv(index, { approver })}
              >
                {approver === "ADMIN" ? "Admin" : "Engineer or admin"}
              </Button>
            ))}
            {index > 0 && (
              <Button
                type="button"
                variant="chip"
                size="xs"
                aria-pressed={env.requiresPreviousVerified}
                onClick={() => setEnv(index, { requiresPreviousVerified: !env.requiresPreviousVerified })}
                title="Only after the previous environment verified this change"
              >
                After {form.environments[index - 1].name || "previous"} verified
              </Button>
            )}
          </div>
          <FreezeWindows
            windows={env.freezeWindows}
            onChange={(freezeWindows) => setEnv(index, { freezeWindows })}
          />
        </fieldset>
      ))}

      {form.environments.length < rules.maxEnvironments && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setForm((f) => ({ ...f, environments: [...f.environments, newEnvironment()] }))}>
          Add an environment
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Environments are promoted in this order. Rolling back to the previous commit is always a person&apos;s choice;
        <Badge variant="outline" className="mx-1">auto-rollback</Badge> is not available yet.
      </p>
      {problem && changed && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        {original ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Deploys are no longer offered here");
                  onDone();
                },
                onError: (e) => toast.error(apiErrorMessage(e, "Could not remove")),
              })
            }
          >
            Stop offering deploys
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={!!problem || !changed || save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-foreground" />
    </label>
  );
}

/** Hours (UTC) on some weekdays when log0 will not deploy here, for example Friday afternoons. */
function FreezeWindows({ windows, onChange }: { windows: FreezeForm[]; onChange: (windows: FreezeForm[]) => void }) {
  const set = (index: number, patch: Partial<FreezeForm>) => onChange(windows.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  return (
    <div className="flex flex-col gap-1.5">
      {windows.map((w, index) => (
        <div key={index} className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">No deploys on</span>
          {DAYS.map((day, d) => (
            <Button
              key={day}
              type="button"
              variant="chip"
              size="xs"
              aria-pressed={w.days.includes(d)}
              onClick={() => set(index, { days: w.days.includes(d) ? w.days.filter((x) => x !== d) : [...w.days, d] })}
            >
              {day}
            </Button>
          ))}
          <span className="text-muted-foreground">from</span>
          <Input aria-label="Freeze starts (UTC hour)" inputMode="numeric" value={w.startHour} onChange={(e) => set(index, { startHour: e.target.value })} className="h-7 w-14" />
          <span className="text-muted-foreground">to</span>
          <Input aria-label="Freeze ends (UTC hour)" inputMode="numeric" value={w.endHour} onChange={(e) => set(index, { endHour: e.target.value })} className="h-7 w-14" />
          <span className="text-muted-foreground">UTC</span>
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange(windows.filter((_, i) => i !== index))}>
            Remove
          </Button>
        </div>
      ))}
      {windows.length < MAX_FREEZE_WINDOWS && (
        <Button type="button" variant="ghost" size="xs" className="self-start" onClick={() => onChange([...windows, newFreezeWindow()])}>
          Add a freeze window
        </Button>
      )}
    </div>
  );
}
