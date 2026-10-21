import SwiftUI

struct FeedView: View {
    @Environment(AppStore.self) private var store
    @State private var following = false
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 26) {
                VStack(alignment: .leading, spacing: 12) {
                    Eyebrow(text: store.demo ? "Fictional demo · Build something good" : "The builder community")
                    Text("Ideas in motion.").font(.system(.largeTitle, design: .serif).weight(.medium))
                    HStack {
                        ForEach([false, true], id: \.self) { value in
                            Button { following = value } label: { Text(value ? "Following" : "For you").font(.subheadline.weight(.semibold)).padding(.horizontal, 18).padding(.vertical, 10).background(following == value ? Color.primary : Color.clear, in: Capsule()).foregroundStyle(following == value ? Color(uiColor: .systemBackground) : .primary) }.buttonStyle(.plain).accessibilityAddTraits(following == value ? .isSelected : [])
                        }
                        Spacer()
                    }
                }
                if store.busy && store.posts.isEmpty { Skeleton() }
                else if store.feed(following: following).isEmpty {
                    ContentUnavailableView(following ? "Find your people" : "A fresh start", systemImage: "person.2", description: Text(following ? "Follow builders in Explore to see their updates here." : "Share your first build or pull to refresh."))
                }
                ForEach(store.feed(following: following)) { post in PostCard(postID: post.id) }
                if store.canLoadMore {
                    Button { Task { await store.loadPage() } } label: { HStack { Spacer(); if store.loadingPage { ProgressView() } else { Text("More from the community") }; Spacer() } }.disabled(store.loadingPage).padding()
                }
                Text("Built by people. With a little help from AI.").font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity).padding(.bottom)
            }.padding(.horizontal, 18).padding(.top, 12)
        }.background(Color.canvas).navigationTitle(Brand.name).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { NavigationLink { SavedView() } label: { Image(systemName: "bookmark") }.accessibilityLabel("Saved posts") } }
            .refreshable { await store.refresh() }
    }
}
struct PostCard: View {
    @Environment(AppStore.self) private var store
    let postID: UUID
    @State private var image: Media?
    var body: some View {
        if let post = store.visiblePosts.first(where: { $0.id == postID }) {
            let author = store.profile(post.authorID)
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 10) {
                    NavigationLink { ProfileView(profileID: post.authorID) } label: {
                        HStack(spacing: 10) { Avatar(profile: author); VStack(alignment: .leading, spacing: 3) { Text(author?.displayName ?? "Builder").font(.subheadline.weight(.semibold)); Text(post.createdAt, style: .relative).font(.caption).foregroundStyle(.secondary) } }
                    }.buttonStyle(.plain)
                    Spacer()
                    Menu {
                        Button("Ask AI", systemImage: "sparkles") { store.researchContext = ResearchContext(post: post) }
                        if post.authorID == store.me.id { Button("Delete post", systemImage: "trash", role: .destructive) { Task { await store.deletePost(post.id) } } }
                        else {
                            Button(store.follows.contains(post.authorID) ? "Unfollow" : "Follow", systemImage: "person.badge.plus") { Task { await store.follow(post.authorID) } }
                            Button("Report spam", systemImage: "flag") { Task { await store.report(postID: post.id, reason: "Spam or misleading content") } }
                            Button("Report harmful content", systemImage: "flag") { Task { await store.report(postID: post.id, reason: "Harmful or abusive content") } }
                            Button("Block builder", systemImage: "hand.raised", role: .destructive) { Task { await store.block(post.authorID) } }
                        }
                    } label: { Image(systemName: "ellipsis").padding(8) }.accessibilityLabel("Post actions")
                }
                if !post.postMedia.isEmpty { MediaCarousel(media: post.postMedia) { image = $0 } }
                Label(post.kind.title, systemImage: post.kind.symbol).font(.caption.weight(.medium)).foregroundStyle(Color.accent)
                NavigationLink { PostDetail(postID: post.id) } label: { Text(post.title).font(.title3.weight(.semibold)).foregroundStyle(.primary).multilineTextAlignment(.leading) }.buttonStyle(.plain)
                Text(post.body).font(.subheadline).lineLimit(3).foregroundStyle(.secondary)
                if post.kind == .session { HStack { Label("\(post.durationMinutes ?? 0) min", systemImage: "timer"); Text("\(post.features.count) milestones") }.font(.subheadline.weight(.medium)) }
                Tags(values: post.tools)
                HStack(spacing: 22) {
                    Button { Task { await store.toggle(post.id, save: false) } } label: { Label("\(post.likes.count)", systemImage: post.likes.contains { $0.userID == store.me.id } ? "heart.fill" : "heart") }.accessibilityLabel("\(post.likes.contains { $0.userID == store.me.id } ? "Unlike" : "Like"), \(post.likes.count) likes").sensoryFeedback(.selection, trigger: post.likes.count)
                    NavigationLink { PostDetail(postID: post.id) } label: { Label("\(post.comments.count)", systemImage: "bubble") }.accessibilityLabel("Read comments")
                    ShareLink(item: post.title + "\n\n" + post.body + (Links.web(post.websiteURL).map { "\n" + $0.absoluteString } ?? "")) { Image(systemName: "square.and.arrow.up") }.accessibilityLabel("Share post")
                    Spacer()
                    Button { Task { await store.toggle(post.id, save: true) } } label: { Image(systemName: post.saves.contains { $0.userID == store.me.id } ? "bookmark.fill" : "bookmark") }.accessibilityLabel("Save post")
                }.font(.subheadline).buttonStyle(.plain).padding(.top, 4)
                Divider().padding(.top, 12)
            }.sheet(item: $image) { media in NavigationStack { ImageDetail(media: media, post: post) } }
        }
    }
}
struct ImageDetail: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let media: Media
    let post: Post
    var body: some View {
        VStack(spacing: 20) {
            Spacer(); MediaImage(source: media.url); Spacer()
            Button { dismiss(); store.researchContext = ResearchContext(post: post, media: media) } label: { Label("Ask AI about image", systemImage: "sparkles") }.buttonStyle(.borderedProminent).padding()
        }.navigationTitle("Screenshot").navigationBarTitleDisplayMode(.inline).toolbar { Button("Done") { dismiss() } }
    }
}
struct PostDetail: View {
    @Environment(AppStore.self) private var store
    let postID: UUID
    @State private var comment = ""
    @State private var sending = false
    var body: some View {
        if let post = store.visiblePosts.first(where: { $0.id == postID }) {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PostCard(postID: postID)
                    Text(post.body).textSelection(.enabled)
                    if let project = store.projects.first(where: { $0.id == post.projectID }) { NavigationLink { ProjectDetail(project: project) } label: { Label("Explore \(project.name)", systemImage: "square.stack.3d.up") } }
                    if let resource = store.resources.first(where: { $0.id == post.resourceID }) { NavigationLink { ResourceDetail(resource: resource) } label: { Label(resource.title, systemImage: "puzzlepiece.extension") } }
                    Tags(values: post.stack)
                    WebLink(title: "Visit project", raw: post.websiteURL)
                    WebLink(title: "Repository", raw: post.repositoryURL)
                    ForEach(post.features, id: \.self) { Label($0, systemImage: "checkmark.circle") }
                    ForEach(post.commitURLs, id: \.self) { WebLink(title: "View commit", raw: $0) }
                    Text("The conversation").font(.title3.weight(.semibold))
                    ForEach(post.comments.sorted { $0.createdAt < $1.createdAt }) { item in
                        HStack(alignment: .top) {
                            Avatar(profile: store.profile(item.authorID), size: 30)
                            VStack(alignment: .leading, spacing: 5) { Text(store.profile(item.authorID)?.displayName ?? "Builder").font(.caption.weight(.semibold)); Text(item.body).font(.subheadline) }
                            Spacer()
                            if item.authorID == store.me.id { Button(role: .destructive) { Task { await store.deleteComment(item) } } label: { Image(systemName: "trash") }.accessibilityLabel("Delete comment") }
                        }
                    }
                    if post.comments.isEmpty { Text("Be the first to join in.").foregroundStyle(.secondary) }
                }.padding(18)
            }.safeAreaInset(edge: .bottom) {
                HStack { TextField("Add a thoughtful comment…", text: $comment, axis: .vertical).lineLimit(1...4); Button { sending = true; Task { if await store.comment(postID: postID, text: comment) { comment = "" }; sending = false } } label: { Image(systemName: "arrow.up.circle.fill").font(.title2) }.disabled(sending || comment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityLabel("Send comment") }.padding().background(.bar)
            }.navigationTitle("Build story").navigationBarTitleDisplayMode(.inline)
        } else { ContentUnavailableView("Post unavailable", systemImage: "eye.slash", description: Text("It may have been removed, or this builder is blocked.")) }
    }
}
struct SavedView: View {
    @Environment(AppStore.self) private var store
    @State private var ids: [UUID] = []
    @State private var offset = 0
    @State private var more = true
    @State private var loading = false
    var saved: [Post] { store.visiblePosts.filter { $0.saves.contains { $0.userID == store.me.id } && (store.demo || ids.contains($0.id)) } }
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 24) {
                ForEach(saved) { PostCard(postID: $0.id) }
                if more && !store.demo { Button("Load more saves") { Task { await load() } }.disabled(loading) }
                if loading { ProgressView() }
                if saved.isEmpty && !loading { ContentUnavailableView("Your inspiration shelf", systemImage: "bookmark", description: Text("Save posts to revisit them here.")) }
            }.padding()
        }.navigationTitle("Saved").task { await load() }.refreshable { offset = 0; ids = []; more = true; await load() }
    }
    func load() async {
        guard !store.demo, !loading, more else { return }
        loading = true; defer { loading = false }
        do {
            let page: [Post] = try await store.api.get("posts", query: "select=*,post_media(*),likes(user_id),saves!inner(user_id),comments(*)&saves.user_id=eq.\(store.me.id)&order=created_at.desc,id.desc&limit=20&offset=\(offset)")
            ids += page.map(\.id); offset += page.count; more = page.count == 20
            for post in page { if let i = store.posts.firstIndex(where: { $0.id == post.id }) { store.posts[i] = post } else { store.posts.append(post) } }
        } catch { store.error = error.localizedDescription }
    }
}
