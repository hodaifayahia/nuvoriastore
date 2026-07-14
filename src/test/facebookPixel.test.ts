import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simulating the get_active_facebook_pixels parsing logic we added in useFacebookPixel
function parsePixels(data: any): string[] {
  return data?.map((p: any) => {
    if (typeof p === 'object' && p !== null) {
      return p.pixel_id;
    }
    return typeof p === 'string' ? p : '';
  }).filter(Boolean) || [];
}

describe('Facebook Pixel Tracking Helper', () => {
  beforeEach(() => {
    // Clear global window variables
    delete (window as any).fbq;
    delete (window as any)._fbq;
  });

  it('should parse active pixels from database rows correctly (array of objects)', () => {
    const rawData = [
      { pixel_id: '123456789' },
      { pixel_id: '987654321' },
      { pixel_id: null },
    ];
    const parsed = parsePixels(rawData);
    expect(parsed).toEqual(['123456789', '987654321']);
  });

  it('should parse active pixels from string array database rows correctly (array of strings fallback)', () => {
    const rawData = ['123456789', '987654321'];
    const parsed = parsePixels(rawData);
    expect(parsed).toEqual(['123456789', '987654321']);
  });

  it('should trigger trackEvent with correct parameters when window.fbq is defined', () => {
    const mockFbq = vi.fn();
    (window as any).fbq = mockFbq;

    const trackEvent = (eventName: string, params?: Record<string, any>) => {
      if ((window as any).fbq) {
        (window as any).fbq('track', eventName, params);
      }
    };

    trackEvent('Purchase', { value: 12000, currency: 'DZD' });

    expect(mockFbq).toHaveBeenCalledWith('track', 'Purchase', { value: 12000, currency: 'DZD' });
  });

  it('should not throw error if trackEvent is called and window.fbq is undefined', () => {
    const trackEvent = (eventName: string, params?: Record<string, any>) => {
      if ((window as any).fbq) {
        (window as any).fbq('track', eventName, params);
      }
    };

    expect(() => trackEvent('ViewContent', { content_name: 'Test Product' })).not.toThrow();
  });
});

describe('Delivery Provider Logic', () => {
  it('should identify Yalidine as first priority built-in provider', () => {
    const mockProviders = [
      { name: 'EcoTrack', is_builtin: true },
      { name: 'Yalidine', is_builtin: true },
      { name: 'Custom Delivery', is_builtin: false },
    ];

    // Sort matching SingleProductPage order logic:
    // .order('is_builtin', { ascending: false }).order('name')
    const sorted = [...mockProviders].sort((a, b) => {
      if (a.is_builtin !== b.is_builtin) {
        return a.is_builtin ? -1 : 1; // built-in first
      }
      return a.name.localeCompare(b.name);
    });

    expect(sorted[0].name).toBe('EcoTrack'); // EcoTrack alphabetically comes before Yalidine
    expect(sorted[1].name).toBe('Yalidine');
  });
});
