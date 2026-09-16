import { db, id } from './database';

describe('database compatibility API', () => {
  it('builds transaction chunks without opening a connection', () => {
    const entityId = id();
    const chunk = db.tx.Users[entityId].update({ fullName: 'Test User' });

    expect(entityId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(chunk).toEqual({
      entity: 'Users',
      entityId,
      operation: 'update',
      value: { fullName: 'Test User' },
    });
  });

  it('rejects unknown entities before touching MySQL', () => {
    expect(() => db.tx.UnknownEntity[id()]).toThrow(
      'Unknown database entity: UnknownEntity',
    );
  });
});