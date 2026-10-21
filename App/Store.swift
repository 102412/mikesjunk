import SwiftUI
import PhotosUI

@MainActor @Observable final class AppStore {
    let api = API(configuration: .current)
    var demo = false
    var signedIn = false
    var me = Profile.guest
    var profiles: [Profile] = []
    var projects: [Project] = []
    var resources: [Resource] = []
    var posts: [Post] = []
    var follows: Set<UUID> = []
    var blocked: Set<UUID> = []
    var resourceSaves: Set<UUID> = []
    var reviews: [Review] = []
    var busy = false
    var error: String?
    var notice: String?
    var canLoadMore = true
    var loadingPage = false
    var pending: Set<String> = []
    private var offset = 0
    var recovery = false
    var selectedTab = 0
    var researchContext: ResearchContext?
    var visiblePosts: [Post] { posts.filter { !blocked.contains($0.authorID) } }
    func profile(_ id: UUID) -> Profile? { profiles.first { $0.id == id } }
    func start() async {
        guard await api.currentSession() != nil else { return }
        signedIn = true
        await load()
    }
    func startDemo() {
        demo = true; signedIn = true; me = Demo.me; profiles = Demo.profiles; projects = Demo.projects; resources = Demo.resources; posts = Demo.posts
        follows = [Demo.profiles[1].id]; blocked = []; canLoadMore = false; offset = 0; error = nil
    }
    func authenticate(email: String, password: String, signup: Bool) async {
        busy = true; defer { busy = false }
        do {
            if let session = try await api.auth(email: email, password: password, signup: signup) {
                me.id = session.user.id; signedIn = true; demo = false; await load()
            } else { notice = "Check your email to confirm your account, then sign in." }
        } catch { self.error = error.localizedDescription }
    }
    func load() async {
        guard !demo else { return }
        busy = true; defer { busy = false }
        do {
            guard let session = await api.currentSession() else { return }
            let mine: [Profile] = try await api.get("profiles", query: "id=eq.\(session.user.id)")
            if let first = mine.first { me = first } else {
                var initial = Profile.guest; initial.id = session.user.id; initial.username = "builder_" + session.user.id.uuidString.replacingOccurrences(of: "-", with: "").prefix(20).lowercased(); initial.displayName = "New builder"
                try await api.mutate("profiles", object: profileObject(initial)); me = initial
            }
            profiles = try await api.get("profiles", query: "order=created_at.desc&limit=100")
            if !profiles.contains(where: { $0.id == me.id }) { profiles.append(me) }
            projects = try await api.get("projects", query: "order=created_at.desc&limit=100")
            resources = try await api.get("resources", query: "order=created_at.desc&limit=100")
            let following: [Follow] = try await api.get("follows", query: "follower_id=eq.\(me.id)")
            follows = Set(following.map(\.followingID))
            struct Block: Decodable { var blockedID: UUID }
            let blocks: [Block] = try await api.get("blocks", query: "blocker_id=eq.\(me.id)")
            blocked = Set(blocks.map(\.blockedID))
            struct Saved: Decodable { var resourceID: UUID }
            let saved: [Saved] = try await api.get("resource_saves", query: "user_id=eq.\(me.id)")
            resourceSaves = Set(saved.map(\.resourceID))
            reviews = try await api.get("resource_reviews", query: "limit=200")
            await refresh()
        } catch { self.error = error.localizedDescription }
    }
    func refresh() async {
        if demo { return }
        guard !loadingPage else { return }
        offset = 0; canLoadMore = true
        await loadPage(reset: true)
    }
    func loadPage(reset: Bool = false) async {
        guard !demo, canLoadMore, !loadingPage else { return }
        loadingPage = true; defer { loadingPage = false }
        do {
            let page: [Post] = try await api.get("posts", query: "select=*,post_media(*),likes(user_id),saves(user_id),comments(*)&order=created_at.desc,id.desc&limit=20&offset=\(offset)")
            if reset { posts = page } else { let known = Set(posts.map(\.id)); posts += page.filter { !known.contains($0.id) } }
            offset += page.count; canLoadMore = page.count == 20
            // Fetch authors outside the initial directory page.
            let missing = Set(page.map(\.authorID)).subtracting(profiles.map(\.id))
            if !missing.isEmpty {
                let ids = missing.map(\.uuidString).joined(separator: ",")
                let authors: [Profile] = try await api.get("profiles", query: "id=in.(\(ids))")
                profiles += authors
            }
        } catch { self.error = error.localizedDescription }
    }
    func feed(following: Bool) -> [Post] {
        let filtered = visiblePosts.filter { !following || follows.contains($0.authorID) }
        return following ? filtered.sorted { $0.createdAt > $1.createdAt } : filtered.sorted {
            let a = $0.score + Double(Set($0.tools + $0.stack).intersection(me.interests + me.tools).count * 8)
            let b = $1.score + Double(Set($1.tools + $1.stack).intersection(me.interests + me.tools).count * 8)
            return a == b ? $0.id.uuidString < $1.id.uuidString : a > b
        }
    }
    func toggle(_ postID: UUID, save: Bool) async {
        let key = "\(postID)-\(save)"; guard !pending.contains(key), let i = posts.firstIndex(where: { $0.id == postID }) else { return }
        pending.insert(key); defer { pending.remove(key) }
        let old = save ? posts[i].saves : posts[i].likes
        let active = old.contains { $0.userID == me.id }
        let next = active ? old.filter { $0.userID != me.id } : old + [Actor(userID: me.id)]
        if save { posts[i].saves = next } else { posts[i].likes = next }
        do {
            if !demo { try await api.mutate(save ? "saves" : "likes", method: active ? "DELETE" : "POST", query: active ? "post_id=eq.\(postID)&user_id=eq.\(me.id)" : "", object: active ? nil : ["post_id": postID.uuidString, "user_id": me.id.uuidString]) }
        } catch {
            if let j = posts.firstIndex(where: { $0.id == postID }) { if save { posts[j].saves = old } else { posts[j].likes = old } }
            self.error = error.localizedDescription
        }
    }
    func follow(_ id: UUID) async {
        guard id != me.id, !pending.contains(id.uuidString) else { return }
        pending.insert(id.uuidString); defer { pending.remove(id.uuidString) }
        let active = follows.contains(id)
        if active { follows.remove(id) } else { follows.insert(id) }
        do {
            if !demo { try await api.mutate("follows", method: active ? "DELETE" : "POST", query: active ? "follower_id=eq.\(me.id)&following_id=eq.\(id)" : "", object: active ? nil : ["follower_id": me.id.uuidString, "following_id": id.uuidString]) }
        } catch { if active { follows.insert(id) } else { follows.remove(id) }; self.error = error.localizedDescription }
    }
    func comment(postID: UUID, text: String) async -> Bool {
        let body = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty, body.count <= 2000 else { error = "Comments must contain 1–2,000 characters."; return false }
        let comment = Comment(id: UUID(), postID: postID, authorID: me.id, body: body, createdAt: .now)
        do {
            if !demo { try await api.mutate("comments", object: ["id": comment.id.uuidString, "post_id": postID.uuidString, "author_id": me.id.uuidString, "body": body]) }
            if let i = posts.firstIndex(where: { $0.id == postID }) { posts[i].comments.append(comment) }; return true
        } catch { self.error = error.localizedDescription; return false }
    }
    func deleteComment(_ comment: Comment) async {
        do {
            if !demo { try await api.mutate("comments", method: "DELETE", query: "id=eq.\(comment.id)") }
            if let i = posts.firstIndex(where: { $0.id == comment.postID }) { posts[i].comments.removeAll { $0.id == comment.id } }
        } catch { self.error = error.localizedDescription }
    }
    func report(postID: UUID? = nil, profileID: UUID? = nil, reason: String) async {
        do {
            if !demo {
                var object: [String: Any] = ["reporter_id": me.id.uuidString, "reason": reason]
                if let postID { object["post_id"] = postID.uuidString }; if let profileID { object["profile_id"] = profileID.uuidString }
                try await api.mutate("reports", object: object)
            }
            notice = demo ? "Demo report recorded locally. Nothing was sent." : "Report received. Thank you for helping keep the community safe."
        } catch { self.error = error.localizedDescription }
    }
    func block(_ id: UUID) async {
        do {
            if !demo { try await api.mutate("blocks", object: ["blocker_id": me.id.uuidString, "blocked_id": id.uuidString], upsert: true) }
            blocked.insert(id); follows.remove(id)
        } catch { self.error = error.localizedDescription }
    }
    func unblock(_ id: UUID) async {
        do {
            if !demo { try await api.mutate("blocks", method: "DELETE", query: "blocker_id=eq.\(me.id)&blocked_id=eq.\(id)") }
            blocked.remove(id); if !demo { await load() }
        } catch { self.error = error.localizedDescription }
    }
    func deletePost(_ id: UUID) async {
        do {
            if !demo { try await api.mutate("posts", method: "DELETE", query: "id=eq.\(id)") }
            posts.removeAll { $0.id == id }
        } catch { self.error = error.localizedDescription }
    }
    func profileObject(_ p: Profile) -> [String: Any] {
        ["id": p.id.uuidString, "username": p.username, "display_name": p.displayName, "bio": p.bio, "tier": p.tier.rawValue, "tools": p.tools, "interests": p.interests]
    }
    func saveProfile(_ p: Profile) async -> Bool {
        do {
            if !demo { try await api.mutate("profiles", method: "PATCH", query: "id=eq.\(me.id)", object: profileObject(p)) }
            me = p; profiles.removeAll { $0.id == p.id }; profiles.append(p); return true
        } catch { self.error = error.localizedDescription; return false }
    }
    func saveResource(_ id: UUID) async {
        do {
            let active = resourceSaves.contains(id)
            if !demo { try await api.mutate("resource_saves", method: active ? "DELETE" : "POST", query: active ? "resource_id=eq.\(id)&user_id=eq.\(me.id)" : "", object: active ? nil : ["resource_id": id.uuidString, "user_id": me.id.uuidString]) }
            if active { resourceSaves.remove(id) } else { resourceSaves.insert(id) }
        } catch { self.error = error.localizedDescription }
    }
    func review(_ resource: UUID, rating: Int, body: String) async -> Bool {
        do {
            if !demo { try await api.mutate("resource_reviews", query: "on_conflict=resource_id,author_id", object: ["resource_id": resource.uuidString, "author_id": me.id.uuidString, "rating": rating, "body": body], upsert: true) }
            reviews.removeAll { $0.resourceID == resource && $0.authorID == me.id }
            reviews.append(Review(id: UUID(), resourceID: resource, authorID: me.id, rating: rating, body: body)); return true
        } catch { self.error = error.localizedDescription; return false }
    }
    func publish(_ draft: DraftPost, images: [Data]) async -> Bool {
        busy = true; defer { busy = false }
        var uploaded: [String] = []
        do {
            try draft.validate(mediaCount: images.count)
            let id = UUID(); let newProjectID = draft.createProject ? UUID() : draft.projectID
            let resourceID = draft.kind == .resource ? UUID() : nil
            if demo { uploaded = images.map { "data:image/jpeg;base64," + $0.base64EncodedString() } }
            else { for image in images { uploaded.append(try await api.upload(image, userID: me.id)) } }
            var object: [String: Any] = ["id": id.uuidString, "kind": draft.kind.rawValue, "title": draft.title, "body": draft.body, "tools": list(draft.tools), "stack": list(draft.stack), "status": draft.status, "features": list(draft.features), "commit_urls": list(draft.commits)]
            object["website_url"] = draft.website.isEmpty ? NSNull() : draft.website as Any
            object["repository_url"] = draft.repository.isEmpty ? NSNull() : draft.repository as Any
            object["duration_minutes"] = draft.kind == .session ? (Int(draft.duration) as Any) : NSNull()
            object["project_id"] = newProjectID?.uuidString as Any? ?? NSNull()
            object["resource_id"] = resourceID?.uuidString as Any? ?? NSNull()
            var projectObject: [String: Any]?; var resourceObject: [String: Any]?
            if draft.createProject, let projectID = newProjectID {
                projectObject = ["id": projectID.uuidString, "name": draft.title, "description": draft.body, "cover_url": uploaded.first ?? "", "screenshots": uploaded, "status": draft.status, "tools": list(draft.tools), "stack": list(draft.stack), "website_url": draft.website, "repository_url": draft.repository]
            }
            if let resourceID {
                resourceObject = ["id": resourceID.uuidString, "title": draft.title, "description": draft.body, "category": draft.resourceCategory, "tools": list(draft.tools), "repository_url": draft.repository, "documentation_url": draft.documentation, "version": draft.version, "screenshots": uploaded]
            }
            if !demo {
                try await api.rpc("publish_post", object: ["p_post": object, "p_media": uploaded, "p_project": projectObject as Any? ?? NSNull(), "p_resource": resourceObject as Any? ?? NSNull()])
                await load()
            } else {
                let post = Post(id: id, authorID: me.id, projectID: newProjectID, resourceID: resourceID, kind: draft.kind, title: draft.title, body: draft.body, tools: list(draft.tools), stack: list(draft.stack), status: draft.status, websiteURL: draft.website, repositoryURL: draft.repository, durationMinutes: Int(draft.duration), features: list(draft.features), commitURLs: list(draft.commits), createdAt: .now, postMedia: uploaded.enumerated().map { Media(id: UUID(), postID: id, url: $0.element, kind: "image", position: $0.offset) })
                posts.insert(post, at: 0)
                if draft.createProject, let projectID = newProjectID { projects.insert(Project(id: projectID, creatorID: me.id, name: draft.title, description: draft.body, coverURL: uploaded.first, screenshots: uploaded, status: draft.status, stack: list(draft.stack), tools: list(draft.tools), websiteURL: draft.website, repositoryURL: draft.repository), at: 0) }
                if let resourceID { resources.insert(Resource(id: resourceID, creatorID: me.id, title: draft.title, description: draft.body, category: draft.resourceCategory, tools: list(draft.tools), repositoryURL: draft.repository, documentationURL: draft.documentation, version: draft.version, screenshots: uploaded), at: 0) }
            }
            return true
        } catch {
            if !demo { for url in uploaded { try? await api.removeUpload(url) } }
            self.error = error.localizedDescription; return false
        }
    }
    func leave(delete: Bool = false) async {
        do {
            if !demo { if delete { try await api.deleteAccount() } else { try await api.signout() } }
            demo = false; signedIn = false; posts = []; projects = []; profiles = []; resources = []; follows = []; blocked = []; resourceSaves = []; reviews = []; me = .guest
        } catch { self.error = error.localizedDescription }
    }
}
struct ResearchContext: Identifiable {
    var id = UUID()
    var post: Post?
    var media: Media?
}
