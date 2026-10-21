import SwiftUI
import PhotosUI
import UniformTypeIdentifiers

struct ComposeView: View {
    @Environment(AppStore.self) private var store
    @State private var draft = DraftPost()
    @State private var selection: [PhotosPickerItem] = []
    @State private var images: [Data] = []
    @State private var processing = false
    var body: some View {
        Form {
            Section {
                Text("What are you making?").font(.system(.title, design: .serif))
                Text("Share the work. Tell the story behind it.").font(.subheadline).foregroundStyle(.secondary)
                Picker("Post type", selection: $draft.kind) { ForEach(PostKind.allCases) { Label($0.title, systemImage: $0.symbol).tag($0) } }
            }
            Section("The story") {
                TextField("Give it a name", text: $draft.title)
                TextField("What did you build, learn or discover?", text: $draft.body, axis: .vertical).lineLimit(4...12)
                TextField("AI tools, comma separated", text: $draft.tools)
                TextField("Technology stack", text: $draft.stack)
                Picker("Status", selection: $draft.status) { ForEach(["In development", "Looking for testers", "Launched"], id: \.self) { Text($0) } }
            }
            Section(draft.kind == .application ? "Screenshots · At least one required" : "Screenshots") {
                PhotosPicker(selection: $selection, maxSelectionCount: 6, matching: .images) { Label("Choose up to 6 images", systemImage: "photo.on.rectangle.angled") }
                if processing { ProgressView("Preparing images…") }
                ScrollView(.horizontal) { HStack { ForEach(Array(images.enumerated()), id: \.offset) { index, bytes in if let image = UIImage(data: bytes) { Image(uiImage: image).resizable().scaledToFit().frame(height: 110).clipShape(RoundedRectangle(cornerRadius: 10)).overlay(alignment: .topTrailing) { Button { images.remove(at: index) } label: { Image(systemName: "xmark.circle.fill").symbolRenderingMode(.palette).foregroundStyle(.white, .black) }.accessibilityLabel("Remove image \(index + 1)") } } } } }
                Text("Images are resized to 2,048 px and encoded as JPEG before upload. No photo location metadata is retained.").font(.caption).foregroundStyle(.secondary)
            }
            Section("Project portfolio") {
                Toggle("Create a project page with this post", isOn: $draft.createProject)
                if !draft.createProject {
                    Picker("Attach to project", selection: $draft.projectID) {
                        Text("None").tag(nil as UUID?)
                        ForEach(store.projects.filter { $0.creatorID == store.me.id }) { Text($0.name).tag(Optional($0.id)) }
                    }
                }
                TextField("Website · https://", text: $draft.website).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                TextField("Repository · https://", text: $draft.repository).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
            }
            if draft.kind == .resource {
                Section("Resource listing") {
                    Picker("Category", selection: $draft.resourceCategory) { ForEach(["Claude Skills", "Codex Resources", "MCP Servers", "Agent Configurations", "Other Resources"], id: \.self) { Text($0) } }
                    TextField("Version", text: $draft.version)
                    TextField("Documentation · https://", text: $draft.documentation).textInputAutocapitalization(.never).keyboardType(.URL)
                    Text("Listings are community submissions and are not security reviewed. We never execute submitted code.").font(.caption).foregroundStyle(.secondary)
                }
            }
            if draft.kind == .session {
                Section("An explicitly shared session") {
                    TextField("Duration in minutes", text: $draft.duration).keyboardType(.numberPad)
                    TextField("Milestones, comma separated", text: $draft.features)
                    TextField("Commit URLs, comma separated", text: $draft.commits).textInputAutocapitalization(.never)
                    Text("Only the activity you choose to share will be published.").font(.caption).foregroundStyle(.secondary)
                }
            }
            Section {
                Button { Task { if await store.publish(draft, images: images) { draft = DraftPost(); selection = []; images = []; store.selectedTab = 0; store.notice = store.demo ? "Your demo post is live locally." : "Your build is live." } } } label: { HStack { Spacer(); if store.busy { ProgressView() } else { Label("Share with the community", systemImage: "arrow.up.right") }; Spacer() } }.disabled(store.busy || processing)
            }
        }.navigationTitle("Create").navigationBarTitleDisplayMode(.inline)
            .task(id: selection) { await prepareImages() }
    }
    @MainActor private func prepareImages() async {
        guard !selection.isEmpty else { return }
        processing = true; defer { processing = false }
        var next: [Data] = []
        do {
            for item in selection {
                try Task.checkCancellation()
                guard let bytes = try await item.loadTransferable(type: Data.self), bytes.count <= 25 * 1024 * 1024, let image = UIImage(data: bytes) else { throw AppError.message("Choose an image smaller than 25 MB.") }
                let scale = min(1, 2048 / max(image.size.width, image.size.height))
                let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
                let format = UIGraphicsImageRendererFormat(); format.scale = 1
                let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
                guard let jpeg = resized.jpegData(compressionQuality: 0.85) else { throw AppError.message("Could not prepare this image.") }
                next.append(jpeg)
            }
            try Task.checkCancellation(); images = next
        } catch is CancellationError { }
        catch { store.error = error.localizedDescription }
    }
}
