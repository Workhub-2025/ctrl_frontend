"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export type FirebaseBrowserConfig = Readonly<{
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}>;

const FIREBASE_ENVIRONMENT = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
} as const;

function requiredFirebaseValue(
  name: (typeof FIREBASE_ENVIRONMENT)[keyof typeof FIREBASE_ENVIRONMENT],
  value: string | undefined,
): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing required Firebase browser configuration: ${name}`);
  }
  return normalized;
}

export function getFirebaseBrowserConfig(): FirebaseBrowserConfig {
  return {
    apiKey: requiredFirebaseValue(
      FIREBASE_ENVIRONMENT.apiKey,
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    ),
    authDomain: requiredFirebaseValue(
      FIREBASE_ENVIRONMENT.authDomain,
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    ),
    projectId: requiredFirebaseValue(
      FIREBASE_ENVIRONMENT.projectId,
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    ),
    storageBucket: requiredFirebaseValue(
      FIREBASE_ENVIRONMENT.storageBucket,
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    ),
    messagingSenderId: requiredFirebaseValue(
      FIREBASE_ENVIRONMENT.messagingSenderId,
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ),
    appId: requiredFirebaseValue(
      FIREBASE_ENVIRONMENT.appId,
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    ),
  };
}

export function getFirebaseBrowserApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase browser SDK cannot be initialized on the server");
  }
  return getApps().length > 0
    ? getApp()
    : initializeApp(getFirebaseBrowserConfig());
}

export function getFirebaseBrowserAuth(): Auth {
  return getAuth(getFirebaseBrowserApp());
}
