package app.capgo.plugin.appattest;

import android.content.Context;
import android.content.pm.PackageManager;
import android.media.MediaDrm;
import android.media.UnsupportedSchemeException;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

public class AppAttest {

    // Widevine DRM SystemID from the DASH-IF Content Protection identifiers registry:
    // https://dashif.org/identifiers/content_protection/
    private static final UUID WIDEVINE_SCHEME_UUID = UUID.fromString("edef8ba9-79d6-4ace-a3c8-27dcd51d21ed");
    private static final String PROPERTY_SECURITY_LEVEL = "securityLevel";

    private final WidevineDrmReader widevineDrmReader;
    private final Base64Encoder base64Encoder;

    public AppAttest() {
        this(new AndroidWidevineDrmReader(), new AndroidBase64Encoder());
    }

    AppAttest(WidevineDrmReader widevineDrmReader, Base64Encoder base64Encoder) {
        this.widevineDrmReader = widevineDrmReader;
        this.base64Encoder = base64Encoder;
    }

    public boolean isSupported(Context context) {
        return isPlayIntegritySupported(context);
    }

    public boolean isPlayIntegritySupported(Context context) {
        try {
            context.getPackageManager().getPackageInfo("com.android.vending", 0);
            return true;
        } catch (PackageManager.NameNotFoundException ex) {
            return false;
        }
    }

    public WidevineCapabilities getWidevineCapabilities() {
        if (!widevineDrmReader.isWidevineSupported()) {
            return new WidevineCapabilities(false, false, false);
        }

        try {
            WidevineMetadata metadata = widevineDrmReader.readWidevineMetadata();
            return new WidevineCapabilities(true, true, !isBlank(metadata.securityLevel));
        } catch (AppAttestException error) {
            return new WidevineCapabilities(true, true, false);
        }
    }

    public WidevineFingerprint getWidevineFingerprint(String packageName, boolean includeRawId, String hashSalt) throws AppAttestException {
        if (!widevineDrmReader.isWidevineSupported()) {
            throw new AppAttestException("Widevine DRM is not supported on this device");
        }

        WidevineData data = widevineDrmReader.readWidevineData();
        if (data.deviceUniqueId == null || data.deviceUniqueId.length == 0) {
            throw new AppAttestException("Widevine device unique ID is not available on this device");
        }

        String salt = isBlank(hashSalt) ? packageName : hashSalt;
        byte[] fingerprintInput = joinSaltAndId(salt, data.deviceUniqueId);

        return new WidevineFingerprint(
            sha256Hex(fingerprintInput),
            sha256Hex(data.deviceUniqueId),
            includeRawId ? base64Encoder.encode(data.deviceUniqueId, false, true) : null,
            data.securityLevel,
            data.vendor,
            data.version,
            data.description
        );
    }

    public String createRequestHash(String payload) throws NoSuchAlgorithmException {
        byte[] hash = sha256(payload.getBytes(StandardCharsets.UTF_8));
        return base64Encoder.encode(hash, true, false);
    }

    static String sha256Hex(byte[] value) throws AppAttestException {
        try {
            byte[] hash = sha256(value);
            StringBuilder result = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                result.append(String.format("%02x", b & 0xff));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException error) {
            throw new AppAttestException("SHA-256 is not available", error);
        }
    }

    private static byte[] sha256(byte[] value) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return digest.digest(value);
    }

    private static byte[] joinSaltAndId(String salt, byte[] deviceUniqueId) {
        byte[] saltBytes = salt.getBytes(StandardCharsets.UTF_8);
        byte[] result = new byte[saltBytes.length + 1 + deviceUniqueId.length];
        System.arraycopy(saltBytes, 0, result, 0, saltBytes.length);
        result[saltBytes.length] = 0;
        System.arraycopy(deviceUniqueId, 0, result, saltBytes.length + 1, deviceUniqueId.length);
        return result;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    interface Base64Encoder {
        String encode(byte[] value, boolean urlSafe, boolean padding);
    }

    static final class AndroidBase64Encoder implements Base64Encoder {

        @Override
        public String encode(byte[] value, boolean urlSafe, boolean padding) {
            int flags = Base64.NO_WRAP;
            if (urlSafe) {
                flags |= Base64.URL_SAFE;
            }
            if (!padding) {
                flags |= Base64.NO_PADDING;
            }
            return Base64.encodeToString(value, flags);
        }
    }

    interface WidevineDrmReader {
        boolean isWidevineSupported();

        WidevineMetadata readWidevineMetadata() throws AppAttestException;

        WidevineData readWidevineData() throws AppAttestException;
    }

    static final class AndroidWidevineDrmReader implements WidevineDrmReader {

        @Override
        public boolean isWidevineSupported() {
            try {
                return MediaDrm.isCryptoSchemeSupported(WIDEVINE_SCHEME_UUID);
            } catch (RuntimeException error) {
                return false;
            }
        }

        @Override
        public WidevineMetadata readWidevineMetadata() throws AppAttestException {
            MediaDrm mediaDrm = null;
            try {
                mediaDrm = new MediaDrm(WIDEVINE_SCHEME_UUID);
                return readMetadata(mediaDrm);
            } catch (UnsupportedSchemeException error) {
                throw new AppAttestException("Widevine DRM is not supported on this device", error);
            } catch (RuntimeException error) {
                throw new AppAttestException("Unable to read Widevine DRM properties", error);
            } finally {
                if (mediaDrm != null) {
                    mediaDrm.release();
                }
            }
        }

        @Override
        public WidevineData readWidevineData() throws AppAttestException {
            MediaDrm mediaDrm = null;
            try {
                mediaDrm = new MediaDrm(WIDEVINE_SCHEME_UUID);
                WidevineMetadata metadata = readMetadata(mediaDrm);
                return new WidevineData(
                    readDeviceUniqueId(mediaDrm),
                    metadata.securityLevel,
                    metadata.vendor,
                    metadata.version,
                    metadata.description
                );
            } catch (UnsupportedSchemeException error) {
                throw new AppAttestException("Widevine DRM is not supported on this device", error);
            } catch (RuntimeException error) {
                throw new AppAttestException("Unable to read Widevine DRM properties", error);
            } finally {
                if (mediaDrm != null) {
                    mediaDrm.release();
                }
            }
        }

        private WidevineMetadata readMetadata(MediaDrm mediaDrm) {
            return new WidevineMetadata(
                readStringProperty(mediaDrm, PROPERTY_SECURITY_LEVEL),
                readStringProperty(mediaDrm, MediaDrm.PROPERTY_VENDOR),
                readStringProperty(mediaDrm, MediaDrm.PROPERTY_VERSION),
                readStringProperty(mediaDrm, MediaDrm.PROPERTY_DESCRIPTION)
            );
        }

        private byte[] readDeviceUniqueId(MediaDrm mediaDrm) {
            try {
                return mediaDrm.getPropertyByteArray(MediaDrm.PROPERTY_DEVICE_UNIQUE_ID);
            } catch (RuntimeException error) {
                return null;
            }
        }

        private String readStringProperty(MediaDrm mediaDrm, String propertyName) {
            try {
                return mediaDrm.getPropertyString(propertyName);
            } catch (RuntimeException error) {
                return null;
            }
        }
    }

    static final class WidevineCapabilities {

        final boolean supported;
        final boolean fingerprintAvailable;
        final boolean securityLevelScanSupported;

        WidevineCapabilities(boolean supported, boolean fingerprintAvailable, boolean securityLevelScanSupported) {
            this.supported = supported;
            this.fingerprintAvailable = fingerprintAvailable;
            this.securityLevelScanSupported = securityLevelScanSupported;
        }
    }

    static class WidevineMetadata {

        final String securityLevel;
        final String vendor;
        final String version;
        final String description;

        WidevineMetadata(String securityLevel, String vendor, String version, String description) {
            this.securityLevel = securityLevel;
            this.vendor = vendor;
            this.version = version;
            this.description = description;
        }
    }

    static final class WidevineData extends WidevineMetadata {

        final byte[] deviceUniqueId;

        WidevineData(byte[] deviceUniqueId, String securityLevel, String vendor, String version, String description) {
            super(securityLevel, vendor, version, description);
            this.deviceUniqueId = deviceUniqueId;
        }
    }

    static final class WidevineFingerprint {

        final String fingerprint;
        final String widevineIdSha256;
        final String widevineIdBase64;
        final String securityLevel;
        final String vendor;
        final String version;
        final String description;

        WidevineFingerprint(
            String fingerprint,
            String widevineIdSha256,
            String widevineIdBase64,
            String securityLevel,
            String vendor,
            String version,
            String description
        ) {
            this.fingerprint = fingerprint;
            this.widevineIdSha256 = widevineIdSha256;
            this.widevineIdBase64 = widevineIdBase64;
            this.securityLevel = securityLevel;
            this.vendor = vendor;
            this.version = version;
            this.description = description;
        }
    }

    static final class AppAttestException extends Exception {

        AppAttestException(String message) {
            super(message);
        }

        AppAttestException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
