import XCTest
@testable import AppAttestPlugin

final class AppAttestPluginTests: XCTestCase {
    func testSupportCheckDoesNotCrash() {
        let implementation = AppAttest()
        _ = implementation.isSupported()
    }

    func testClientDataHashIsDeterministic() throws {
        let implementation = AppAttest()

        let firstHash = try implementation.createClientDataHash(from: "hello")
        let secondHash = try implementation.createClientDataHash(from: "hello")

        XCTAssertEqual(firstHash, secondHash)
        XCTAssertFalse(firstHash.isEmpty)
    }
}
