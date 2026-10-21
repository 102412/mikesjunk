import SwiftUI

struct ExploreView: View {
    @Environment(AppStore.self) private var store
    @State private var search = ""
    @State private var category = "Applications"
    @State private var filter = "All"
    private let categories = ["Applications", "Founders", "Claude Skills", "Codex Resources", "MCP Servers", "Agent Configurations", "Other Resources", "Trending Projects"]
    func matches(_ text: String) -> Bool { search.isEmpty || text.localizedCaseInsensitiveContains(search) }
    var filteredProjects: [Project] {
        store.projects.filter { p in !store.blocked.contains(p.creatorID) && matches(([p.name, p.description] + p.tools + p.stack).joined(separator: " ")) && (filter == "All" || filter == "Popular" || filter == "Recent" || (filter == "Has repository" && Links.web(p.repositoryURL) != nil) || p.tools.contains(filter) || p.stack.contains(filter) || p.status == filter || (filter == "iOS" && p.stack.contains("SwiftUI")) || (filter == "Web" && p.stack.contains("Next.js"))) }.sorted { a, b in
            if category == "Trending Projects" || filter == "Popular" { return store.visiblePosts.filter { $0.projectID == a.id }.reduce(0) { $0 + $1.likes.count } > store.visiblePosts.filter { $0.projectID == b.id }.reduce(0) { $0 + $1.likes.count } }
            return false
        }
    }
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                Eyebrow(text: "Find your next spark")
                Text("Built with curiosity.").font(.system(.largeTitle, design: .serif))
                ScrollView(.horizontal, showsIndicators: false) { HStack { ForEach(categories, id: \.self) { value in Button(value) { category = value }.buttonStyle(.bordered).tint(category == value ? .accent : .secondary) } } }
                Menu { Picker("Filter", selection: $filter) { ForEach(["All", "Recent", "Popular", "Has repository", "Looking for testers", "Claude", "Codex", "SwiftUI", "Next.js", "iOS", "Web"], id: \.self) { Text($0) } } } label: { Label(filter == "All" ? "Filter discoveries" : filter, systemImage: "line.3.horizontal.decrease") }.font(.subheadline)
                if category == "Founders" {
                    let found = store.profiles.filter { !store.blocked.contains($0.id) && matches($0.displayName + " " + $0.bio + " " + $0.tools.joined(separator: " ")) && (filter == "All" || filter == "Recent" || filter == "Popular" || $0.tools.contains(filter)) }.sorted { a, b in
                        filter == "Popular" ? store.visiblePosts.filter { $0.authorID == a.id }.reduce(0) { $0 + $1.likes.count } > store.visiblePosts.filter { $0.authorID == b.id }.reduce(0) { $0 + $1.likes.count } : false
                    }
                    ForEach(found) { p in
                        NavigationLink { ProfileView(profileID: p.id) } label: { HStack(spacing: 14) { Avatar(profile: p, size: 56); VStack(alignment: .leading, spacing: 5) { Text(p.displayName).font(.headline); Text(p.bio).font(.caption).foregroundStyle(.secondary).lineLimit(2) }; Spacer(); Image(systemName: "chevron.right") }.padding().background(.background, in: RoundedRectangle(cornerRadius: 18)) }.buttonStyle(.plain)
                    }
                    if found.isEmpty { empty }
                } else if category == "Applications" || category == "Trending Projects" {
                    ForEach(filteredProjects) { project in NavigationLink { ProjectDetail(project: project) } label: { ProjectTile(project: project) }.buttonStyle(.plain) }
                    if filteredProjects.isEmpty { empty }
                } else {
                    let found = store.resources.filter { r in !store.blocked.contains(r.creatorID) && r.category == category && matches(r.title + " " + r.description + " " + r.tools.joined(separator: " ")) && (filter == "All" || filter == "Recent" || filter == "Popular" || filter == "Has repository" || r.tools.contains(filter)) }.sorted { a, b in
                        filter == "Popular" ? store.reviews.filter { $0.resourceID == a.id }.count > store.reviews.filter { $0.resourceID == b.id }.count : false
                    }
                    ForEach(found) { resource in NavigationLink { ResourceDetail(resource: resource) } label: { VStack(alignment: .leading, spacing: 12) { if let image = resource.screenshots.first { MediaImage(source: image).clipShape(RoundedRectangle(cornerRadius: 18)) }; Text(resource.title).font(.title3.weight(.semibold)); Text(resource.description).font(.subheadline).foregroundStyle(.secondary).lineLimit(2); Tags(values: resource.tools); Text("Community submission · Unverified").font(.caption).foregroundStyle(.secondary) } }.buttonStyle(.plain) }
                    if found.isEmpty { empty }
                }
                Text("Search covers the loaded directory (up to 100 newest projects, resources and builders).").font(.caption).foregroundStyle(.secondary)
            }.padding(18)
        }.background(Color.canvas).navigationTitle("Explore").navigationBarTitleDisplayMode(.inline).searchable(text: $search, prompt: "Apps, builders, tools, frameworks").refreshable { await store.load() }
    }
    var empty: some View { ContentUnavailableView.search(text: search.isEmpty ? filter : search) }
}
struct ProjectTile: View {
    let project: Project
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let cover = project.coverURL { MediaImage(source: cover).clipShape(RoundedRectangle(cornerRadius: 20)) }
            HStack { Text(project.name).font(.title2.weight(.semibold)); Spacer(); Image(systemName: "arrow.up.right") }
            Text(project.description).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            Tags(values: project.tools + [project.status])
        }.padding(.bottom, 12)
    }
}
struct ProjectDetail: View {
    @Environment(AppStore.self) private var store
    let project: Project
    var body: some View {
        if store.blocked.contains(project.creatorID) { ContentUnavailableView("Builder blocked", systemImage: "hand.raised") }
        else {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    ProjectTile(project: project)
                    Text(project.description).textSelection(.enabled)
                    NavigationLink { ProfileView(profileID: project.creatorID) } label: { Label(store.profile(project.creatorID)?.displayName ?? "Meet the builder", systemImage: "person.crop.circle") }
                    Tags(values: project.stack)
                    WebLink(title: "Visit website", raw: project.websiteURL)
                    WebLink(title: "View repository", raw: project.repositoryURL)
                    ForEach(Array(project.screenshots.enumerated()), id: \.offset) { _, image in MediaImage(source: image).clipShape(RoundedRectangle(cornerRadius: 18)) }
                    if let url = Links.web(project.videoURL) { ClipPlayer(url: url).frame(height: 240) }
                    Text("The build log").font(.title2.weight(.semibold))
                    ForEach(store.visiblePosts.filter { $0.projectID == project.id }) { PostCard(postID: $0.id) }
                }.padding(18)
            }.navigationTitle(project.name).navigationBarTitleDisplayMode(.inline)
        }
    }
}
struct ResourceDetail: View {
    @Environment(AppStore.self) private var store
    let resource: Resource
    @State private var rating = 5
    @State private var bodyText = ""
    var body: some View {
        if store.blocked.contains(resource.creatorID) { ContentUnavailableView("Builder blocked", systemImage: "hand.raised") }
        else {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let image = resource.screenshots.first { MediaImage(source: image).clipShape(RoundedRectangle(cornerRadius: 20)) }
                    Eyebrow(text: resource.category)
                    Text(resource.title).font(.largeTitle.weight(.semibold))
                    Label("Community submission · Not security reviewed", systemImage: "exclamationmark.shield").font(.caption).foregroundStyle(.secondary)
                    Text(resource.description).textSelection(.enabled)
                    Tags(values: resource.tools + ["v" + resource.version])
                    WebLink(title: "Repository", raw: resource.repositoryURL)
                    WebLink(title: "Documentation", raw: resource.documentationURL)
                    NavigationLink { ProfileView(profileID: resource.creatorID) } label: { Label("Meet the creator", systemImage: "person.crop.circle") }
                    Button { Task { await store.saveResource(resource.id) } } label: { Label(store.resourceSaves.contains(resource.id) ? "Saved to your directory" : "Save resource", systemImage: store.resourceSaves.contains(resource.id) ? "bookmark.fill" : "bookmark") }.buttonStyle(.bordered)
                    Text("Community reviews").font(.title2.weight(.semibold))
                    ForEach(store.reviews.filter { $0.resourceID == resource.id && !store.blocked.contains($0.authorID) }) { review in VStack(alignment: .leading, spacing: 8) { Text(String(repeating: "★", count: review.rating)).foregroundStyle(Color.accent); Text(review.body); Text(store.profile(review.authorID)?.displayName ?? "Builder").font(.caption).foregroundStyle(.secondary) } }
                    Picker("Your rating", selection: $rating) { ForEach(1...5, id: \.self) { Text("\($0) stars").tag($0) } }
                    TextField("Share your experience", text: $bodyText, axis: .vertical).textFieldStyle(.roundedBorder)
                    Button("Publish review") { Task { if await store.review(resource.id, rating: rating, body: bodyText) { bodyText = "" } } }.disabled(bodyText.isEmpty || bodyText.count > 2000)
                    Text("Review source code and permissions before installing community tools. Xpres never executes these resources.").font(.caption).foregroundStyle(.secondary)
                }.padding(18)
            }.navigationTitle("Resource").navigationBarTitleDisplayMode(.inline)
        }
    }
}
