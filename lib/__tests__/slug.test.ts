import {
  generateSlug,
  generateAlternativeSlug,
  validateOrganizationSlug,
  isReservedSlug,
  RESERVED_SLUGS,
} from '../slug';

describe('slug utilities', () => {
  describe('generateSlug', () => {
    it('should convert text to lowercase', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('my organization')).toBe('my-organization');
    });

    it('should remove accents', () => {
      expect(generateSlug('Café École')).toBe('cafe-ecole');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Test@#$%Company')).toBe('test-company');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('-test-')).toBe('test');
    });

    it('should limit to 50 characters', () => {
      const longText = 'a'.repeat(100);
      expect(generateSlug(longText).length).toBeLessThanOrEqual(50);
    });

    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('should handle multiple consecutive spaces', () => {
      expect(generateSlug('hello    world')).toBe('hello-world');
    });
  });

  describe('generateAlternativeSlug', () => {
    it('should append counter to base slug', () => {
      expect(generateAlternativeSlug('test', 1)).toBe('test-1');
      expect(generateAlternativeSlug('test', 2)).toBe('test-2');
    });

    it('should handle base slug with hyphens', () => {
      expect(generateAlternativeSlug('my-org', 5)).toBe('my-org-5');
    });
  });

  describe('isReservedSlug', () => {
    it('should return true for system routes', () => {
      expect(isReservedSlug('api')).toBe(true);
      expect(isReservedSlug('auth')).toBe(true);
      expect(isReservedSlug('vote')).toBe(true);
      expect(isReservedSlug('public-vote')).toBe(true);
      expect(isReservedSlug('invitations')).toBe(true);
      expect(isReservedSlug('settings')).toBe(true);
      expect(isReservedSlug('create-organization')).toBe(true);
    });

    it('should return true for sub-routes that would conflict', () => {
      expect(isReservedSlug('decisions')).toBe(true);
      expect(isReservedSlug('members')).toBe(true);
      expect(isReservedSlug('teams')).toBe(true);
      expect(isReservedSlug('new')).toBe(true);
    });

    it('should return true for generic terms', () => {
      expect(isReservedSlug('organizations')).toBe(true);
      expect(isReservedSlug('admin')).toBe(true);
      expect(isReservedSlug('dashboard')).toBe(true);
    });

    it('should return false for non-reserved slugs', () => {
      expect(isReservedSlug('my-company')).toBe(false);
      expect(isReservedSlug('acme-corp')).toBe(false);
      expect(isReservedSlug('test-org')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isReservedSlug('API')).toBe(false); // Slugs are lowercase
      expect(isReservedSlug('Auth')).toBe(false);
    });
  });

  describe('validateOrganizationSlug', () => {
    describe('valid slugs', () => {
      it('should accept valid simple slugs', () => {
        const result = validateOrganizationSlug('my-company');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept slugs with numbers', () => {
        const result = validateOrganizationSlug('company-2024');
        expect(result.valid).toBe(true);
      });

      it('should accept minimum length slug (3 chars)', () => {
        const result = validateOrganizationSlug('abc');
        expect(result.valid).toBe(true);
      });

      it('should accept maximum length slug (50 chars)', () => {
        const slug = 'a'.repeat(50);
        const result = validateOrganizationSlug(slug);
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid slugs - empty/length', () => {
      it('should reject empty string', () => {
        const result = validateOrganizationSlug('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('vide');
      });

      it('should reject whitespace-only string', () => {
        const result = validateOrganizationSlug('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('vide');
      });

      it('should reject too short slug (< 3 chars)', () => {
        const result = validateOrganizationSlug('ab');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('au moins 3 caractères');
      });

      it('should reject too long slug (> 50 chars)', () => {
        const slug = 'a'.repeat(51);
        const result = validateOrganizationSlug(slug);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('50 caractères');
      });
    });

    describe('invalid slugs - format', () => {
      it('should reject uppercase letters', () => {
        const result = validateOrganizationSlug('MyCompany');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lettres minuscules');
      });

      it('should reject special characters', () => {
        const result = validateOrganizationSlug('my@company');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lettres minuscules');
      });

      it('should reject spaces', () => {
        const result = validateOrganizationSlug('my company');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lettres minuscules');
      });

      it('should reject leading hyphen', () => {
        const result = validateOrganizationSlug('-mycompany');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('tirets');
      });

      it('should reject trailing hyphen', () => {
        const result = validateOrganizationSlug('mycompany-');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('tirets');
      });

      it('should reject consecutive hyphens', () => {
        const result = validateOrganizationSlug('my--company');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('tirets');
      });
    });

    describe('invalid slugs - reserved words', () => {
      it('should reject all reserved slugs', () => {
        RESERVED_SLUGS.forEach((reservedSlug) => {
          const result = validateOrganizationSlug(reservedSlug);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('réservé');
          expect(result.error).toContain(reservedSlug);
        });
      });

      it('should provide helpful error message for reserved slug', () => {
        const result = validateOrganizationSlug('api');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Le slug "api" est réservé et ne peut pas être utilisé');
      });
    });

    describe('edge cases', () => {
      it('should handle slug with only numbers', () => {
        const result = validateOrganizationSlug('123');
        expect(result.valid).toBe(true);
      });

      it('should handle single hyphen separators', () => {
        const result = validateOrganizationSlug('my-test-company-2024');
        expect(result.valid).toBe(true);
      });

      it('should reject underscores', () => {
        const result = validateOrganizationSlug('my_company');
        expect(result.valid).toBe(false);
      });

      it('should reject dots', () => {
        const result = validateOrganizationSlug('my.company');
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('integration - generateSlug + validateOrganizationSlug', () => {
    it('should generate valid slugs from common organization names', () => {
      const testCases = [
        'Acme Corporation',
        'Tech Startup 2024',
        'Café & Restaurant',
        'École Primaire',
        'Non-Profit Org',
      ];

      testCases.forEach((name) => {
        const slug = generateSlug(name);
        const validation = validateOrganizationSlug(slug);
        expect(validation.valid).toBe(true);
      });
    });

    it('should detect when generated slug is reserved', () => {
      const slug = generateSlug('API Gateway'); // generates 'api-gateway'
      // 'api-gateway' is not reserved, but 'api' is
      expect(validateOrganizationSlug(slug).valid).toBe(true);

      const reservedSlug = generateSlug('API'); // generates 'api'
      expect(validateOrganizationSlug(reservedSlug).valid).toBe(false);
    });

    it('should handle too-short generated slugs', () => {
      const slug = generateSlug('AB'); // generates 'ab' (too short)
      const validation = validateOrganizationSlug(slug);
      expect(validation.valid).toBe(false);
    });
  });
});
