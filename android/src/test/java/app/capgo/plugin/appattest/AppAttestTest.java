package app.capgo.plugin.appattest;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import app.capgo.plugin.appattest.AppAttest.AppAttestException;
import app.capgo.plugin.appattest.AppAttest.WidevineCapabilities;
import app.capgo.plugin.appattest.AppAttest.WidevineData;
import app.capgo.plugin.appattest.AppAttest.WidevineFingerprint;
import app.capgo.plugin.appattest.AppAttest.WidevineMetadata;
import java.security.MessageDigest;
import java.util.Base64;
import org.junit.Test;

public class AppAttestTest {

    @Test
    public void createRequestHashUsesUrlSafeSha256WithoutPadding() throws Exception {
        AppAttest implementation = newTestAppAttest(new FakeWidevineReader(false, null, null));

        assertEquals("LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ", implementation.createRequestHash("hello"));
    }

    @Test
    public void capabilitiesReportUnsupportedWidevine() {
        AppAttest implementation = newTestAppAttest(new FakeWidevineReader(false, null, null));

        WidevineCapabilities capabilities = implementation.getWidevineCapabilities();

        assertFalse(capabilities.supported);
        assertFalse(capabilities.fingerprintAvailable);
        assertFalse(capabilities.securityLevelScanSupported);
    }

    @Test
    public void capabilitiesDoNotReadWidevineDeviceId() {
        FakeWidevineReader reader = new FakeWidevineReader(true, new byte[] { 1, 2, 3, 4 }, "L1");
        AppAttest implementation = newTestAppAttest(reader);

        WidevineCapabilities capabilities = implementation.getWidevineCapabilities();

        assertTrue(capabilities.supported);
        assertTrue(capabilities.fingerprintAvailable);
        assertTrue(capabilities.securityLevelScanSupported);
        assertEquals(1, reader.metadataReadCount);
        assertEquals(0, reader.dataReadCount);
    }

    @Test
    public void widevineFingerprintHashesDeviceIdAndOmitsRawIdByDefault() throws Exception {
        AppAttest implementation = newTestAppAttest(new FakeWidevineReader(true, new byte[] { 1, 2, 3, 4 }, "L3"));

        WidevineFingerprint fingerprint = implementation.getWidevineFingerprint("app.example", false, null);

        assertEquals(sha256Hex(new byte[] { 1, 2, 3, 4 }), fingerprint.widevineIdSha256);
        assertEquals(
            sha256Hex(new byte[] { 'a', 'p', 'p', '.', 'e', 'x', 'a', 'm', 'p', 'l', 'e', 0, 1, 2, 3, 4 }),
            fingerprint.fingerprint
        );
        assertNull(fingerprint.widevineIdBase64);
        assertEquals("L3", fingerprint.securityLevel);
    }

    @Test
    public void widevineFingerprintCanReturnRawBase64WhenExplicitlyEnabled() throws Exception {
        AppAttest implementation = newTestAppAttest(new FakeWidevineReader(true, new byte[] { 1, 2, 3, 4 }, "L1"));

        WidevineFingerprint fingerprint = implementation.getWidevineFingerprint("app.example", true, "custom-salt");

        assertEquals("AQIDBA==", fingerprint.widevineIdBase64);
    }

    @Test(expected = AppAttestException.class)
    public void widevineFingerprintRejectsMissingDeviceId() throws Exception {
        AppAttest implementation = newTestAppAttest(new FakeWidevineReader(true, null, "L1"));

        implementation.getWidevineFingerprint("app.example", false, null);
    }

    private static AppAttest newTestAppAttest(FakeWidevineReader reader) {
        return new AppAttest(reader, new JvmBase64Encoder());
    }

    private static String sha256Hex(byte[] value) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(value);
        StringBuilder result = new StringBuilder(hash.length * 2);
        for (byte b : hash) {
            result.append(String.format("%02x", b & 0xff));
        }
        return result.toString();
    }

    private static final class FakeWidevineReader implements AppAttest.WidevineDrmReader {

        private final boolean supported;
        private final byte[] deviceUniqueId;
        private final String securityLevel;
        private int metadataReadCount;
        private int dataReadCount;

        private FakeWidevineReader(boolean supported, byte[] deviceUniqueId, String securityLevel) {
            this.supported = supported;
            this.deviceUniqueId = deviceUniqueId;
            this.securityLevel = securityLevel;
        }

        @Override
        public boolean isWidevineSupported() {
            return supported;
        }

        @Override
        public WidevineMetadata readWidevineMetadata() {
            metadataReadCount++;
            return new WidevineMetadata(securityLevel, "vendor", "version", "description");
        }

        @Override
        public WidevineData readWidevineData() {
            dataReadCount++;
            return new WidevineData(deviceUniqueId, securityLevel, "vendor", "version", "description");
        }
    }

    private static final class JvmBase64Encoder implements AppAttest.Base64Encoder {

        @Override
        public String encode(byte[] value, boolean urlSafe, boolean padding) {
            if (urlSafe && padding) {
                return Base64.getUrlEncoder().encodeToString(value);
            }
            if (urlSafe) {
                return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
            }
            if (padding) {
                return Base64.getEncoder().encodeToString(value);
            }
            return Base64.getEncoder().withoutPadding().encodeToString(value);
        }
    }
}
