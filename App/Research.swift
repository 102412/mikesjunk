import SwiftUI

@MainActor @Observable final class ResearchViewModel {
    var question = ""
    var external = false
    var answer: ResearchAnswer?
    var error: String?
    var loading = false
    private var task: Task<Void, Never>?
    func ask(store: AppStore, context: ResearchContext?) {
        task?.cancel(); loading = true; error = nil; answer = nil
        task = Task {
            defer { loading = false }
            do {
                guard !store.demo else { throw AppError.message("Research is unavailable in the fictional demo. Connect Supabase and deploy the research function with a Groq model to ask real questions. No answer has been generated.") }
                answer = try await store.api.research(question: question, postID: context?.post?.id, mediaID: context?.media?.id, external: external)
                try Task.checkCancellation()
            } catch is CancellationError { answer = nil }
            catch { self.error = error.localizedDescription }
        }
    }
    func cancel() { task?.cancel() }
}
struct ResearchView: View {
    @Environment(AppStore.self) private var store
    @State private var model = ResearchViewModel()
    let context: ResearchContext?
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Image(systemName: "sparkle.magnifyingglass").font(.largeTitle).foregroundStyle(Color.accent).padding(.top)
                Eyebrow(text: "A little more understanding")
                Text(context?.media != nil ? "Look closer." : "Follow your curiosity.").font(.system(.largeTitle, design: .serif))
                Text("Explore how something was made, find related tools, or go deeper on an idea.").foregroundStyle(.secondary)
                if let post = context?.post { Label("Context: " + post.title, systemImage: "paperclip").font(.subheadline).padding().frame(maxWidth: .infinity, alignment: .leading).background(.quaternary, in: RoundedRectangle(cornerRadius: 16)) }
                if let media = context?.media { MediaImage(source: media.url).clipShape(RoundedRectangle(cornerRadius: 16)) }
                TextField(context?.media != nil ? "What would you like to know about this image?" : "What are you curious about?", text: $model.question, axis: .vertical).lineLimit(3...8).padding().background(.quaternary, in: RoundedRectangle(cornerRadius: 16))
                Toggle("Include public web research", isOn: $model.external)
                Text("Web search sends your question to the configured search provider. Community content is creator-provided, not independently verified.").font(.caption).foregroundStyle(.secondary)
                Button { model.ask(store: store, context: context) } label: { HStack { if model.loading { ProgressView() }; Label(model.loading ? "Researching…" : "Ask AI", systemImage: "sparkles").frame(maxWidth: .infinity) } }.buttonStyle(.borderedProminent).disabled(model.loading || model.question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.question.count > 2000)
                if let error = model.error { ContentUnavailableView("Research unavailable", systemImage: "info.circle", description: Text(error)) }
                if let answer = model.answer {
                    Divider()
                    Eyebrow(text: answer.cached == true ? "AI synthesis · Cached" : "AI synthesis · May be uncertain")
                    Text(answer.answer).textSelection(.enabled)
                    Text("External research: " + answer.externalStatus).font(.caption).foregroundStyle(.secondary)
                    ForEach(answer.sources) { source in
                        VStack(alignment: .leading, spacing: 6) {
                            if let url = Links.web(source.url) { Link("[\(source.id)] \(source.title)", destination: url) }
                            else if source.recordID != nil { NavigationLink { SourceDestination(source: source) } label: { Text("[\(source.id)] \(source.title)").font(.subheadline.weight(.medium)) } }
                            else { Text("[\(source.id)] \(source.title)").font(.subheadline.weight(.medium)) }
                            Text(source.provenance).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Text("Sources show what was retrieved, not an independent endorsement. Verify claims before acting.").font(.caption).foregroundStyle(.secondary)
                }
            }.padding(24)
        }.navigationTitle("AI Research").navigationBarTitleDisplayMode(.inline).onDisappear { model.cancel() }
    }
}

struct SourceDestination: View {
    @Environment(AppStore.self) private var store
    let source: Citation
    @State private var loading = true
    @State private var failure: String?
    @State private var postID: UUID?
    var body: some View {
        Group {
            if loading { ProgressView("Opening source…") }
            else if let failure { ContentUnavailableView("Source unavailable", systemImage: "doc.questionmark", description: Text(failure)) }
            else if let postID { PostDetail(postID: postID) }
            else if source.kind == "profile", let id = source.recordID { ProfileView(profileID: id) }
            else if let project = store.projects.first(where: { $0.id == source.recordID }), source.kind == "project" { ProjectDetail(project: project) }
            else if let resource = store.resources.first(where: { $0.id == source.recordID }), source.kind == "resource" { ResourceDetail(resource: resource) }
            else { ContentUnavailableView("Source unavailable", systemImage: "doc.questionmark") }
        }.task {
            guard let id = source.recordID else { loading = false; return }
            defer { loading = false }
            do {
                switch source.kind {
                case "post", "comment":
                    var target = id
                    if source.kind == "comment" {
                        let comments: [Comment] = try await store.api.get("comments", query: "id=eq.\(id)")
                        guard let first = comments.first else { throw AppError.message("This comment is no longer available.") }; target = first.postID
                    }
                    let posts: [Post] = try await store.api.get("posts", query: "select=*,post_media(*),likes(user_id),saves(user_id),comments(*)&id=eq.\(target)")
                    guard let post = posts.first else { throw AppError.message("This post is no longer available.") }
                    store.posts.removeAll { $0.id == post.id }; store.posts.append(post); postID = post.id
                    let authors: [Profile] = try await store.api.get("profiles", query: "id=eq.\(post.authorID)")
                    for author in authors { store.profiles.removeAll { $0.id == author.id }; store.profiles.append(author) }
                case "profile":
                    let profiles: [Profile] = try await store.api.get("profiles", query: "id=eq.\(id)")
                    store.profiles.removeAll { $0.id == id }; store.profiles += profiles
                case "project":
                    let projects: [Project] = try await store.api.get("projects", query: "id=eq.\(id)")
                    store.projects.removeAll { $0.id == id }; store.projects += projects
                case "resource":
                    let resources: [Resource] = try await store.api.get("resources", query: "id=eq.\(id)")
                    store.resources.removeAll { $0.id == id }; store.resources += resources
                default: break
                }
            } catch { failure = error.localizedDescription }
        }
    }
}
