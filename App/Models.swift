import Foundation

enum Brand {
    static let name = "Xpres.ai"
    static let tagline = "Made with intelligence. Shared by humans."
}
enum PostKind: String, Codable, Sendable, CaseIterable, Identifiable {
    case application, progress, resource, discussion, session
    var id: String { rawValue }
    var title: String {
        switch self {
        case .application: "App showcase"
        case .progress: "Build progress"
        case .resource: "Skill & MCP"
        case .discussion: "Discussion"
        case .session: "Build session"
        }
    }
    var symbol: String {
        switch self {
        case .application: "square.stack.3d.up"
        case .progress: "hammer"
        case .resource: "puzzlepiece.extension"
        case .discussion: "bubble.left.and.bubble.right"
        case .session: "timer"
        }
    }
}
enum IdentityTier: String, Codable, Sendable, CaseIterable { case lite, pro, superuser }
struct Profile: Codable, Sendable, Identifiable, Hashable {
    var id: UUID
    var username: String
    var displayName: String
    var bio: String
    var tier: IdentityTier
    var tools: [String]
    var interests: [String]
    var avatarURL: String?
    var createdAt: Date
    static var guest: Profile { Profile(id: UUID(), username: "you", displayName: "Your next chapter", bio: "Building something worth sharing.", tier: .pro, tools: ["Codex", "Claude"], interests: ["SwiftUI"], createdAt: .now) }
}
struct Project: Codable, Sendable, Identifiable, Hashable {
    var id: UUID
    var creatorID: UUID
    var name: String
    var description: String
    var coverURL: String?
    var screenshots: [String]
    var videoURL: String?
    var status: String
    var stack: [String]
    var tools: [String]
    var websiteURL: String?
    var repositoryURL: String?
}
struct Resource: Codable, Sendable, Identifiable, Hashable {
    var id: UUID
    var creatorID: UUID
    var title: String
    var description: String
    var category: String
    var tools: [String]
    var repositoryURL: String
    var documentationURL: String?
    var version: String
    var screenshots: [String]
}
struct Media: Codable, Sendable, Identifiable, Hashable {
    var id: UUID
    var postID: UUID
    var url: String
    var kind: String
    var position: Int
}
struct Post: Codable, Sendable, Identifiable, Hashable {
    var id: UUID
    var authorID: UUID
    var projectID: UUID?
    var resourceID: UUID?
    var kind: PostKind
    var title: String
    var body: String
    var tools: [String]
    var stack: [String]
    var status: String
    var websiteURL: String?
    var repositoryURL: String?
    var durationMinutes: Int?
    var features: [String]
    var commitURLs: [String]
    var createdAt: Date
    var postMedia: [Media] = []
    var likes: [Actor] = []
    var saves: [Actor] = []
    var comments: [Comment] = []
    var score: Double { Double(likes.count * 3 + comments.count * 2) + max(0, 72 - Date.now.timeIntervalSince(createdAt) / 3600) }
}
struct Actor: Codable, Sendable, Hashable { var userID: UUID }
struct Comment: Codable, Sendable, Identifiable, Hashable {
    var id: UUID
    var postID: UUID
    var authorID: UUID
    var body: String
    var createdAt: Date
}
struct Follow: Codable, Sendable { var followerID: UUID; var followingID: UUID }
struct Review: Codable, Sendable, Identifiable { var id: UUID; var resourceID: UUID; var authorID: UUID; var rating: Int; var body: String }
struct Citation: Codable, Sendable, Identifiable {
    var id: String
    var title: String
    var url: String?
    var provenance: String
    var recordID: UUID?
    var kind: String?
}
struct ResearchAnswer: Codable, Sendable {
    var answer: String
    var sources: [Citation]
    var externalStatus: String
    var cached: Bool?
}
struct DraftPost: Sendable {
    var kind: PostKind = .application
    var title = ""
    var body = ""
    var tools = "Codex, Claude"
    var stack = "SwiftUI"
    var status = "In development"
    var website = ""
    var repository = ""
    var duration = "60"
    var features = ""
    var commits = ""
    var projectID: UUID?
    var resourceCategory = "Claude Skills"
    var version = "1.0"
    var documentation = ""
    var createProject = false
    func validate(mediaCount: Int) throws {
        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw AppError.message("Add a title and a description.") }
        guard title.count <= 120, body.count <= 5000 else { throw AppError.message("Keep the title under 120 characters and the description under 5,000.") }
        if kind == .application && mediaCount == 0 { throw AppError.message("App showcases need at least one screenshot or video.") }
        if createProject && mediaCount == 0 { throw AppError.message("A project needs a cover image.") }
        for value in [website, repository, documentation] where !value.isEmpty {
            guard Links.web(value) != nil else { throw AppError.message("Links must be valid HTTPS URLs.") }
        }
        if kind == .resource && repository.isEmpty { throw AppError.message("Resources need a repository URL.") }
        if kind == .session && !(1...1440).contains(Int(duration) ?? 0) { throw AppError.message("Session duration must be 1–1,440 minutes.") }
        for value in list(commits) { guard Links.web(value) != nil else { throw AppError.message("Commit links must be HTTPS URLs.") } }
    }
}
func list(_ text: String) -> [String] { text.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty } }
enum Links {
    static func web(_ raw: String?) -> URL? {
        guard let raw, let url = URL(string: raw), url.scheme?.lowercased() == "https", let host = url.host, !host.isEmpty, url.user == nil, url.password == nil else { return nil }
        return url
    }
}
enum AppError: LocalizedError {
    case message(String)
    var errorDescription: String? { switch self { case .message(let text): text } }
}
enum Codec {
    static var decoder: JSONDecoder {
        let d = JSONDecoder(); d.keyDecodingStrategy = .custom { path in
            let raw = path.last!.stringValue
            let parts = raw.split(separator: "_")
            var camel = parts.first.map(String.init) ?? raw
            for part in parts.dropFirst() { camel += part.prefix(1).uppercased() + part.dropFirst() }
            if camel.hasSuffix("Id") { camel = String(camel.dropLast(2)) + "ID" }
            if camel.hasSuffix("Url") { camel = String(camel.dropLast(3)) + "URL" }
            if camel.hasSuffix("Urls") { camel = String(camel.dropLast(4)) + "URLs" }
            return WireKey(stringValue: camel)!
        }
        d.dateDecodingStrategy = .custom { decoder in
            let s = try decoder.singleValueContainer().decode(String.self)
            let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = f.date(from: s) ?? ISO8601DateFormatter().date(from: s) { return date }
            throw AppError.message("Invalid server date")
        }
        return d
    }
    static var encoder: JSONEncoder {
        let e = JSONEncoder(); e.keyEncodingStrategy = .convertToSnakeCase; e.dateEncodingStrategy = .iso8601; return e
    }
}

struct WireKey: CodingKey { var stringValue: String; var intValue: Int? { nil }; init?(stringValue: String) { self.stringValue = stringValue }; init?(intValue: Int) { return nil } }
