import Foundation
import CryptoKit
import DeviceCheck

@objc public class AppAttest: NSObject {
    private let keyIdStorageKey = "CapgoAppAttestKeyId"

    @objc public func isSupported() -> Bool {
        return DCAppAttestService.shared.isSupported
    }

    public func createClientDataHash(from input: String) throws -> Data {
        guard let payloadData = input.data(using: .utf8) else {
            throw AppAttestError.invalidInput
        }
        return Data(SHA256.hash(data: payloadData))
    }

    @objc public func storeKeyId(_ keyId: String) {
        UserDefaults.standard.set(keyId, forKey: keyIdStorageKey)
    }

    @objc public func getStoredKeyId() -> String? {
        return UserDefaults.standard.string(forKey: keyIdStorageKey)
    }

    @objc public func clearStoredKeyId() {
        UserDefaults.standard.removeObject(forKey: keyIdStorageKey)
    }
}

public enum AppAttestError: LocalizedError {
    case notSupported
    case missingKeyId
    case missingChallenge
    case missingPayload
    case invalidInput
    case missingGeneratedValue

    public var errorDescription: String? {
        switch self {
        case .notSupported:
            return "App Attest is not supported on this device"
        case .missingKeyId:
            return "keyId is required"
        case .missingChallenge:
            return "challenge is required"
        case .missingPayload:
            return "payload is required"
        case .invalidInput:
            return "Invalid input format"
        case .missingGeneratedValue:
            return "Native API returned no value"
        }
    }
}
