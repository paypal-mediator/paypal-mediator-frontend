import test from 'node:test';
import assert from 'node:assert/strict';
import { inviteMember, changeMember, mergeTeamMemberships, canEditTeamContent } from '../src/lib/team.js';
const admin = { id: 'owner', email: 'owner@example.com', role: 'Admin', status: 'Active' };

test('members can edit operational content while viewers and unknown roles cannot', () => {
  for (const role of ['ADMIN', 'MEMBER']) assert.equal(canEditTeamContent(role), true);
  for (const role of ['VIEWER', undefined, null, '', 'OWNER']) assert.equal(canEditTeamContent(role), false);
});
test('adding or updating a team preserves all other memberships and their order', () => {
  const existing = [{ id: 'alpha', displayName: 'Alpha', role: 'ADMIN' }, { id: 'beta', displayName: 'Beta', role: 'VIEWER' }];
  const added = mergeTeamMemberships(existing, [{ id: 'gamma', displayName: 'Gamma', role: 'ADMIN' }]);
  assert.deepEqual(added.map(team => team.id), ['alpha', 'beta', 'gamma']);
  assert.deepEqual(existing.map(team => team.id), ['alpha', 'beta']);
  const renamed = mergeTeamMemberships(added, [{ id: 'beta', displayName: 'Renamed' }]);
  assert.deepEqual(renamed.map(team => team.id), ['alpha', 'beta', 'gamma']);
  assert.equal(renamed[1].role, 'VIEWER');
  assert.equal(renamed[1].displayName, 'Renamed');
});
test('merchant invitations normalize addresses and reject duplicate access', () => {
  const members = inviteMember([admin], ' Person@Example.com ', 'Member');
  assert.equal(members[1].email, 'person@example.com');
  assert.equal(members[1].status, 'Pending');
  assert.throws(() => inviteMember(members, 'PERSON@example.com', 'Viewer'), /already/);
  assert.throws(() => inviteMember(members, 'invalid', 'Viewer'), /valid email/);
  assert.equal(changeMember(members, members[1].id, 'Viewer')[1].role, 'Viewer');
  assert.equal(changeMember(members, members[1].id, null).length, 1);
});
test('pending admins cannot replace the last active admin', () => {
  const members = inviteMember([admin], 'new@example.com', 'Admin');
  assert.throws(() => changeMember(members, admin.id, 'Member'), /active admin/);
  assert.throws(() => changeMember(members, admin.id, null), /active admin/);
  const active = members.map(member => ({ ...member, status: 'Active' }));
  assert.equal(changeMember(active, admin.id, 'Member')[0].role, 'Member');
});
