import Foundation
import Security

struct Configuration: Sendable {
    let url: URL?
    let anonKey: String
    var configured: Bool { url != nil && !anonKey.isEmpty && !anonKey.contains("$(") }
    static var current: Self {
        let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String ?? ""
        return .init(url: Links.web(raw), anonKey: Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String ?? "")
    }
}
struct Session: Codable, Sendable {
    var accessToken: String
    var refreshToken: String
    var expiresIn: Int?
    var user: AuthUser
}
struct AuthUser: Codable, Sendable { var id: UUID; var email: String? }
@MainActor enum SessionVault {
    private static let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "ai.xpres.session", kSecAttrAccount as String: "supabase"]
    static func load() -> Session? {
        var q = query; q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
        return try? Codec.decoder.decode(Session.self, from: data)
    }
    static func save(_ session: Session?) throws {
        SecItemDelete(query as CFDictionary)
        guard let session else { return }
        var q = query; q[kSecValueData as String] = try Codec.encoder.encode(session)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw AppError.message("Could not securely save your session.") }
    }
}
@MainActor final class API {
    let configuration: Configuration
    private var session: Session?
    private var refreshTask: Task<Session, Error>?
    init(configuration: Configuration) { self.configuration = configuration; session = SessionVault.load() }
    func currentSession() -> Session? { session }
    private func request(_ path: String, method: String = "GET", body: Data? = nil, token: String? = nil, contentType: String = "application/json", prefer: String? = nil) async throws -> Data {
        guard configuration.configured, let base = configuration.url, let url = URL(string: base.absoluteString + path) else { throw AppError.message("Supabase is not configured. Use demo mode or add the public build settings.") }
        var r = URLRequest(url: url); r.httpMethod = method; r.httpBody = body; r.timeoutInterval = 45
        r.setValue(configuration.anonKey, forHTTPHeaderField: "apikey")
        r.setValue("Bearer \(token ?? configuration.anonKey)", forHTTPHeaderField: "Authorization")
        r.setValue(contentType, forHTTPHeaderField: "Content-Type")
        if let prefer { r.setValue(prefer, forHTTPHeaderField: "Prefer") }
        let (data, response) = try await URLSession.shared.data(for: r)
        guard let http = response as? HTTPURLResponse else { throw AppError.message("No response from the server.") }
        guard (200..<300).contains(http.statusCode) else {
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let message = object?["msg"] as? String ?? object?["message"] as? String ?? object?["error_description"] as? String ?? object?["error"] as? String
            throw AppError.message(message ?? "Server request failed (\(http.statusCode)). Please try again.")
        }
        return data
    }
    private func token() async throws -> String {
        guard session != nil else { throw AppError.message("Sign in to continue.") }
        if let session {
            let parts = session.accessToken.split(separator: ".")
            if parts.count == 3 {
                var encoded = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
                encoded += String(repeating: "=", count: (4 - encoded.count % 4) % 4)
                if let bytes = Data(base64Encoded: encoded), let claims = (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any], let expiry = claims["exp"] as? Double, expiry > Date.now.timeIntervalSince1970 + 60 { return session.accessToken }
            }
        }
        // Decode expiry only for scheduling. Server validates JWT authenticity on every request.
        if let refreshTask { return try await refreshTask.value.accessToken }
        let refresh = session!.refreshToken
        let task = Task { () async throws -> Session in
            let data = try await request("/auth/v1/token?grant_type=refresh_token", method: "POST", body: JSONSerialization.data(withJSONObject: ["refresh_token": refresh]))
            return try Codec.decoder.decode(Session.self, from: data)
        }
        refreshTask = task
        do {
            let updated = try await task.value; session = updated; refreshTask = nil; try SessionVault.save(updated); return updated.accessToken
        } catch { refreshTask = nil; throw error }
    }
    func auth(email: String, password: String, signup: Bool) async throws -> Session? {
        let path = signup ? "/auth/v1/signup?redirect_to=xpres%3A%2F%2Fauth%2Fcallback" : "/auth/v1/token?grant_type=password"
        let data = try await request(path, method: "POST", body: JSONSerialization.data(withJSONObject: ["email": email, "password": password]))
        if let result = try? Codec.decoder.decode(Session.self, from: data) { session = result; try SessionVault.save(result); return result }
        if signup { return nil }
        throw AppError.message("Could not read the authentication response.")
    }
    func recover(email: String) async throws {
        _ = try await request("/auth/v1/recover?redirect_to=xpres%3A%2F%2Fauth%2Fcallback", method: "POST", body: JSONSerialization.data(withJSONObject: ["email": email, "redirect_to": "xpres://auth/callback"]))
    }
    func receiveCallback(_ url: URL) async throws -> Bool {
        guard url.scheme == "xpres", url.host == "auth", url.path == "/callback", let fragment = url.fragment else { throw AppError.message("Invalid authentication callback.") }
        let parts = URLComponents(string: "https://callback.invalid/?" + fragment)?.queryItems ?? []
        guard let access = parts.first(where: { $0.name == "access_token" })?.value, let refresh = parts.first(where: { $0.name == "refresh_token" })?.value else { throw AppError.message("This link is missing a session. Request a new email.") }
        let userData = try await request("/auth/v1/user", token: access)
        let user = try Codec.decoder.decode(AuthUser.self, from: userData)
        let updated = Session(accessToken: access, refreshToken: refresh, user: user)
        session = updated; try SessionVault.save(updated)
        return parts.first(where: { $0.name == "type" })?.value == "recovery"
    }
    func updatePassword(_ password: String) async throws {
        _ = try await request("/auth/v1/user", method: "PUT", body: JSONSerialization.data(withJSONObject: ["password": password]), token: token())
    }
    func signout() async throws {
        _ = try await request("/auth/v1/logout", method: "POST", token: token())
        session = nil; try SessionVault.save(nil)
    }
    func deleteAccount() async throws {
        _ = try await request("/functions/v1/account-delete", method: "POST", body: Data("{}".utf8), token: token())
        session = nil; try SessionVault.save(nil)
    }
    func get<T: Decodable>(_ table: String, query: String = "", as: T.Type = T.self) async throws -> T {
        let data = try await request("/rest/v1/\(table)?\(query)", token: token())
        return try Codec.decoder.decode(T.self, from: data)
    }
    func mutate(_ table: String, method: String = "POST", query: String = "", object: [String: Any]? = nil, upsert: Bool = false) async throws {
        _ = try await request("/rest/v1/\(table)?\(query)", method: method, body: try object.map { try JSONSerialization.data(withJSONObject: $0) }, token: token(), prefer: upsert ? "resolution=merge-duplicates,return=minimal" : "return=minimal")
    }
    func rpc(_ name: String, object: [String: Any]) async throws {
        _ = try await request("/rest/v1/rpc/\(name)", method: "POST", body: JSONSerialization.data(withJSONObject: object), token: token())
    }
    func upload(_ bytes: Data, userID: UUID) async throws -> String {
        guard bytes.count <= 8 * 1024 * 1024 else { throw AppError.message("Each image must be under 8 MB.") }
        let response = try await request("/functions/v1/media-upload", method: "POST", body: bytes, token: token(), contentType: "image/jpeg")
        struct Uploaded: Decodable { let url: String }
        return try Codec.decoder.decode(Uploaded.self, from: response).url
    }

    func removeUpload(_ url: String) async throws {
        guard let range = url.range(of: "/storage/v1/object/public/post-media/") else { return }
        let path = String(url[range.upperBound...])
        _ = try await request("/storage/v1/object/post-media/\(path)", method: "DELETE", token: token())
    }
    func research(question: String, postID: UUID?, mediaID: UUID?, external: Bool) async throws -> ResearchAnswer {
        var object: [String: Any] = ["question": question, "external": external]
        if let postID { object["post_id"] = postID.uuidString }
        if let mediaID { object["media_id"] = mediaID.uuidString }
        let data = try await request("/functions/v1/research", method: "POST", body: JSONSerialization.data(withJSONObject: object), token: token())
        return try Codec.decoder.decode(ResearchAnswer.self, from: data)
    }
}
