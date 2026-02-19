import { WebPlugin } from '@capacitor/core';

import type {
  AppAttestPlugin,
  AttestKeyOptions,
  AttestKeyResult,
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

const STORAGE_KEY = 'CapgoAppAttestKeyId';
const WEB_ERROR_MESSAGE = 'Native attestation is not available on web. Use iOS App Attest or Android Play Integrity.';

export class AppAttestWeb extends WebPlugin implements AppAttestPlugin {
  async isSupported(): Promise<IsSupportedResult> {
    return {
      isSupported: false,
      platform: 'web',
      format: 'web-fallback',
    };
  }

  async prepare(_options?: PrepareOptions): Promise<PrepareResult> {
    void _options;
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return {
        keyId: crypto.randomUUID(),
        platform: 'web',
        format: 'web-fallback',
      };
    }

    const keyId = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return {
      keyId,
      platform: 'web',
      format: 'web-fallback',
    };
  }

  async createAttestation(_options: CreateAttestationOptions): Promise<CreateAttestationResult> {
    void _options;
    throw new Error(WEB_ERROR_MESSAGE);
  }

  async createAssertion(_options: CreateAssertionOptions): Promise<CreateAssertionResult> {
    void _options;
    throw new Error(WEB_ERROR_MESSAGE);
  }

  async storeKeyId(options: StoreKeyIdOptions): Promise<OperationResult> {
    localStorage.setItem(STORAGE_KEY, options.keyId);
    return { success: true };
  }

  async getStoredKeyId(): Promise<GetStoredKeyIdResult> {
    const keyId = localStorage.getItem(STORAGE_KEY);
    return {
      keyId,
      hasStoredKey: keyId !== null,
    };
  }

  async clearStoredKeyId(): Promise<OperationResult> {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true };
  }

  async generateKey(options?: GenerateKeyOptions): Promise<GenerateKeyResult> {
    return this.prepare(options);
  }

  async attestKey(options: AttestKeyOptions): Promise<AttestKeyResult> {
    const result = await this.createAttestation(options);
    return {
      ...result,
      attestation: result.token,
    };
  }

  async generateAssertion(options: GenerateAssertionOptions): Promise<GenerateAssertionResult> {
    const result = await this.createAssertion(options);
    return {
      ...result,
      assertion: result.token,
    };
  }
}
