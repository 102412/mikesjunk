import XCTest
@testable import Xpres

final class ModelTests: XCTestCase {
    func testShowcaseRequiresMediaButDiscussionDoesNot() throws {
        var draft = DraftPost(); draft.title = "A small app"; draft.body = "Built with SwiftUI"
        XCTAssertThrowsError(try draft.validate(mediaCount: 0))
        XCTAssertNoThrow(try draft.validate(mediaCount: 1))
        draft.kind = .discussion
        XCTAssertNoThrow(try draft.validate(mediaCount: 0))
    }
    func testURLsRejectUnsafeSchemesAndCredentials() {
        for raw in ["javascript:alert(1)", "http://example.com", "https://user:password@example.com", "broken"] { XCTAssertNil(Links.web(raw)) }
        XCTAssertNotNil(Links.web("https://example.com/docs"))
    }
    func testDatabaseWireFormatDecodesAcronymsAndFractionalDates() throws {
        let json = """
        {"id":"00000000-0000-4000-8000-000000000001","author_id":"00000000-0000-4000-8000-000000000002","project_id":null,"resource_id":null,"kind":"discussion","title":"Hello","body":"Builder community","tools":[],"stack":[],"status":"In development","website_url":"https://example.com","repository_url":null,"duration_minutes":null,"features":[],"commit_urls":[],"created_at":"2026-10-21T12:30:00.123456+00:00","post_media":[],"likes":[{"user_id":"00000000-0000-4000-8000-000000000003"}],"saves":[],"comments":[]}
        """
        let post = try Codec.decoder.decode(Post.self, from: Data(json.utf8))
        XCTAssertEqual(post.authorID, Demo.id(2)); XCTAssertEqual(post.websiteURL, "https://example.com"); XCTAssertEqual(post.likes.first?.userID, Demo.id(3))
    }
    func testResourceAndSessionValidation() {
        var draft = DraftPost(); draft.title = "Resource"; draft.body = "A description"; draft.kind = .resource
        XCTAssertThrowsError(try draft.validate(mediaCount: 0))
        draft.repository = "https://github.com/example/tool"
        XCTAssertNoThrow(try draft.validate(mediaCount: 0))
        draft.kind = .session; draft.duration = "0"
        XCTAssertThrowsError(try draft.validate(mediaCount: 0))
        draft.duration = "60"; draft.commits = "javascript:alert(1)"
        XCTAssertThrowsError(try draft.validate(mediaCount: 0))
    }
    @MainActor func testDemoLikeSaveFollowAndCommentAreInteractive() async {
        let store = AppStore(); store.startDemo()
        let postID = Demo.posts[0].id
        await store.toggle(postID, save: false)
        XCTAssertTrue(store.posts[0].likes.contains { $0.userID == store.me.id })
        await store.toggle(postID, save: false)
        XCTAssertFalse(store.posts[0].likes.contains { $0.userID == store.me.id })
        await store.toggle(postID, save: true)
        XCTAssertTrue(store.posts[0].saves.contains { $0.userID == store.me.id })
        let added = await store.comment(postID: postID, text: "Thoughtful feedback")
        XCTAssertTrue(added); XCTAssertEqual(store.posts[0].comments.last?.body, "Thoughtful feedback")
        await store.block(Demo.id(2))
        XCTAssertFalse(store.visiblePosts.contains { $0.authorID == Demo.id(2) })
        await store.unblock(Demo.id(2))
        XCTAssertTrue(store.visiblePosts.contains { $0.authorID == Demo.id(2) })
    }
}
