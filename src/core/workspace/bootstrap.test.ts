import { test } from "node:test"
import assert from "node:assert/strict"
import { bootstrapWorkspace, workspaceSlug, type BootstrapDeps } from "./bootstrap.ts"

/**
 * The first-sign-in bootstrap race. Two concurrent requests for a
 * brand-new user both reach ensureWorkspaceForUser; the one that loses
 * the workspace insert (slug 23505) must adopt the winner's workspace and
 * converge — never return early and never fail with
 * "No workspace available for user".
 */

function deps(overrides: Partial<BootstrapDeps>): BootstrapDeps & { calls: string[] } {
  const calls: string[] = []
  const base: BootstrapDeps = {
    async ensureProfile() { calls.push("profile") },
    async hasMembership() { calls.push("membership?"); return false },
    async findOwnWorkspace() { calls.push("findOwn"); return null },
    async insertWorkspace(ws) { calls.push(`insert:${ws.id}`); return "ok" },
    async claimOwnerSeat(id) { calls.push(`seat:${id}`) },
    async ensureSettings(id) { calls.push(`settings:${id}`) },
  }
  return Object.assign({ calls }, base, overrides)
}

test("loser path: slug conflict adopts the concurrent winner's workspace", async () => {
  // findOwnWorkspace is empty before our insert (the winner's row may not
  // be visible yet), the insert loses with 23505, and the second lookup
  // sees the winner's workspace. The loser must finish bootstrap AGAINST
  // THE WINNER'S id — claiming the owner seat and settings idempotently —
  // instead of returning early while the winner is still mid-bootstrap.
  let lookups = 0
  const d = deps({
    async findOwnWorkspace() {
      lookups += 1
      return lookups === 1 ? null : "winner-ws"
    },
    async insertWorkspace() { return "conflict" },
  })
  await bootstrapWorkspace(d, { name: "Attomik Starter", userId: "user-1", newId: () => "loser-ws" })
  assert.deepEqual(
    d.calls.filter((c) => c.startsWith("seat") || c.startsWith("settings")),
    ["seat:winner-ws", "settings:winner-ws"],
  )
})

test("loser path: conflict with no readable winner fails loudly, not silently", async () => {
  const d = deps({
    async insertWorkspace() { return "conflict" },
  })
  await assert.rejects(
    () => bootstrapWorkspace(d, { name: "App", userId: "user-1" }),
    /concurrent bootstrap left no readable workspace/,
  )
  // Nothing was half-written against a workspace we could not see.
  assert.equal(d.calls.some((c) => c.startsWith("seat") || c.startsWith("settings")), false)
})

test("winner path: clean insert bootstraps against the generated id", async () => {
  const d = deps({})
  await bootstrapWorkspace(d, { name: "App", userId: "user-1", newId: () => "ws-new" })
  assert.deepEqual(d.calls, ["profile", "membership?", "findOwn", "insert:ws-new", "seat:ws-new", "settings:ws-new"])
})

test("existing membership: bootstrap is a no-op", async () => {
  const d = deps({ async hasMembership() { return true } })
  await bootstrapWorkspace(d, { name: "App", userId: "user-1" })
  assert.equal(d.calls.some((c) => c.startsWith("insert") || c.startsWith("seat")), false)
})

test("crashed earlier attempt: an existing creator-owned workspace is reused, no new insert", async () => {
  // An earlier bootstrap died after the workspace insert but before the
  // membership row. The retry must adopt that workspace and complete the
  // remaining idempotent steps.
  const d = deps({ async findOwnWorkspace() { return "ws-orphan" } })
  await bootstrapWorkspace(d, { name: "App", userId: "user-1" })
  assert.equal(d.calls.some((c) => c.startsWith("insert")), false)
  assert.deepEqual(
    d.calls.filter((c) => c.startsWith("seat") || c.startsWith("settings")),
    ["seat:ws-orphan", "settings:ws-orphan"],
  )
})

test("slug is deterministic per user, so conflicts only come from the same user", () => {
  assert.equal(workspaceSlug("Attomik Starter", "abcdefgh-1234"), "attomik-starter-abcdefgh")
  assert.equal(workspaceSlug("Attomik Starter", "abcdefgh-1234"), workspaceSlug("Attomik Starter", "abcdefgh-9999"))
  assert.notEqual(workspaceSlug("Attomik Starter", "aaaa1111"), workspaceSlug("Attomik Starter", "bbbb2222"))
})
