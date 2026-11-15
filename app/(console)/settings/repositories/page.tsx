"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  useConnectRepository,
  useDisconnectRepository,
  useMapService,
  useRepositories,
  useServiceRepositories,
  useUnmapService,
} from "@/hooks/use-ai-config";
import {
  apiErrorMessage,
  normalizePathPrefix,
  validateRepositoryForm,
  validateServiceName,
} from "@/lib/ai-config";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  useGithubApp,
  useInstallations,
  useLinkInstallation,
  usePrPolicy,
  useResetPrPolicy,
  useSavePrPolicy,
  useSetRepositoryWrites,
  useUnlinkInstallation,
} from "@/hooks/use-github";
import {
  buildRules,
  formFromPolicy,
  RULE_FIELDS,
  sameRules,
  validateRules,
  type RulesForm,
} from "@/lib/pr-rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
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
import type { Repository } from "@/types/ai-config";

function ConnectForm() {
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const connect = useConnectRepository();
  const problem = validateRepositoryForm({ owner, name, token });
  const touched = owner !== "" || name !== "" || token !== "";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || connect.isPending) return;
    connect.mutate(
      { owner: owner.trim(), name: name.trim(), token: token.trim() },
      {
        onSuccess: (repo) => {
          setOwner("");
          setName("");
          setToken(""); // the token is dropped from the page as soon as it is sent
          toast.success(`Connected ${repo.owner}/${repo.name}`);
        },
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Could not connect the repository")),
      }
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repo-owner">Owner</Label>
          <Input
            id="repo-owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="acme"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repo-name">Repository</Label>
          <Input
            id="repo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="payments"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repo-token">
          GitHub access token{" "}
          <span className="text-muted-foreground">
            (read-only access to this repository is enough)
          </span>
        </Label>
        <Input
          id="repo-token"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>
      {touched && problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!!problem || connect.isPending}
        >
          {connect.isPending ? "Checking with GitHub…" : "Connect"}
        </Button>
      </div>
    </form>
  );
}

function RepositoryRow({
  repo,
  canWrite,
}: {
  repo: Repository;
  /** An active installation of the GitHub App exists. */
  canWrite: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const disconnect = useDisconnectRepository();
  const writes = useSetRepositoryWrites();

  return (
    <li className="flex items-center justify-between gap-2 py-2 max-sm:flex-col max-sm:items-start">
      <div className="min-w-0">
        <p className="truncate font-mono text-sm">
          {repo.owner}/{repo.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {repo.provider}, branch {repo.defaultBranch}
        </p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Disconnect? Services mapped to it are unmapped.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
          >
            Keep
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={disconnect.isPending}
            onClick={() =>
              disconnect.mutate(repo.id, {
                onSuccess: () => toast.success("Repository disconnected"),
                onError: (e) =>
                  toast.error(apiErrorMessage(e, "Could not disconnect")),
              })
            }
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="chip"
            size="xs"
            aria-pressed={repo.prWritesEnabled}
            disabled={writes.isPending || (!canWrite && !repo.prWritesEnabled)}
            title={
              canWrite || repo.prWritesEnabled
                ? "Let log0 open draft pull requests here after you approve"
                : "Install the GitHub App first"
            }
            onClick={() =>
              writes.mutate(
                { repositoryId: repo.id, enabled: !repo.prWritesEnabled },
                {
                  onSuccess: (r) =>
                    toast.success(
                      r.prWritesEnabled
                        ? "Draft pull requests are on"
                        : "Draft pull requests are off"
                    ),
                  onError: (e) =>
                    toast.error(
                      apiErrorMessage(e, "Could not change this repository")
                    ),
                }
              )
            }
          >
            Draft PRs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            Disconnect
          </Button>
        </div>
      )}
    </li>
  );
}

function GithubAppCard() {
  const app = useGithubApp();
  const installations = useInstallations();
  const link = useLinkInstallation();
  const unlink = useUnlinkInstallation();
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false);

  // GitHub sends the admin back here with ?installation_id=...&state=...: link it once, then clean the address.
  useEffect(() => {
    const id = Number(params.get("installation_id"));
    const state = params.get("state");
    if (handled.current || !id || !state) return;
    handled.current = true;
    link.mutate(
      { installationId: id, state },
      {
        onSuccess: (i) => toast.success(`Installed on ${i.accountLogin}`),
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Could not link the installation")),
        onSettled: () => router.replace("/settings/repositories"),
      }
    );
  }, [params, link, router]);

  if (app.isLoading) return <Skeleton className="h-16 w-full" />;
  if (!app.data?.configured) {
    return (
      <p className="text-sm text-muted-foreground">
        The GitHub App is not set up on this server, so log0 cannot open pull
        requests.
      </p>
    );
  }
  const list = installations.data ?? [];
  return (
    <div className="flex flex-col gap-3">
      {list.length > 0 && (
        <ul className="divide-y">
          {list.map((i) => (
            <li
              key={i.installationId}
              className="flex items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{i.accountLogin}</p>
                <p className="text-xs text-muted-foreground">
                  {i.accountType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {i.suspended && <Badge variant="outline">suspended</Badge>}
                <ConfirmButton
                  label={`Unlink ${i.accountLogin}`}
                  confirmLabel="Unlink"
                  pending={unlink.isPending}
                  onConfirm={() =>
                    unlink.mutate(i.installationId, {
                      onSuccess: () => toast.success("Installation unlinked"),
                      onError: (e) =>
                        toast.error(apiErrorMessage(e, "Could not unlink")),
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {app.data.installUrl && (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <a href={app.data.installUrl}>
              {list.length > 0 ? "Add another account" : "Install on GitHub"}
            </a>
          </Button>
        </div>
      )}
      {!app.data.writesEnabled && (
        <p className="text-xs text-muted-foreground">
          Writing is switched off on this server, so no pull request will be
          opened yet.
        </p>
      )}
    </div>
  );
}

function PrRulesCard() {
  const policy = usePrPolicy();
  const save = useSavePrPolicy();
  const reset = useResetPrPolicy();
  const [draft, setDraft] = useState<RulesForm | null>(null);

  if (policy.isLoading) return <Skeleton className="h-24 w-full" />;
  if (!policy.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load the pull request rules.
      </p>
    );
  }
  const saved = formFromPolicy(policy.data);
  const form = draft ?? saved;
  const problem = validateRules(form, policy.data);
  const dirty = !sameRules(form, saved);
  const locked = policy.data.serverOnlyOnGreen;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.onlyOnGreen}
          disabled={locked}
          onChange={(e) => setDraft({ ...form, onlyOnGreen: e.target.checked })}
        />
        <span>
          Only open a pull request when the checks pass
          {locked && (
            <span className="text-muted-foreground"> (required by the server)</span>
          )}
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.sandboxTests}
          disabled={!policy.data.serverSandboxAvailable}
          onChange={(e) => setDraft({ ...form, sandboxTests: e.target.checked })}
        />
        <span>
          Run the tests in log0&apos;s sandbox when the repository has no checks
          <span className="block text-xs text-muted-foreground">
            {policy.data.serverSandboxAvailable
              ? "Runs your repository's own tests in a locked-down container with no network. Off unless you turn it on."
              : "Not available on this server."}
          </span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {RULE_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`rule-${key}`}>{label}</Label>
            <Input
              id={`rule-${key}`}
              inputMode="numeric"
              value={form.values[key]}
              placeholder={`${policy.data.server[key]} (server limit)`}
              onChange={(e) =>
                setDraft({ ...form, values: { ...form.values, [key]: e.target.value } })
              }
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        You can make these stricter than the server&apos;s limits, never looser.
        Files such as workflows, lock files and keys are never included.
      </p>
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={reset.isPending}
          onClick={() =>
            reset.mutate(undefined, {
              onSuccess: () => {
                setDraft(null);
                toast.success("Back to the server's rules");
              },
              onError: (e) => toast.error(apiErrorMessage(e, "Could not reset")),
            })
          }
        >
          Reset
        </Button>
        <Button
          size="sm"
          disabled={!dirty || !!problem || save.isPending}
          onClick={() =>
            save.mutate(buildRules(form), {
              onSuccess: () => {
                setDraft(null);
                toast.success("Rules saved");
              },
              onError: (e) => toast.error(apiErrorMessage(e, "Could not save the rules")),
            })
          }
        >
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function MapServiceForm({ repos }: { repos: Repository[] }) {
  const [serviceName, setServiceName] = useState("");
  const [repositoryId, setRepositoryId] = useState(repos[0]?.id ?? "");
  const [pathPrefix, setPathPrefix] = useState("");
  const map = useMapService();
  const prefix = normalizePathPrefix(pathPrefix);
  const problem =
    validateServiceName(serviceName) ??
    (prefix === null
      ? "The folder must be a relative path like services/payment."
      : null);
  const selected = repos.some((r) => r.id === repositoryId)
    ? repositoryId
    : (repos[0]?.id ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || prefix === null || !selected || map.isPending) return;
    map.mutate(
      {
        serviceName: serviceName.trim(),
        repositoryId: selected,
        pathPrefix: prefix,
      },
      {
        onSuccess: () => {
          setServiceName("");
          setPathPrefix("");
          toast.success("Service mapped");
        },
        onError: (e) =>
          toast.error(apiErrorMessage(e, "Could not map the service")),
      }
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="map-service">Service name</Label>
          <Input
            id="map-service"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="payment-service"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="map-repo">Repository</Label>
          <select
            id="map-repo"
            value={selected}
            onChange={(e) => setRepositoryId(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.owner}/{r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="map-prefix">
            Folder <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="map-prefix"
            value={pathPrefix}
            onChange={(e) => setPathPrefix(e.target.value)}
            placeholder="services/payment"
          />
        </div>
      </div>
      {serviceName !== "" && problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!!problem || map.isPending}>
          {map.isPending ? "Saving…" : "Map service"}
        </Button>
      </div>
    </form>
  );
}

export default function RepositoriesPage() {
  const repositories = useRepositories();
  const installations = useInstallations();
  const services = useServiceRepositories();
  const unmap = useUnmapService();
  const repos = repositories.data ?? [];
  const nameOf = (id: string) => {
    const r = repos.find((x) => x.id === id);
    return r ? `${r.owner}/${r.name}` : "unknown repository";
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Repositories</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Let investigations read your code. Tokens are stored encrypted and are
          never shown again.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected repositories</CardTitle>
          <CardDescription>
            GitHub repositories investigations can read.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {repositories.isLoading && <Skeleton className="h-12 w-full" />}
          {repositories.isError && (
            <p className="text-sm text-muted-foreground">
              Could not load repositories.
            </p>
          )}
          {repositories.data && repos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No repository connected yet.
            </p>
          )}
          {repos.length > 0 && (
            <ul className="divide-y">
              {repos.map((repo) => (
                <RepositoryRow
                  key={repo.id}
                  repo={repo}
                  canWrite={(installations.data ?? []).some((i) => !i.suspended)}
                />
              ))}
            </ul>
          )}
          <ConnectForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GitHub App</CardTitle>
          <CardDescription>
            Lets log0 open a draft pull request for a fix you approve. It never
            merges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GithubAppCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pull request rules</CardTitle>
          <CardDescription>
            How much log0 may change in one pull request, and how often.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrRulesCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services and code</CardTitle>
          <CardDescription>
            Which repository (and folder) holds the code of each service, so an
            investigation of an incident in that service reads the right code.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {services.isLoading && <Skeleton className="h-12 w-full" />}
          {services.data && services.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No service mapped yet.
            </p>
          )}
          {services.data && services.data.length > 0 && (
            <ul className="divide-y">
              {services.data.map((m) => (
                <li
                  key={m.serviceName}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.serviceName}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {nameOf(m.repositoryId)}
                      {m.pathPrefix ? `/${m.pathPrefix}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.pathPrefix === "" && (
                      <Badge variant="outline">whole repository</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={unmap.isPending}
                      onClick={() =>
                        unmap.mutate(m.serviceName, {
                          onSuccess: () => toast.success("Service unmapped"),
                          onError: (e) =>
                            toast.error(apiErrorMessage(e, "Could not unmap")),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {repos.length > 0 ? (
            <MapServiceForm repos={repos} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Connect a repository first to map a service to it.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
