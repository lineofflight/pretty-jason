//
//  ViewController.swift
//  Shared (App)
//
//  Created by Hakan Ensari on 30/09/2026.
//

import SafariServices
import SwiftUI

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import Combine
typealias PlatformViewController = NSViewController
#endif

let extensionBundleIdentifier = "ht.lineofflig.prettyjason.Extension"

class ViewController: PlatformViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

#if os(iOS)
        let host = UIHostingController(rootView: SafariWrapperView())
        addChild(host)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(host.view)
        pin(host.view)
        host.didMove(toParent: self)
#elseif os(macOS)
        let host = NSHostingView(rootView: SafariWrapperView())
        host.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(host)
        pin(host)
#endif
    }

#if os(iOS)
    private func pin(_ child: UIView) {
        NSLayoutConstraint.activate([
            child.topAnchor.constraint(equalTo: view.topAnchor),
            child.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            child.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            child.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }
#elseif os(macOS)
    private func pin(_ child: NSView) {
        NSLayoutConstraint.activate([
            child.topAnchor.constraint(equalTo: view.topAnchor),
            child.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            child.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            child.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }
#endif

}

#if os(macOS)

@MainActor
final class ExtensionViewModel: ObservableObject {

    enum State: Equatable {
        case checking
        case enabled
        case disabled
        case unverifiedLocalBuild
        case error(String)
    }

    @Published private(set) var state: State = .checking

    var message: String {
        switch state {
        case .checking:
            return "Checking Safari…"
        case .enabled:
            return "Pretty Jason’s extension is enabled in Safari. You can manage it in Safari Settings → Extensions."
        case .disabled:
            return "Pretty Jason’s extension is currently off. Turn it on in Safari Settings → Extensions."
        case .unverifiedLocalBuild:
            return "Safari hasn’t loaded this local build yet. Enable Safari → Settings → Developer → Allow unsigned extensions, then check Extensions."
        case .error(let description):
            return description
        }
    }

    var buttonTitle: String {
        switch state {
        case .enabled, .disabled:
            return "Quit and Open Safari Settings…"
        default:
            return "Open Safari Extensions Settings…"
        }
    }

    func refresh() async {
        do {
            let extensionState = try await SFSafariExtensionManager.stateOfSafariExtension(withIdentifier: extensionBundleIdentifier)
            state = extensionState.isEnabled ? .enabled : .disabled
        } catch {
            state = Self.state(for: error)
        }
    }

    func openSafariSettings() async {
        do {
            try await SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier)
            NSApp.terminate(nil)
        } catch {
            // Never fail silently: explain what happened and bring Safari forward anyway
            state = Self.state(for: error)
            openSafari()
        }
    }

    private func openSafari() {
        guard let safari = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.Safari") else { return }
        NSWorkspace.shared.openApplication(at: safari, configuration: NSWorkspace.OpenConfiguration())
    }

    private static func state(for error: Error) -> State {
        let nsError = error as NSError
        if nsError.domain == SFErrorDomain && nsError.code == SFErrorCode.noExtensionFound.rawValue {
            return .unverifiedLocalBuild
        }
        return .error(nsError.localizedDescription)
    }

}

struct SafariWrapperView: View {

    @StateObject private var model = ExtensionViewModel()

    var body: some View {
        VStack(spacing: 0) {
            Image("LargeIcon")
                .resizable()
                .interpolation(.high)
                .frame(width: 96, height: 96)
                .accessibilityHidden(true)

            Text("Pretty Jason")
                .font(.title)
                .fontWeight(.semibold)
                .padding(.top, 12)

            VStack(spacing: 6) {
                Text(model.message)
                if case .error = model.state {
                    Text("Open Safari → Settings → Extensions to check Pretty Jason.")
                }
            }
            .font(.body)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: 340)
            .padding(.top, 8)

            Spacer(minLength: 16)

            Button(model.buttonTitle) {
                Task { await model.openSafariSettings() }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .keyboardShortcut(.defaultAction)
        }
        .padding(.horizontal, 32)
        .padding(.top, 28)
        .padding(.bottom, 28)
        .frame(width: 440, height: 340)
        .task { await model.refresh() }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.didBecomeActiveNotification)) { _ in
            Task { await model.refresh() }
        }
    }

}

#elseif os(iOS)

struct SafariWrapperView: View {

    private let steps = [
        "Open Settings → Apps → Safari → Extensions",
        "Tap Pretty Jason and turn Allow Extension on",
        "Set All Websites to Allow",
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                VStack(spacing: 10) {
                    Image("LargeIcon")
                        .resizable()
                        .interpolation(.high)
                        .frame(width: 88, height: 88)
                        .accessibilityHidden(true)

                    Text("Pretty Jason")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Turn on the Safari extension to view JSON as a clean, collapsible tree.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            Text("\(index + 1)")
                                .font(.subheadline.weight(.semibold))
                                .monospacedDigit()
                                .foregroundStyle(.white)
                                .frame(width: 24, height: 24)
                                .background(Circle().fill(Color.accentColor))
                                .accessibilityHidden(true)

                            Text(step)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("Step \(index + 1): \(step)")

                        if index < steps.count - 1 {
                            Divider().padding(.leading, 52)
                        }
                    }
                }
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 48)
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity)
        }
        .background(Color(uiColor: .systemGroupedBackground).ignoresSafeArea())
    }

}

#endif
