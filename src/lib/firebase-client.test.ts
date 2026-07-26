import { afterEach, describe, expect, it, vi } from "vitest";

import { getFirebaseBrowserConfig } from "@/lib/firebase-client";

const FIREBASE_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "ctrl-assess.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "ctrl-assess",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "ctrl-assess.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "765430607081",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:765430607081:web:eede2900e1648ffb981478",
} as const;

describe("Firebase browser configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads the staging web application configuration from public environment values", () => {
    for (const [name, value] of Object.entries(FIREBASE_ENV)) {
      vi.stubEnv(name, value);
    }

    expect(getFirebaseBrowserConfig()).toEqual({
      apiKey: "test-api-key",
      authDomain: "ctrl-assess.firebaseapp.com",
      projectId: "ctrl-assess",
      storageBucket: "ctrl-assess.firebasestorage.app",
      messagingSenderId: "765430607081",
      appId: "1:765430607081:web:eede2900e1648ffb981478",
    });
  });

  it("fails closed when a required Firebase value is absent", () => {
    for (const [name, value] of Object.entries(FIREBASE_ENV)) {
      vi.stubEnv(name, value);
    }
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");

    expect(() => getFirebaseBrowserConfig()).toThrow(
      "Missing required Firebase browser configuration: NEXT_PUBLIC_FIREBASE_API_KEY",
    );
  });
});
