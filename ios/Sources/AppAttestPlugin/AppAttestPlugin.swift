import Foundation
import Capacitor
import DeviceCheck

@objc(AppAttestPlugin)
public class AppAttestPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppAttestPlugin"
    public let jsName = "AppAttest"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "attestKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateAssertion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "storeKeyId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStoredKeyId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearStoredKeyId", returnType: CAPPluginReturnPromise)
    ]

    private let implementation = AppAttest()

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve(["isSupported": implementation.isSupported()])
    }

    @objc func generateKey(_ call: CAPPluginCall) {
        do {
            try validateSupport()

            DCAppAttestService.shared.generateKey { [weak self] keyId, error in
                guard let self else { return }

                if let error {
                    self.reject(call, message: "Error generating key: \(error.localizedDescription)", error: error)
                    return
                }

                guard let keyId else {
                    self.reject(call, message: AppAttestError.missingGeneratedValue.localizedDescription)
                    return
                }

                self.resolve(call, payload: ["keyId": keyId])
            }
        } catch {
            reject(call, message: error.localizedDescription, error: error)
        }
    }

    @objc func attestKey(_ call: CAPPluginCall) {
        do {
            try validateSupport()
            let keyId = try keyId(from: call)
            let challenge = try challenge(from: call)
            let clientDataHash = try implementation.createClientDataHash(from: challenge)

            DCAppAttestService.shared.attestKey(keyId, clientDataHash: clientDataHash) { [weak self] attestation, error in
                guard let self else { return }

                if let error {
                    self.reject(call, message: "Error attesting key: \(error.localizedDescription)", error: error)
                    return
                }

                guard let attestation else {
                    self.reject(call, message: AppAttestError.missingGeneratedValue.localizedDescription)
                    return
                }

                self.resolve(call, payload: [
                    "attestation": attestation.base64EncodedString(),
                    "keyId": keyId,
                    "challenge": challenge
                ])
            }
        } catch {
            reject(call, message: error.localizedDescription, error: error)
        }
    }

    @objc func generateAssertion(_ call: CAPPluginCall) {
        do {
            try validateSupport()
            let keyId = try keyId(from: call)
            let payload = try payload(from: call)
            let clientDataHash = try implementation.createClientDataHash(from: payload)

            DCAppAttestService.shared.generateAssertion(keyId, clientDataHash: clientDataHash) { [weak self] assertion, error in
                guard let self else { return }

                if let error {
                    self.reject(call, message: "Error generating assertion: \(error.localizedDescription)", error: error)
                    return
                }

                guard let assertion else {
                    self.reject(call, message: AppAttestError.missingGeneratedValue.localizedDescription)
                    return
                }

                self.resolve(call, payload: [
                    "assertion": assertion.base64EncodedString(),
                    "keyId": keyId
                ])
            }
        } catch {
            reject(call, message: error.localizedDescription, error: error)
        }
    }

    @objc func storeKeyId(_ call: CAPPluginCall) {
        do {
            let keyId = try keyId(from: call)
            implementation.storeKeyId(keyId)
            call.resolve(["success": true])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func getStoredKeyId(_ call: CAPPluginCall) {
        let keyId = implementation.getStoredKeyId()
        call.resolve([
            "keyId": keyId as Any,
            "hasStoredKey": keyId != nil
        ])
    }

    @objc func clearStoredKeyId(_ call: CAPPluginCall) {
        implementation.clearStoredKeyId()
        call.resolve(["success": true])
    }

    private func validateSupport() throws {
        guard implementation.isSupported() else {
            throw AppAttestError.notSupported
        }
    }

    private func keyId(from call: CAPPluginCall) throws -> String {
        guard let keyId = call.getString("keyId"), !keyId.isEmpty else {
            throw AppAttestError.missingKeyId
        }
        return keyId
    }

    private func challenge(from call: CAPPluginCall) throws -> String {
        guard let challenge = call.getString("challenge"), !challenge.isEmpty else {
            throw AppAttestError.missingChallenge
        }
        return challenge
    }

    private func payload(from call: CAPPluginCall) throws -> String {
        guard let payload = call.getString("payload"), !payload.isEmpty else {
            throw AppAttestError.missingPayload
        }
        return payload
    }

    private func resolve(_ call: CAPPluginCall, payload: [String: Any]) {
        DispatchQueue.main.async {
            call.resolve(payload)
        }
    }

    private func reject(_ call: CAPPluginCall, message: String, error: Error? = nil) {
        DispatchQueue.main.async {
            call.reject(message, nil, error)
        }
    }
}
