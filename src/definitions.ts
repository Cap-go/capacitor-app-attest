/// <reference types="@capacitor/cli" />

declare module '@capacitor/cli' {
  export interface PluginsConfig {
    /**
     * App Attest plugin configuration.
     */
    AppAttest?: AppAttestPluginConfig;
  }
}

/**
 * Capacitor config for the App Attest plugin.
 */
export interface AppAttestPluginConfig {
  /**
   * Android only. Google Cloud project number used by Play Integrity Standard API.
   *
   * Example:
   * `plugins.AppAttest.cloudProjectNumber = '123456789012'`
   */
  cloudProjectNumber?: string;
}

export type AttestationPlatform = 'ios' | 'android' | 'web';

export type AttestationFormat = 'apple-app-attest' | 'google-play-integrity-standard' | 'web-fallback';

/**
 * Unified cross-platform attestation plugin for Capacitor.
 *
 * Recommended methods:
 * - `prepare()`
 * - `createAttestation()`
 * - `createAssertion()`
 *
 * Legacy aliases are still available for compatibility:
 * - `generateKey()`
 * - `attestKey()`
 * - `generateAssertion()`
 */
export interface AppAttestPlugin {
  /**
   * Checks whether native attestation is available on this device.
   */
  isSupported(): Promise<IsSupportedResult>;

  /**
   * Prepares attestation state and returns the key handle used for later calls.
   *
   * iOS: generates a real App Attest key identifier.
   * Android: prepares a Play Integrity Standard token provider handle.
   */
  prepare(options?: PrepareOptions): Promise<PrepareResult>;

  /**
   * Creates a registration attestation token bound to a backend-issued challenge.
   *
   * iOS: returns App Attest `attestationObject`.
   * Android: returns Play Integrity Standard token.
   */
  createAttestation(options: CreateAttestationOptions): Promise<CreateAttestationResult>;

  /**
   * Creates a request assertion token bound to a request payload.
   *
   * iOS: returns App Attest assertion.
   * Android: returns Play Integrity Standard token.
   */
  createAssertion(options: CreateAssertionOptions): Promise<CreateAssertionResult>;

  /**
   * Stores/prepares a key identifier for reuse.
   *
   * iOS: persists in UserDefaults.
   * Android: prepares a native Play Integrity provider for this key id in memory (process lifetime).
   */
  storeKeyId(options: StoreKeyIdOptions): Promise<OperationResult>;

  /**
   * Returns the currently stored/prepared key identifier.
   *
   * Android value is only available while the process is alive.
   */
  getStoredKeyId(): Promise<GetStoredKeyIdResult>;

  /**
   * Clears stored/prepared key identifiers.
   */
  clearStoredKeyId(): Promise<OperationResult>;

  /**
   * Legacy alias for `prepare()`.
   *
   * @deprecated Use `prepare()`.
   */
  generateKey(options?: GenerateKeyOptions): Promise<GenerateKeyResult>;

  /**
   * Legacy alias for `createAttestation()`.
   *
   * @deprecated Use `createAttestation()`.
   */
  attestKey(options: AttestKeyOptions): Promise<AttestKeyResult>;

  /**
   * Legacy alias for `createAssertion()`.
   *
   * @deprecated Use `createAssertion()`.
   */
  generateAssertion(options: GenerateAssertionOptions): Promise<GenerateAssertionResult>;
}

export interface IsSupportedResult {
  isSupported: boolean;
  platform: AttestationPlatform;
  format: AttestationFormat;
}

export interface PrepareOptions {
  /**
   * Android only. Google Cloud project number for Play Integrity.
   * Can be set globally in Capacitor config via `plugins.AppAttest.cloudProjectNumber`.
   */
  cloudProjectNumber?: string;
}

export interface PrepareResult {
  keyId: string;
  platform: AttestationPlatform;
  format: AttestationFormat;
}

export interface CreateAttestationOptions {
  keyId: string;
  challenge: string;
  cloudProjectNumber?: string;
}

export interface CreateAttestationResult {
  /**
   * Unified attestation token value.
   *
   * iOS: base64 App Attest attestation.
   * Android: Play Integrity token.
   */
  token: string;
  keyId: string;
  challenge: string;
  platform: AttestationPlatform;
  format: AttestationFormat;
}

export interface CreateAssertionOptions {
  keyId: string;
  payload: string;
  cloudProjectNumber?: string;
}

export interface CreateAssertionResult {
  /**
   * Unified assertion token value.
   *
   * iOS: base64 App Attest assertion.
   * Android: Play Integrity token.
   */
  token: string;
  keyId: string;
  payload: string;
  platform: AttestationPlatform;
  format: AttestationFormat;
}

export type GenerateKeyOptions = PrepareOptions;

export type GenerateKeyResult = PrepareResult;

export type AttestKeyOptions = CreateAttestationOptions;

export interface AttestKeyResult extends CreateAttestationResult {
  /**
   * Legacy field equal to `token`.
   */
  attestation: string;
}

export type GenerateAssertionOptions = CreateAssertionOptions;

export interface GenerateAssertionResult extends CreateAssertionResult {
  /**
   * Legacy field equal to `token`.
   */
  assertion: string;
}

export interface StoreKeyIdOptions {
  keyId: string;
  cloudProjectNumber?: string;
}

export interface GetStoredKeyIdResult {
  keyId: string | null;
  hasStoredKey: boolean;
}

export interface OperationResult {
  success: boolean;
}
