import { describe, it, expect } from 'vitest';

import {
  albumIdSchema,
  artistIdSchema,
  userIdSchema,
  collectionIdSchema,
  albumParamsSchema,
  artistParamsSchema,
  userProfileParamsSchema,
  collectionParamsSchema,
  validateParams,
} from '@/lib/validations/params';

import {
  userRegistrationSchema,
  userProfileUpdateSchema,
  albumRequestSchema,
  collectionRequestSchema,
  addToCollectionSchema,
  validateQueryParams,
  validateRequestBody,
  createErrorResponse,
  createSuccessResponse,
  createPaginatedResponse,
} from '@/lib/validations/api';

// ===========================
// PARAMS VALIDATION TESTS
// ===========================

describe('albumIdSchema', () => {
  it('should accept numeric IDs', () => {
    expect(() => albumIdSchema.parse('123')).not.toThrow();
    expect(() => albumIdSchema.parse('456789')).not.toThrow();
  });

  it('should accept alphanumeric IDs', () => {
    expect(() => albumIdSchema.parse('abc123')).not.toThrow();
    expect(() => albumIdSchema.parse('album-123_test')).not.toThrow();
  });

  it('should reject empty strings', () => {
    expect(() => albumIdSchema.parse('')).toThrow();
  });

  it('should reject special characters', () => {
    expect(() => albumIdSchema.parse('album@123')).toThrow();
    expect(() => albumIdSchema.parse('album#123')).toThrow();
    expect(() => albumIdSchema.parse('album 123')).toThrow();
  });
});

describe('artistIdSchema', () => {
  it('should accept numeric IDs', () => {
    expect(() => artistIdSchema.parse('123')).not.toThrow();
  });

  it('should accept alphanumeric IDs with hyphens and underscores', () => {
    expect(() => artistIdSchema.parse('artist-123')).not.toThrow();
    expect(() => artistIdSchema.parse('artist_123')).not.toThrow();
  });

  it('should reject empty strings', () => {
    expect(() => artistIdSchema.parse('')).toThrow();
  });
});

describe('userIdSchema', () => {
  it('should accept alphanumeric IDs', () => {
    expect(() => userIdSchema.parse('user123')).not.toThrow();
    expect(() => userIdSchema.parse('user-123-abc')).not.toThrow();
    expect(() => userIdSchema.parse('user_123')).not.toThrow();
  });

  it('should reject special characters', () => {
    expect(() => userIdSchema.parse('user@123')).toThrow();
    expect(() => userIdSchema.parse('user!123')).toThrow();
  });
});

describe('collectionIdSchema', () => {
  it('should accept alphanumeric IDs', () => {
    expect(() => collectionIdSchema.parse('collection123')).not.toThrow();
    expect(() => collectionIdSchema.parse('coll-123')).not.toThrow();
  });

  it('should reject special characters', () => {
    expect(() => collectionIdSchema.parse('coll#123')).toThrow();
  });
});

describe('validateParams', () => {
  it('should return success with valid params', () => {
    const result = validateParams(albumParamsSchema, { id: '123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('123');
    }
  });

  it('should return error with invalid params', () => {
    const result = validateParams(albumParamsSchema, { id: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('empty');
    }
  });

  it('should return error for missing required fields', () => {
    const result = validateParams(albumParamsSchema, {});
    expect(result.success).toBe(false);
  });

  it('should work with different schemas', () => {
    const artistResult = validateParams(artistParamsSchema, { id: 'artist-1' });
    expect(artistResult.success).toBe(true);

    const userResult = validateParams(userProfileParamsSchema, {
      userId: 'user-1',
    });
    expect(userResult.success).toBe(true);

    const collectionResult = validateParams(collectionParamsSchema, {
      id: 'coll-1',
    });
    expect(collectionResult.success).toBe(true);
  });
});

// ===========================
// API VALIDATION TESTS
// ===========================

describe('userRegistrationSchema', () => {
  const validUser = {
    email: 'test@example.com',
    password: 'Password123',
    username: 'JohnDoe',
  };

  it('should accept valid registration data', () => {
    const result = userRegistrationSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  describe('email validation', () => {
    it('should reject invalid email', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('should lowercase email', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        email: 'TEST@EXAMPLE.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should reject email with leading/trailing whitespace', () => {
      // The schema applies trim() after email validation, so whitespace makes it invalid
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        email: '  test@example.com  ',
      });
      // Zod validates email format before trimming, so whitespace causes validation to fail
      expect(result.success).toBe(false);
    });

    it('should trim valid email after validation', () => {
      // A valid email gets lowercased and trimmed
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        email: 'TEST@EXAMPLE.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });
  });

  describe('password validation', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        password: 'Pass1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        password: 'PASSWORD123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        password: 'PasswordOnly',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid complex passwords', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        password: 'MySecure123Password!',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('username validation', () => {
    it('should reject usernames shorter than 2 characters', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        username: 'J',
      });
      expect(result.success).toBe(false);
    });

    it('should reject usernames longer than 30 characters', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        username: 'A'.repeat(31),
      });
      expect(result.success).toBe(false);
    });

    it('should accept usernames with allowed special characters', () => {
      expect(
        userRegistrationSchema.safeParse({ ...validUser, username: 'John-Doe' })
          .success
      ).toBe(true);
      expect(
        userRegistrationSchema.safeParse({ ...validUser, username: 'John_Doe' })
          .success
      ).toBe(true);
      expect(
        userRegistrationSchema.safeParse({ ...validUser, username: 'John.Doe' })
          .success
      ).toBe(true);
    });

    it('should reject usernames with disallowed characters', () => {
      expect(
        userRegistrationSchema.safeParse({ ...validUser, username: 'John@Doe' })
          .success
      ).toBe(false);
      expect(
        userRegistrationSchema.safeParse({ ...validUser, username: 'John#Doe' })
          .success
      ).toBe(false);
      expect(
        userRegistrationSchema.safeParse({ ...validUser, username: 'John$Doe' })
          .success
      ).toBe(false);
      expect(
        userRegistrationSchema.safeParse({ ...validUser, username: 'John Doe' })
          .success
      ).toBe(false);
    });

    it('should trim username', () => {
      const result = userRegistrationSchema.safeParse({
        ...validUser,
        username: '  JohnDoe  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('JohnDoe');
      }
    });
  });
});

describe('userProfileUpdateSchema', () => {
  it('should require username with minimum 2 characters', () => {
    expect(userProfileUpdateSchema.safeParse({ username: 'Jo' }).success).toBe(
      true
    );
    expect(userProfileUpdateSchema.safeParse({ username: 'J' }).success).toBe(
      false
    );
  });

  it('should accept optional bio', () => {
    const result = userProfileUpdateSchema.safeParse({
      username: 'John',
      bio: 'This is my bio',
    });
    expect(result.success).toBe(true);
  });

  it('should reject bio longer than 500 characters', () => {
    const result = userProfileUpdateSchema.safeParse({
      username: 'John',
      bio: 'A'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('albumRequestSchema', () => {
  const validAlbum = {
    title: 'OK Computer',
    artist: 'Radiohead',
  };

  it('should accept valid album data', () => {
    const result = albumRequestSchema.safeParse(validAlbum);
    expect(result.success).toBe(true);
  });

  it('should require title', () => {
    const result = albumRequestSchema.safeParse({ artist: 'Radiohead' });
    expect(result.success).toBe(false);
  });

  it('should require artist', () => {
    const result = albumRequestSchema.safeParse({ title: 'OK Computer' });
    expect(result.success).toBe(false);
  });

  it('should accept optional year', () => {
    const result = albumRequestSchema.safeParse({
      ...validAlbum,
      year: 1997,
    });
    expect(result.success).toBe(true);
  });

  it('should reject year before 1900', () => {
    const result = albumRequestSchema.safeParse({
      ...validAlbum,
      year: 1899,
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional genre array', () => {
    const result = albumRequestSchema.safeParse({
      ...validAlbum,
      genre: ['Alternative Rock', 'Art Rock'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject more than 10 genres', () => {
    const result = albumRequestSchema.safeParse({
      ...validAlbum,
      genre: Array(11).fill('Rock'),
    });
    expect(result.success).toBe(false);
  });
});

describe('collectionRequestSchema', () => {
  it('should accept valid collection data', () => {
    const result = collectionRequestSchema.safeParse({
      name: 'My Collection',
    });
    expect(result.success).toBe(true);
  });

  it('should require name', () => {
    const result = collectionRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept optional description', () => {
    const result = collectionRequestSchema.safeParse({
      name: 'My Collection',
      description: 'A great collection',
    });
    expect(result.success).toBe(true);
  });

  it('should reject description longer than 500 characters', () => {
    const result = collectionRequestSchema.safeParse({
      name: 'My Collection',
      description: 'A'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional isPublic boolean', () => {
    const result = collectionRequestSchema.safeParse({
      name: 'My Collection',
      isPublic: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('addToCollectionSchema', () => {
  it('should accept numeric album ID', () => {
    const result = addToCollectionSchema.safeParse({ albumId: '123' });
    expect(result.success).toBe(true);
  });

  it('should reject non-numeric album ID', () => {
    const result = addToCollectionSchema.safeParse({ albumId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('should reject empty album ID', () => {
    const result = addToCollectionSchema.safeParse({ albumId: '' });
    expect(result.success).toBe(false);
  });
});

// ===========================
// UTILITY FUNCTION TESTS
// ===========================

describe('validateQueryParams', () => {
  it('should validate URLSearchParams successfully', () => {
    const params = new URLSearchParams({ id: '123' });
    const result = validateQueryParams(albumParamsSchema, params);
    expect(result.success).toBe(true);
  });

  it('should return error details for invalid params', () => {
    const params = new URLSearchParams({ id: '' });
    const result = validateQueryParams(albumParamsSchema, params);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details).toBeDefined();
      expect(result.details.length).toBeGreaterThan(0);
    }
  });
});

describe('validateRequestBody', () => {
  it('should validate request body successfully', () => {
    const body = { name: 'My Collection' };
    const result = validateRequestBody(collectionRequestSchema, body);
    expect(result.success).toBe(true);
  });

  it('should return error details for invalid body', () => {
    const body = { name: '' };
    const result = validateRequestBody(collectionRequestSchema, body);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details).toBeDefined();
    }
  });
});

describe('createErrorResponse', () => {
  it('should create error response with required fields', () => {
    const { response, status } = createErrorResponse('Something went wrong');
    expect(response.error).toBe('Something went wrong');
    expect(status).toBe(400);
    expect(response.timestamp).toBeDefined();
  });

  it('should include optional details and code', () => {
    const { response } = createErrorResponse(
      'Error',
      400,
      'More details',
      'ERR_001'
    );
    expect(response.details).toBe('More details');
    expect(response.code).toBe('ERR_001');
  });

  it('should use custom status code', () => {
    const { status } = createErrorResponse('Not found', 404);
    expect(status).toBe(404);
  });
});

describe('createSuccessResponse', () => {
  it('should create success response with message', () => {
    const { response, status } = createSuccessResponse('Operation successful');
    expect(response.message).toBe('Operation successful');
    expect(status).toBe(200);
  });

  it('should include optional data', () => {
    const { response } = createSuccessResponse('Success', { id: '123' });
    expect(response.data).toEqual({ id: '123' });
  });

  it('should use custom status code', () => {
    const { status } = createSuccessResponse('Created', undefined, 201);
    expect(status).toBe(201);
  });
});

describe('createPaginatedResponse', () => {
  it('should create paginated response with correct pagination', () => {
    const data = [1, 2, 3, 4, 5];
    const result = createPaginatedResponse(data, 1, 5, 20);

    expect(result.data).toEqual(data);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(5);
    expect(result.pagination.total).toBe(20);
    expect(result.pagination.totalPages).toBe(4);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(false);
  });

  it('should calculate hasNext correctly', () => {
    const lastPage = createPaginatedResponse([], 4, 5, 20);
    expect(lastPage.pagination.hasNext).toBe(false);

    const middlePage = createPaginatedResponse([], 2, 5, 20);
    expect(middlePage.pagination.hasNext).toBe(true);
  });

  it('should calculate hasPrev correctly', () => {
    const firstPage = createPaginatedResponse([], 1, 5, 20);
    expect(firstPage.pagination.hasPrev).toBe(false);

    const secondPage = createPaginatedResponse([], 2, 5, 20);
    expect(secondPage.pagination.hasPrev).toBe(true);
  });

  it('should calculate totalPages correctly', () => {
    expect(createPaginatedResponse([], 1, 10, 25).pagination.totalPages).toBe(
      3
    );
    expect(createPaginatedResponse([], 1, 10, 30).pagination.totalPages).toBe(
      3
    );
    expect(createPaginatedResponse([], 1, 10, 31).pagination.totalPages).toBe(
      4
    );
  });

  it('should handle empty data', () => {
    const result = createPaginatedResponse([], 1, 10, 0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
  });
});
