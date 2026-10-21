import SwiftUI

struct ProfileView: View {
    @Environment(AppStore.self) private var store
    let profileID: UUID
    @State private var editing = false
    @State private var followers: Int?
    @State private var followingCount: Int?
    var body: some View {
        if store.blocked.contains(profileID) { ContentUnavailableView("Builder blocked", systemImage: "hand.raised", description: Text("Manage blocked builders in Settings.")) }
        else if let profile = store.profile(profileID) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 22) {
                    HStack { Avatar(profile: profile, size: 78); Spacer(); if profileID == store.me.id { Button("Edit profile") { editing = true }.buttonStyle(.bordered) } else { Button(store.follows.contains(profileID) ? "Following" : "Follow") { Task { await store.follow(profileID) } }.buttonStyle(.borderedProminent) } }
                    VStack(alignment: .leading, spacing: 8) { Text(profile.displayName).font(.system(.largeTitle, design: .serif)); Text("@" + profile.username).foregroundStyle(.secondary); Text(profile.bio) }
                    Label(profile.tier.rawValue.capitalized + " · Self-reported", systemImage: "sparkle").font(.caption.weight(.semibold)).foregroundStyle(Color.accent)
                    Text("Identity describes AI experience, not a verified credential or paid subscription.").font(.caption).foregroundStyle(.secondary)
                    Text("Joined \(profile.createdAt.formatted(.dateTime.month().year()))").font(.caption).foregroundStyle(.secondary)
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 24) { stats }
                        VStack(alignment: .leading, spacing: 12) { stats }
                    }
                    if profileID == store.me.id { NavigationLink("Manage following") { FollowingView() }.font(.subheadline) }
                    Tags(values: profile.tools)
                    Tags(values: profile.interests)
                    Text("Made by \(profile.displayName.split(separator: " ").first.map(String.init) ?? "this builder")").font(.title2.weight(.semibold))
                    ForEach(store.projects.filter { $0.creatorID == profileID }) { project in NavigationLink { ProjectDetail(project: project) } label: { ProjectTile(project: project) }.buttonStyle(.plain) }
                    ForEach(store.resources.filter { $0.creatorID == profileID }) { resource in NavigationLink(resource.title) { ResourceDetail(resource: resource) } }
                    Text("In the making").font(.title2.weight(.semibold))
                    ForEach(store.visiblePosts.filter { $0.authorID == profileID }) { PostCard(postID: $0.id) }
                }.padding(20)
            }.navigationTitle(profileID == store.me.id ? "Your studio" : "Builder").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    if profileID == store.me.id { NavigationLink { SettingsView() } label: { Image(systemName: "gearshape") }.accessibilityLabel("Settings") }
                    else { Menu { Button("Report profile") { Task { await store.report(profileID: profileID, reason: "Profile requires review") } }; Button("Block builder", role: .destructive) { Task { await store.block(profileID) } } } label: { Image(systemName: "ellipsis") } }
                }.sheet(isPresented: $editing) { NavigationStack { EditProfile(profile: profile) } }
                .task(id: store.follows.contains(profileID)) {
                    if store.demo { followers = store.follows.contains(profileID) ? 1 : 0; followingCount = profileID == store.me.id ? store.follows.count : 0 }
                    else {
                        struct Counts: Decodable { var followerCount: Int; var followingCount: Int }
                        do { let counts: [Counts] = try await store.api.get("rpc/profile_counts", query: "target=\(profileID)"); followers = counts.first?.followerCount; followingCount = counts.first?.followingCount }
                        catch { store.error = error.localizedDescription }
                    }
                }
        } else { ContentUnavailableView("Profile unavailable", systemImage: "person.crop.circle.badge.questionmark") }
    }
    @ViewBuilder var stats: some View {
        VStack(alignment: .leading) { Text(followers.map { String($0) } ?? "—").font(.title2.weight(.semibold)); Text("Followers").font(.caption) }
        VStack(alignment: .leading) { Text(followingCount.map { String($0) } ?? "—").font(.title2.weight(.semibold)); Text("Following").font(.caption) }
        VStack(alignment: .leading) { Text("\(store.projects.filter { $0.creatorID == profileID }.count)").font(.title2.weight(.semibold)); Text("Projects").font(.caption) }
    }

}
struct EditProfile: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State var profile: Profile
    @State private var saving = false
    var body: some View {
        Form {
            Section("Your identity") { TextField("Display name", text: $profile.displayName); TextField("Username", text: $profile.username).textInputAutocapitalization(.never).autocorrectionDisabled(); TextField("Bio", text: $profile.bio, axis: .vertical) }
            Section("AI experience · Self-reported") {
                Picker("Tier", selection: $profile.tier) { ForEach(IdentityTier.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) } }
                Text("Lite: casual use, usually under 5 hours/week. Pro: dedicated use, usually 5+ hours/week. Superuser: advanced or professional use. These are not paid plans.").font(.caption).foregroundStyle(.secondary)
            }
            Section("Tools & interests") { TextField("Tools, separated by commas", text: Binding(get: { profile.tools.joined(separator: ", ") }, set: { profile.tools = list($0) })); TextField("Interests, separated by commas", text: Binding(get: { profile.interests.joined(separator: ", ") }, set: { profile.interests = list($0) })) }
            Button("Save profile") { saving = true; Task { if await store.saveProfile(profile) { dismiss() }; saving = false } }.disabled(saving || profile.displayName.isEmpty || profile.username.range(of: "^[a-z0-9_.]{3,30}$", options: .regularExpression) == nil)
        }.navigationTitle("Edit profile").toolbar { Button("Cancel") { dismiss() } }
    }
}
struct FollowingView: View {
    @Environment(AppStore.self) private var store
    var body: some View { List(store.profiles.filter { store.follows.contains($0.id) }) { p in NavigationLink { ProfileView(profileID: p.id) } label: { HStack { Avatar(profile: p); Text(p.displayName) } } }.navigationTitle("Following") }
}
struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @State private var deleting = false
    var body: some View {
        List {
            Section("Your account") {
                Text(store.demo ? "Fictional demo · No production writes" : "Connected to Supabase").font(.subheadline)
                Button("Sign out") { Task { await store.leave() } }
                Button("Delete account and associated data", role: .destructive) { deleting = true }
            }
            Section("Blocked builders") {
                if store.blocked.isEmpty { Text("No blocked builders").foregroundStyle(.secondary) }
                ForEach(Array(store.blocked), id: \.self) { id in HStack { Text(store.profile(id)?.displayName ?? "Blocked account"); Spacer(); Button("Unblock") { Task { await store.unblock(id) } } } }
            }
            Section("Privacy") { Text("Build sessions are explicitly shared. We do not track your coding activity or private AI accounts. Research questions go to your configured backend and Groq; external search is opt-in per request. Usage logs contain counts and status, not your question text.").font(.footnote) }
            Section("About") { Text(Brand.name); Text("A community for people building with AI.").foregroundStyle(.secondary) }
        }.navigationTitle("Settings").confirmationDialog("Delete your account? This permanently removes your profile, posts, projects, resources and uploaded media. This cannot be undone.", isPresented: $deleting, titleVisibility: .visible) { Button("Permanently delete", role: .destructive) { Task { await store.leave(delete: true) } } }
    }
}
