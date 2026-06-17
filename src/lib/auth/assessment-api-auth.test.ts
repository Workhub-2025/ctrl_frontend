import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { guardAssessmentApiRoute } from '@/lib/auth/bff-api-middleware';

const ASSESSMENT_API_ROOT = path.join(process.cwd(), 'src/app/api/assessment');

function listAssessmentRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listAssessmentRouteFiles(fullPath));
      continue;
    }
    if (entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

describe('guardAssessmentApiRoute', () => {
  it('requires authentication for assessment BFF routes', () => {
    expect(guardAssessmentApiRoute('/api/assessment/attempt/status', false)?.status).toBe(401);
    expect(guardAssessmentApiRoute('/api/assessment/attempt/status', true)).toBeNull();
    expect(guardAssessmentApiRoute('/api/auth/login', false)).toBeNull();
  });
});

const SECURE_ASSESSMENT_HANDLERS = ['getServerSession', 'handleAssessmentSubmit'];

describe('assessment API route handlers', () => {
  it('enforce session + Strapi JWT checks in every route file', () => {
    const routeFiles = listAssessmentRouteFiles(ASSESSMENT_API_ROOT);
    expect(routeFiles.length).toBeGreaterThan(0);

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const usesSecureHandler = SECURE_ASSESSMENT_HANDLERS.some((marker) => content.includes(marker));
      expect(usesSecureHandler, `${file} must authenticate via session helper or handleAssessmentSubmit`).toBe(true);

      if (content.includes('getServerSession')) {
        expect(content, `${file} must call getServerStrapiJwt`).toContain('getServerStrapiJwt');
        expect(content, `${file} must return 401 when unauthenticated`).toMatch(/status:\s*401/);
      }
    }
  });
});
