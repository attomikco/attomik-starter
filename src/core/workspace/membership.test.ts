import { test } from "node:test"
import assert from "node:assert/strict"
import { ownMembership } from "./membership.ts"

const ws = { id: "ws-1", name: "Starter", slug: "starter" }
const owner = { user_id: "user-owner", role: "owner", created_at: "2026-09-01T10:00:00Z", workspaces: ws }
const member = { user_id: "user-member", role: "member", created_at: "2026-09-02T10:00:00Z", workspaces: ws }

test("two members: the newer one signs in and receives their own role, not the owner's", () => {
  // What RLS returns to the member: every seat of the workspace, owner first.
  const visible = [owner, member]
  const seat = ownMembership(visible, "user-member")
  assert.equal(seat?.role, "member")
  assert.equal(seat?.user_id, "user-member")
  assert.equal(seat?.workspaces.id, "ws-1")
})

test("the owner still resolves as owner with a co-member present", () => {
  assert.equal(ownMembership([member, owner], "user-owner")?.role, "owner")
})

test("row order never matters: an earlier foreign seat is ignored", () => {
  const foreignEarlier = { user_id: "someone-else", role: "owner", created_at: "2020-01-01T00:00:00Z" }
  assert.equal(ownMembership([foreignEarlier, member], "user-member")?.role, "member")
})

test("a user with several seats gets their earliest one", () => {
  const later = { user_id: "user-member", role: "admin", created_at: "2026-09-03T10:00:00Z" }
  assert.equal(ownMembership([later, member], "user-member")?.role, "member")
})

test("no seat of their own → null (bootstrap path), even when other seats are visible", () => {
  assert.equal(ownMembership([owner], "user-new"), null)
  assert.equal(ownMembership([], "user-new"), null)
})
