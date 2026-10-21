import SwiftUI
import AVKit

extension Color {
    static let canvas = Color(uiColor: .systemGroupedBackground)
    static let ink = Color.primary
    static let accent = Color(red: 0.18, green: 0.40, blue: 0.34)
}
struct Eyebrow: View {
    let text: String
    var body: some View { Text(text.uppercased()).font(.caption2.weight(.semibold)).tracking(1.6).foregroundStyle(.secondary) }
}
struct Avatar: View {
    var profile: Profile?
    var size: CGFloat = 40
    var body: some View {
        Group {
            if let url = Links.web(profile?.avatarURL) { AsyncImage(url: url) { image in image.resizable().scaledToFill() } placeholder: { initials } }
            else { initials }
        }.frame(width: size, height: size).clipShape(Circle()).accessibilityLabel(profile?.displayName ?? "Builder")
    }
    var initials: some View {
        Circle().fill(Color.accent.opacity(0.12)).overlay(Text(profile?.displayName.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined() ?? "?").font(.system(size: size * 0.32, weight: .semibold, design: .rounded)).foregroundStyle(Color.accent))
    }
}
struct Tags: View {
    let values: [String]
    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 6) { ForEach(Array(values.prefix(4).enumerated()), id: \.offset) { _, value in tag(value) } }
            VStack(alignment: .leading, spacing: 6) { ForEach(Array(values.prefix(4).enumerated()), id: \.offset) { _, value in tag(value) } }
        }
    }
    func tag(_ text: String) -> some View { Text(text).font(.caption.weight(.medium)).padding(.horizontal, 9).padding(.vertical, 5).background(.quaternary, in: Capsule()) }
}
struct MediaImage: View {
    let source: String
    var body: some View {
        Group {
            if source.hasPrefix("demo:") { DemoArtwork(kind: source) }
            else if source.hasPrefix("data:image/"), let comma = source.firstIndex(of: ","), let data = Data(base64Encoded: String(source[source.index(after: comma)...])), let image = UIImage(data: data) { Image(uiImage: image).resizable().scaledToFit() }
            else if let url = Links.web(source) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFit()
                    case .failure: ContentUnavailableView("Image unavailable", systemImage: "photo")
                    default: Rectangle().fill(.quaternary).overlay(ProgressView())
                    }
                }
            } else { ContentUnavailableView("Image unavailable", systemImage: "photo") }
        }.frame(maxWidth: .infinity).background(Color(uiColor: .secondarySystemGroupedBackground))
    }
}
struct DemoArtwork: View {
    let kind: String
    var journal: Bool { kind.contains("still") }
    var field: Bool { kind.contains("field") }
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                (journal ? Color(red: 0.85, green: 0.87, blue: 0.79) : field ? Color(red: 0.79, green: 0.82, blue: 0.75) : Color(red: 0.16, green: 0.23, blue: 0.24))
                if journal {
                    HStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("STILL").font(.caption.weight(.semibold)).tracking(4)
                            Spacer()
                            Text(kind.contains("detail") ? "Small things.\nFully noticed." : "A quieter\nkind of app.").font(.system(.largeTitle, design: .serif)).minimumScaleFactor(0.6)
                            Text("A fictional app, built in public.").font(.caption)
                        }.foregroundStyle(Color.black.opacity(0.75)).padding(.vertical, 25)
                        VStack(alignment: .leading, spacing: 16) {
                            HStack { Image(systemName: "sun.horizon"); Spacer(); Text("9:41").font(.caption2) }
                            Text("Good morning,\nMira.").font(.system(.title2, design: .serif))
                            RoundedRectangle(cornerRadius: 50).fill(Color.accent.opacity(0.3)).frame(height: 65).overlay(Image(systemName: "leaf").font(.largeTitle))
                            Text("What's on your mind?").font(.caption)
                            Rectangle().fill(.black.opacity(0.1)).frame(height: 1)
                            Text("Today feels like a fresh start.").font(.caption2).foregroundStyle(.secondary)
                            Spacer(minLength: 0)
                            HStack { Image(systemName: "house"); Spacer(); Image(systemName: "plus.circle.fill"); Spacer(); Image(systemName: "book") }.font(.caption)
                        }.padding(18).frame(width: geometry.size.width * 0.42).background(Color(red: 0.97, green: 0.96, blue: 0.91), in: RoundedRectangle(cornerRadius: 24)).foregroundStyle(.black.opacity(0.8)).padding(.vertical, 24)
                    }.padding(.horizontal, 24)
                } else if field {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack { Text("fieldnotes").font(.system(.title, design: .serif)); Spacer(); Image(systemName: "square.grid.2x2") }
                        HStack(spacing: 12) {
                            ForEach(0..<3) { index in
                                VStack(alignment: .leading, spacing: 12) {
                                    Rectangle().fill([Color(red: 0.59, green: 0.66, blue: 0.47), Color(red: 0.72, green: 0.52, blue: 0.38), Color(red: 0.89, green: 0.83, blue: 0.68)][index]).overlay(Image(systemName: ["leaf", "sun.max", "mountain.2"][index]).font(.largeTitle).foregroundStyle(.white.opacity(0.8)))
                                    Text(["Slow mornings", "The light here", "Somewhere new"][index]).font(.caption)
                                }.padding(8).background(.white.opacity(0.7), in: RoundedRectangle(cornerRadius: 10))
                            }
                        }
                        Text("Collect the things that make you look twice.").font(.caption)
                    }.padding(24).foregroundStyle(.black.opacity(0.8))
                } else {
                    VStack(alignment: .leading, spacing: 20) {
                        HStack { Image(systemName: kind.contains("critic") ? "viewfinder" : "puzzlepiece.extension").font(.title); Spacer(); Text("COMMUNITY RESOURCE").font(.caption2).tracking(2) }
                        Spacer()
                        Text(kind.contains("critic") ? "A thoughtful\nsecond look." : "Less context switching.\nMore context.").font(.system(.largeTitle, design: .rounded).weight(.medium)).minimumScaleFactor(0.7)
                        HStack { Text(kind.contains("critic") ? "Interface Critic" : "Context Garden"); Spacer(); Image(systemName: "arrow.up.right") }.font(.subheadline)
                    }.padding(28).foregroundStyle(.white.opacity(0.9))
                }
            }
        }.aspectRatio(1.35, contentMode: .fit).accessibilityElement(children: .ignore).accessibilityLabel("Fictional demo artwork: \(kind.replacingOccurrences(of: "demo:", with: ""))")
    }
}
struct MediaCarousel: View {
    let media: [Media]
    var onImage: ((Media) -> Void)?
    var body: some View {
        TabView {
            ForEach(media.sorted { $0.position < $1.position }) { item in
                if item.kind == "video", let url = Links.web(item.url) { ClipPlayer(url: url) }
                else { Button { onImage?(item) } label: { MediaImage(source: item.url) }.buttonStyle(.plain).accessibilityLabel("Open screenshot \(item.position + 1)") }
            }
        }.tabViewStyle(.page(indexDisplayMode: media.count > 1 ? .always : .never)).aspectRatio(1.35, contentMode: .fit).clipShape(RoundedRectangle(cornerRadius: 20))
    }
}
struct ClipPlayer: View {
    let url: URL
    @State private var player: AVPlayer?
    var body: some View {
        VideoPlayer(player: player).onAppear { player = AVPlayer(url: url) }.onDisappear { player?.pause(); player = nil }
    }
}
struct Skeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 15) { HStack { Circle().frame(width: 40, height: 40); RoundedRectangle(cornerRadius: 8).frame(width: 150, height: 18) }; RoundedRectangle(cornerRadius: 20).frame(height: 270); RoundedRectangle(cornerRadius: 8).frame(height: 16) }.foregroundStyle(.quaternary).padding().redacted(reason: .placeholder).accessibilityLabel("Loading posts")
    }
}
struct WebLink: View {
    let title: String
    let raw: String?
    var body: some View { if let url = Links.web(raw) { Link(destination: url) { Label(title, systemImage: "arrow.up.right.square") } } }
}
