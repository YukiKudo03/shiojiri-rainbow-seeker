import apiService from '../apiService';

// Mock fetch globally
global.fetch = jest.fn();

describe('apiService', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('should make GET request', async () => {
    const mockResponse = { data: 'test' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiService.get('/test');
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('should handle API errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(apiService.get('/test')).rejects.toThrow('Network error');
  });
});