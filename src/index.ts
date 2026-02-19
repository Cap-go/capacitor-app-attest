import { Capacitor, registerPlugin } from '@capacitor/core';

import type {
  AppAttestPlugin,
  AttestKeyOptions,
  AttestKeyResult,
  AttestationFormat,
  AttestationPlatform,
  CreateAssertionOptions,
  CreateAssertionResult,
  CreateAttestationOptions,
  CreateAttestationResult,
  GenerateAssertionOptions,
  GenerateAssertionResult,
  GenerateKeyOptions,
  GenerateKeyResult,
  GetStoredKeyIdResult,
  IsSupportedResult,
  OperationResult,
  PrepareOptions,
  PrepareResult,
  StoreKeyIdOptions,
} from './definitions';

interface NativeIsSupportedResult {
  isSupported: boolean;
}

interface NativeGenerateKeyResult {
  keyId: string;
}

interface NativeAttestKeyResult {
  attestation: string;
  keyId: string;
  challenge: string;
}

interface NativeGenerateAssertionResult {
  assertion: string;
  keyId: string;
}

interface NativeAppAttestPlugin {
  isSupported(): Promise<NativeIsSupportedResult>;
  generateKey(options?: PrepareOptions): Promise<NativeGenerateKeyResult>;
  attestKey(options: AttestKeyOptions): Promise<NativeAttestKeyResult>;
  generateAssertion(options: GenerateAssertionOptions): Promise<NativeGenerateAssertionResult>;
  storeKeyId(options: StoreKeyIdOptions): Promise<OperationResult>;
  getStoredKeyId(): Promise<GetStoredKeyIdResult>;
  clearStoredKeyId(): Promise<OperationResult>;
}

const AppAttestNative = registerPlugin<NativeAppAttestPlugin>('AppAttest', {
  web: () => import('./web').then((m) => new m.AppAttestWeb()),
});

const getPlatform = (): AttestationPlatform => {
  const platform = Capacitor.getPlatform();

  if (platform === 'ios' || platform === 'android') {
    return platform;
  }

  return 'web';
};

const getFormat = (platform: AttestationPlatform): AttestationFormat => {
  if (platform === 'ios') {
    return 'apple-app-attest';
  }

  if (platform === 'android') {
    return 'google-play-integrity-standard';
  }

  return 'web-fallback';
};

const withPlatform = () => {
  const platform = getPlatform();
  return {
    platform,
    format: getFormat(platform),
  };
};

const isSupported = async (): Promise<IsSupportedResult> => {
  const status = await AppAttestNative.isSupported();
  return {
    ...withPlatform(),
    isSupported: status.isSupported,
  };
};

const prepare = async (options?: PrepareOptions): Promise<PrepareResult> => {
  const result = await AppAttestNative.generateKey(options);
  return {
    ...withPlatform(),
    keyId: result.keyId,
  };
};

const createAttestation = async (options: CreateAttestationOptions): Promise<CreateAttestationResult> => {
  const result = await AppAttestNative.attestKey(options);
  const keyId = result.keyId ?? options.keyId;
  const challenge = result.challenge ?? options.challenge;
  return {
    ...withPlatform(),
    token: result.attestation,
    keyId,
    challenge,
  };
};

const createAssertion = async (options: CreateAssertionOptions): Promise<CreateAssertionResult> => {
  const result = await AppAttestNative.generateAssertion(options);
  const keyId = result.keyId ?? options.keyId;
  return {
    ...withPlatform(),
    token: result.assertion,
    keyId,
    payload: options.payload,
  };
};

const generateKey = async (options?: GenerateKeyOptions): Promise<GenerateKeyResult> => {
  return prepare(options);
};

const attestKey = async (options: AttestKeyOptions): Promise<AttestKeyResult> => {
  const result = await createAttestation(options);
  return {
    ...result,
    attestation: result.token,
  };
};

const generateAssertion = async (options: GenerateAssertionOptions): Promise<GenerateAssertionResult> => {
  const result = await createAssertion(options);
  return {
    ...result,
    assertion: result.token,
  };
};

const AppAttest: AppAttestPlugin = {
  isSupported,
  prepare,
  createAttestation,
  createAssertion,
  storeKeyId: (options) => AppAttestNative.storeKeyId(options),
  getStoredKeyId: () => AppAttestNative.getStoredKeyId(),
  clearStoredKeyId: () => AppAttestNative.clearStoredKeyId(),
  generateKey,
  attestKey,
  generateAssertion,
};

export * from './definitions';
export { AppAttest };
