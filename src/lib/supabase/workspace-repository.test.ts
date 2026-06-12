import { describe, expect, it } from 'vitest';
import {
  buildWorkspacePayload,
  workspaceHasData,
  workspacePayloadToBackup,
  type WorkspaceRow,
} from './workspace-repository';
import { BACKUP_FORMAT } from '../backup';

describe('workspace repository helpers', () => {
  it('buildWorkspacePayload mirrors backup shape', () => {
    const payload = buildWorkspacePayload({ 'meritly-provider-records': '[]' });
    expect(payload.format).toBe(BACKUP_FORMAT);
    expect(payload.data['meritly-provider-records']).toBe('[]');
    expect(payload.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('workspacePayloadToBackup round-trips data', () => {
    const payload = buildWorkspacePayload({ 'meritly-parameters': '{}' });
    const backup = workspacePayloadToBackup(payload);
    expect(backup.data).toEqual(payload.data);
  });

  it('workspaceHasData detects empty vs populated workspaces', () => {
    expect(workspaceHasData(null)).toBe(false);
    expect(
      workspaceHasData({
        org_id: 'x',
        payload: buildWorkspacePayload({}),
        version: 1,
        updated_at: '',
        updated_by: null,
      } as WorkspaceRow)
    ).toBe(false);
    expect(
      workspaceHasData({
        org_id: 'x',
        payload: buildWorkspacePayload({ 'meritly-provider-records': '[]' }),
        version: 1,
        updated_at: '',
        updated_by: null,
      } as WorkspaceRow)
    ).toBe(true);
  });
});
