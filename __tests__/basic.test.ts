/**
 * Basic test to verify Jest setup is working correctly
 */

describe('Basic test suite', () => {
  it('should correctly perform basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toContain('ell');
    expect([1, 2, 3]).toHaveLength(3);
    expect({ name: 'test' }).toEqual({ name: 'test' });
  });

  // Async test
  it('should handle async operations', async () => {
    const result = await Promise.resolve('async value');
    expect(result).toBe('async value');
  });
});