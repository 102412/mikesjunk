import SwiftUI

@main struct XpresApp: App {
    @State private var store = AppStore()
    init() {
        URLCache.shared = URLCache(memoryCapacity: 32 * 1024 * 1024, diskCapacity: 128 * 1024 * 1024)
    }
    var body: some Scene {
        WindowGroup {
            RootView().environment(store).tint(.accent)
                .task { await store.start() }
                .onOpenURL { url in Task { do { store.recovery = try await store.api.receiveCallback(url); store.signedIn = true; await store.load() } catch { store.error = error.localizedDescription } } }
        }
    }
}
struct RootView: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        @Bindable var store = store
        Group {
            if store.signedIn {
                TabView(selection: $store.selectedTab) {
                    Tab("Home", systemImage: "house", value: 0) { NavigationStack { FeedView() } }
                    Tab("Explore", systemImage: "safari", value: 1) { NavigationStack { ExploreView() } }
                    Tab("Create", systemImage: "plus.app", value: 2) { NavigationStack { ComposeView() } }
                    Tab("Research", systemImage: "sparkle.magnifyingglass", value: 3) { NavigationStack { ResearchView(context: nil) } }
                    Tab("Profile", systemImage: "person.crop.circle", value: 4) { NavigationStack { ProfileView(profileID: store.me.id) } }
                }
                .sheet(item: $store.researchContext) { context in NavigationStack { ResearchView(context: context) }.presentationDragIndicator(.visible) }
                .sheet(isPresented: $store.recovery) { NavigationStack { PasswordView() }.interactiveDismissDisabled() }
            } else { WelcomeView() }
        }
        .alert("Something needs attention", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) { Button("OK") { store.error = nil } } message: { Text(store.error ?? "") }
        .alert("Xpres.ai", isPresented: Binding(get: { store.notice != nil }, set: { if !$0 { store.notice = nil } })) { Button("OK") { store.notice = nil } } message: { Text(store.notice ?? "") }
    }
}
struct WelcomeView: View {
    @Environment(AppStore.self) private var store
    @State private var email = ""
    @State private var password = ""
    @State private var signup = false
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack { Image(systemName: "asterisk").font(.largeTitle); Text(Brand.name).font(.title2.weight(.semibold)) }.padding(.top, 30)
                    Text("Good ideas\ndeserve company.").font(.system(.largeTitle, design: .serif).weight(.medium)).padding(.top, 25)
                    Text(Brand.tagline).foregroundStyle(.secondary)
                    DemoArtwork(kind: "demo:still").clipShape(RoundedRectangle(cornerRadius: 24))
                    VStack(spacing: 14) {
                        TextField("Email", text: $email).textContentType(.emailAddress).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                        SecureField("Password", text: $password).textContentType(signup ? .newPassword : .password)
                    }.textFieldStyle(.roundedBorder)
                    Button { Task { await store.authenticate(email: email, password: password, signup: signup) } } label: { HStack { Spacer(); if store.busy { ProgressView() } else { Text(signup ? "Create your account" : "Sign in") }; Spacer() }.padding(8) }.buttonStyle(.borderedProminent).disabled(store.busy || email.isEmpty || password.count < 8)
                    HStack {
                        Button(signup ? "Already a member?" : "Join the community") { signup.toggle() }
                        Spacer()
                        Button("Reset password") { Task { do { try await store.api.recover(email: email); store.notice = "Check your email for a password reset link." } catch { store.error = error.localizedDescription } } }.disabled(email.isEmpty)
                    }.font(.footnote)
                    #if DEBUG
                    Divider()
                    Button { store.startDemo() } label: { Label("Explore the fictional demo", systemImage: "play.circle").frame(maxWidth: .infinity) }.buttonStyle(.bordered)
                    Text("Development demo. Fictional people, projects and engagement. Changes stay in memory and reset when you leave.").font(.caption).foregroundStyle(.secondary)
                    #endif
                    if !Configuration.current.configured { Label("Connect Supabase in Xcode build settings to use a real account.", systemImage: "info.circle").font(.caption).foregroundStyle(.secondary) }
                }.padding(24)
            }.background(Color.canvas)
        }
    }
}
struct PasswordView: View {
    @Environment(AppStore.self) private var store
    @State private var password = ""
    var body: some View {
        Form { SecureField("New password (8+ characters)", text: $password); Button("Update password") { Task { do { try await store.api.updatePassword(password); store.recovery = false; store.notice = "Password updated." } catch { store.error = error.localizedDescription } } }.disabled(password.count < 8) }.navigationTitle("Reset password")
    }
}
