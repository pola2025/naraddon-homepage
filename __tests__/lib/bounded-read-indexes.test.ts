import { BOUNDED_READ_INDEXES } from '@/lib/bounded-read-indexes';

describe('bounded read indexes', () => {
  it('covers every hardened administrator list collection', () => {
    // Given
    const requiredCollections = [
      'users',
      'consultations',
      'adminLogs',
      'customerCards',
      'expert-examiners',
      'experts',
    ];

    // When
    const coveredCollections = new Set(BOUNDED_READ_INDEXES.map((index) => index.collection));

    // Then
    for (const collection of requiredCollections) {
      expect(coveredCollections.has(collection)).toBe(true);
    }
  });

  it('uses the cursor id as the final sort key', () => {
    // Given
    const indexes = BOUNDED_READ_INDEXES;

    // When
    const finalKeys = indexes.map((index) => Object.keys(index.keys).at(-1));

    // Then
    expect(finalKeys.every((key) => key === '_id')).toBe(true);
  });
});
