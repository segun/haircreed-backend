import { booleanValue, enumeration, pagination, validateKeys } from './read-query';

describe('read query validation', () => {
  it('applies pagination defaults and limits', () => {
    expect(pagination({}, 10)).toEqual({ page: 1, pageSize: 10 });
    expect(() => pagination({ pageSize: '101' })).toThrow();
    expect(() => pagination({ page: '0' })).toThrow();
  });

  it('rejects unknown parameters and invalid enum or boolean values', () => {
    expect(() => validateKeys({ surprise: 'yes' }, ['q'])).toThrow();
    expect(() => enumeration({ sort: 'wrong' }, 'sort', ['name:asc'])).toThrow();
    expect(() => booleanValue({ includeItems: 'yes' }, 'includeItems', true)).toThrow();
  });
});