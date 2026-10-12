import { describe, expect, it } from 'vitest';
import { defaultState, parseSharedState, serializeState } from '../../src/domain/schema';

describe('share link serialisation', () => {
  it('round-trips the full design state', () => {
    const s = defaultState('N2');
    s.displayUnits = 'imperial';
    s.room = { widthM: 4.123, depthM: 6.001, heightM: 2.95 };
    s.tee = { xM: -0.4, zM: 3.7 };
    s.handedness = 'left';
    s.zones.N2.tee = { cx: 0.05, cz: -0.02, w: 0.1, d: 0.12 };
    s.view.camera = 'top';
    const r = parseSharedState(serializeState(s));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.room).toEqual(s.room);
    expect(r.state.tee).toEqual(s.tee);
    expect(r.state.zones).toEqual(s.zones);
    expect(r.state.product).toBe('N2');
    expect(r.state.displayUnits).toBe('imperial');
    expect(r.state.view.camera).toBe('top');
  });

  it.each([
    ['', 'empty'],
    ['v0.abc', 'version'],
    ['v1.abc', 'version'],
    ['v2.%%%', 'malformed'],
    ['v2.' + btoa('{"p":"X1"}'), 'malformed'],
    ['v2.' + btoa('not json'), 'malformed'],
  ])('rejects %j safely', (token, reason) => {
    const r = parseSharedState(token);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
  });

  it('rejects out-of-range values instead of rendering them', () => {
    const s = defaultState('N1');
    s.room.heightM = 40;
    expect(parseSharedState(serializeState(s))).toEqual({ ok: false, reason: 'invalid' });
  });

  it('contains no personal data fields', () => {
    const token = serializeState(defaultState('N1'));
    const body = token.slice(3).replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(body + '==='.slice((body.length + 3) % 4));
    expect(json).toContain('"p":"N1"');
    expect(json).not.toMatch(/name|email|address|phone/i);
  });
});
