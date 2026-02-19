package app.capgo.plugin.appattest;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.StandardIntegrityException;
import com.google.android.play.core.integrity.StandardIntegrityManager;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "AppAttest")
public class AppAttestPlugin extends Plugin {

    private static final String INTEGRITY_ERROR = "INTEGRITY_ERROR";
    private static final String CONFIG_CLOUD_PROJECT_NUMBER = "cloudProjectNumber";
    private static final String DEFAULT_ANDROID_KEY_ID = "android-standard-integrity";

    private final AppAttest implementation = new AppAttest();
    private final Map<String, StandardIntegrityManager.StandardIntegrityTokenProvider> tokenProviders = new ConcurrentHashMap<>();

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject response = new JSObject();
        response.put("isSupported", implementation.isSupported(getContext()));
        call.resolve(response);
    }

    @PluginMethod
    public void generateKey(PluginCall call) {
        if (!implementation.isSupported(getContext())) {
            call.reject("Play Integrity is not supported on this device");
            return;
        }

        prepareProvider(call, DEFAULT_ANDROID_KEY_ID, (provider) -> {
            JSObject response = new JSObject();
            response.put("keyId", DEFAULT_ANDROID_KEY_ID);
            call.resolve(response);
        });
    }

    @PluginMethod
    public void attestKey(PluginCall call) {
        String keyId = call.getString("keyId");
        String challenge = call.getString("challenge");

        if (isBlank(keyId)) {
            call.reject("keyId is required");
            return;
        }

        if (isBlank(challenge)) {
            call.reject("challenge is required");
            return;
        }

        requestStandardIntegrityToken(call, keyId, challenge, "attestation", true);
    }

    @PluginMethod
    public void generateAssertion(PluginCall call) {
        String keyId = call.getString("keyId");
        String payload = call.getString("payload");

        if (isBlank(keyId)) {
            call.reject("keyId is required");
            return;
        }

        if (isBlank(payload)) {
            call.reject("payload is required");
            return;
        }

        requestStandardIntegrityToken(call, keyId, payload, "assertion", false);
    }

    @PluginMethod
    public void storeKeyId(PluginCall call) {
        String keyId = call.getString("keyId");
        if (isBlank(keyId)) {
            call.reject("keyId is required");
            return;
        }

        prepareProvider(call, keyId, (provider) -> {
            JSObject response = new JSObject();
            response.put("success", true);
            call.resolve(response);
        });
    }

    @PluginMethod
    public void getStoredKeyId(PluginCall call) {
        String keyId = null;
        if (tokenProviders.containsKey(DEFAULT_ANDROID_KEY_ID)) {
            keyId = DEFAULT_ANDROID_KEY_ID;
        } else if (!tokenProviders.isEmpty()) {
            keyId = tokenProviders.keySet().iterator().next();
        }

        JSObject response = new JSObject();
        response.put("keyId", keyId);
        response.put("hasStoredKey", keyId != null);
        call.resolve(response);
    }

    @PluginMethod
    public void clearStoredKeyId(PluginCall call) {
        tokenProviders.clear();
        JSObject response = new JSObject();
        response.put("success", true);
        call.resolve(response);
    }

    private void requestStandardIntegrityToken(
        PluginCall call,
        String keyId,
        String payload,
        String responseField,
        boolean includeChallenge
    ) {
        if (!implementation.isSupported(getContext())) {
            call.reject("Play Integrity is not supported on this device");
            return;
        }

        final String requestHash;
        try {
            requestHash = implementation.createRequestHash(payload);
        } catch (Exception error) {
            call.reject("Failed to generate request hash", INTEGRITY_ERROR, error);
            return;
        }

        withProvider(call, keyId, (provider) -> {
            StandardIntegrityManager.StandardIntegrityTokenRequest tokenRequest =
                StandardIntegrityManager.StandardIntegrityTokenRequest.builder().setRequestHash(requestHash).build();

            provider
                .request(tokenRequest)
                .addOnSuccessListener((token) -> {
                    JSObject result = new JSObject();
                    result.put(responseField, token.token());
                    result.put("keyId", keyId);
                    if (includeChallenge) {
                        result.put("challenge", payload);
                    }
                    call.resolve(result);
                })
                .addOnFailureListener((error) -> rejectPlayIntegrityError(call, "Play Integrity token request failed", error));
        });
    }

    private void withProvider(PluginCall call, String keyId, ProviderReadyCallback callback) {
        StandardIntegrityManager.StandardIntegrityTokenProvider existingProvider = tokenProviders.get(keyId);
        if (existingProvider != null) {
            callback.onReady(existingProvider);
            return;
        }

        if (DEFAULT_ANDROID_KEY_ID.equals(keyId)) {
            prepareProvider(call, keyId, callback);
            return;
        }

        call.reject("Unknown Android keyId. Call generateKey() or storeKeyId() first to prepare a native Play Integrity provider.");
    }

    private void prepareProvider(PluginCall call, String keyId, ProviderReadyCallback callback) {
        final long cloudProjectNumber;
        try {
            cloudProjectNumber = resolveCloudProjectNumber(call);
        } catch (IllegalArgumentException error) {
            call.reject(error.getMessage());
            return;
        }

        StandardIntegrityManager integrityManager = IntegrityManagerFactory.createStandard(getContext());
        StandardIntegrityManager.PrepareIntegrityTokenRequest prepareRequest =
            StandardIntegrityManager.PrepareIntegrityTokenRequest.builder().setCloudProjectNumber(cloudProjectNumber).build();

        integrityManager
            .prepareIntegrityToken(prepareRequest)
            .addOnSuccessListener((provider) -> {
                tokenProviders.put(keyId, provider);
                callback.onReady(provider);
            })
            .addOnFailureListener((error) -> rejectPlayIntegrityError(call, "Failed to prepare Play Integrity token request", error));
    }

    private long resolveCloudProjectNumber(PluginCall call) {
        Long callValueLong = call.getLong(CONFIG_CLOUD_PROJECT_NUMBER);
        if (callValueLong != null) {
            return callValueLong;
        }

        String callValueString = call.getString(CONFIG_CLOUD_PROJECT_NUMBER);
        if (!isBlank(callValueString)) {
            return parseCloudProjectNumber(callValueString);
        }

        String configValueString = getConfig().getString(CONFIG_CLOUD_PROJECT_NUMBER);
        if (!isBlank(configValueString)) {
            return parseCloudProjectNumber(configValueString);
        }

        throw new IllegalArgumentException(
            "cloudProjectNumber is required on Android. Set AppAttest.cloudProjectNumber in capacitor config or pass it in options."
        );
    }

    private long parseCloudProjectNumber(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException("cloudProjectNumber must be a valid integer string");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void rejectPlayIntegrityError(PluginCall call, String message, Exception error) {
        if (error instanceof StandardIntegrityException) {
            StandardIntegrityException integrityError = (StandardIntegrityException) error;
            call.reject(
                message + " with code " + integrityError.getErrorCode() + ": " + integrityError.getMessage(),
                INTEGRITY_ERROR,
                error
            );
            return;
        }
        call.reject(message, INTEGRITY_ERROR, error);
    }

    @FunctionalInterface
    private interface ProviderReadyCallback {
        void onReady(StandardIntegrityManager.StandardIntegrityTokenProvider provider);
    }
}
