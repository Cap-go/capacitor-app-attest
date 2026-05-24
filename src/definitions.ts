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
   * Returns attestation and optional fraud-signal capabilities available on the current platform.
   *
   * Widevine is Android-only and optional. Apps that do not call Widevine methods do not need any
   * Widevine-specific setup.
   */
  getCapabilities(): Promise<AppAttestCapabilities>;

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
   * Returns an optional Android Widevine-derived fingerprint.
   *
   * This method is Android-only and is not part of the normal attestation flow. Call it only when
   * your app needs a DRM-backed fraud signal and your privacy policy covers that use.
   *
   * The default `fingerprint` is SHA-256 over the Widevine device unique ID and a salt.
   * If `hashSalt` is not provided, Android uses the app package name as the salt.
   *
   * The raw Widevine ID is sensitive and is only returned as base64 when `includeRawId` is true.
   */
  getWidevineFingerprint(options?: WidevineFingerprintOptions): Promise<WidevineFingerprintResult>;

  /**
   * Creates an iOS DeviceCheck token for server-side fraud-state lookups.
   */
  getDeviceCheckToken(): Promise<DeviceCheckTokenResult>;

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

export interface AppAttestCapabilities {
  /**
   * Platform currently executing the plugin.
   */
  platform: AttestationPlatform;

  /**
   * Apple App Attest support.
   */
  appAttest: SupportStatus;

  /**
   * Android Play Integrity support.
   */
  playIntegrity: SupportStatus;

  /**
   * iOS DeviceCheck support.
   */
  deviceCheck: SupportStatus;

  /**
   * Optional Android Widevine DRM support.
   */
  widevine: WidevineCapabilities;
}

export interface SupportStatus {
  /**
   * Whether the capability is available on the current device.
   */
  supported: boolean;
}

export interface WidevineCapabilities {
  /**
   * Whether the Widevine DRM scheme is supported by the device.
   */
  supported: boolean;

  /**
   * Whether a Widevine fingerprint can be attempted.
   *
   * Actual access is confirmed when calling `getWidevineFingerprint()`.
   */
  fingerprintAvailable: boolean;

  /**
   * Whether the Widevine security level property can be read.
   */
  securityLevelScanSupported: boolean;
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

export interface WidevineFingerprintOptions {
  /**
   * Return the raw Widevine device unique ID as base64.
   *
   * Defaults to `false`.
   */
  includeRawId?: boolean;

  /**
   * Optional salt used to derive `fingerprint`.
   *
   * Android uses the app package name when omitted.
   */
  hashSalt?: string;
}

export interface WidevineFingerprintResult {
  /**
   * Always `android`.
   */
  platform: 'android';

  /**
   * Always `widevine`.
   */
  source: 'widevine';

  /**
   * Salted SHA-256 fingerprint for storing alongside a user record.
   */
  fingerprint: string;

  /**
   * Unsalted SHA-256 hash of the Widevine device unique ID.
   */
  widevineIdSha256: string;

  /**
   * Raw Widevine device unique ID encoded as base64.
   *
   * Returned only when `includeRawId` is true.
   */
  widevineIdBase64?: string;

  /**
   * Widevine security level when available, for example `L1` or `L3`.
   */
  securityLevel?: string;

  /**
   * DRM vendor when available.
   */
  vendor?: string;

  /**
   * DRM plugin version when available.
   */
  version?: string;

  /**
   * DRM plugin description when available.
   */
  description?: string;
}

export interface DeviceCheckTokenResult {
  /**
   * iOS DeviceCheck token encoded as base64.
   */
  token: string;
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
