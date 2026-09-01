import { test } from "node:test"
import assert from "node:assert/strict"
import { assignableRoles, canInvite, canManageTarget, canRecordActivity, hasRank, isAdminLike, isValidRole, normalizeEmail } from "./index.ts"

test("assignable roles per actor — owner is never assignable", () => {
  assert.deepEqual(assignableRoles("owner"), ["admin", "member", "viewer"])
  assert.deepEqual(assignableRoles("admin"), ["member", "viewer"])
  assert.deepEqual(assignableRoles("member"), [])
  assert.deepEqual(assignableRoles("viewer"), [])
})

test("owner invariant: nobody manages an owner row", () => {
  for (const actor of ["owner", "admin", "member", "viewer"] as const) {
    assert.equal(canManageTarget(actor, "owner"), false, `${actor} must not manage owner`)
  }
})

test("admins manage members/viewers only; owner manages all non-owners", () => {
  assert.equal(canManageTarget("owner", "admin"), true)
  assert.equal(canManageTarget("owner", "member"), true)
  assert.equal(canManageTarget("admin", "admin"), false)
  assert.equal(canManageTarget("admin", "member"), true)
  assert.equal(canManageTarget("admin", "viewer"), true)
  assert.equal(canManageTarget("member", "viewer"), false)
  assert.equal(canManageTarget("viewer", "viewer"), false)
})

test("invite capability and role validation", () => {
  assert.equal(canInvite("owner"), true)
  assert.equal(canInvite("admin"), true)
  assert.equal(canInvite("member"), false)
  assert.equal(canInvite("viewer"), false)
  assert.equal(isAdminLike("admin"), true)
  assert.equal(isAdminLike("member"), false)
  assert.equal(isValidRole("owner"), true)
  assert.equal(isValidRole("superadmin"), false)
})

test("email normalization", () => {
  assert.equal(normalizeEmail("  Pablo@Attomik.CO "), "pablo@attomik.co")
})

test("viewers never author activity events; member rank and above do", () => {
  assert.equal(canRecordActivity("owner"), true)
  assert.equal(canRecordActivity("admin"), true)
  assert.equal(canRecordActivity("member"), true)
  assert.equal(canRecordActivity("viewer"), false)
  assert.equal(hasRank("member", "admin"), false)
  assert.equal(hasRank("admin", "admin"), true)
})
