import SwiftUI
import WidgetKit

/// Same snapshot the web app pushes (`buildWidgetSnapshot`). Privacy strings are preformatted.
/// Swift only extrapolates `live` and draws the month beat.

private let appGroup = "group.app.inertia.wealth"
private let snapshotKey = "inertia.widget.snapshot"
private let paceCapDays = 45.0

struct Snapshot {
    var style: String = "rhythm"
    var mode: String = "exact"
    var brand: String = "Inertia"
    var nwLabel: String = ""
    var nwText: String = ""
    var nwShow: Bool = false
    var paceLabel: String = ""
    var paceText: String = ""
    var paceShow: Bool = false
    var rhythmShow: Bool = true
    var liveBase: Double?
    var livePerDay: Double = 0
    var liveAt: Date?
    var buckets: [(String, String)] = []

    static func load(now: Date) -> Snapshot {
        guard
            let raw = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
            let data = raw.data(using: .utf8),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return Snapshot() }
        var s = Snapshot()
        s.style = (json["style"] as? String) ?? "rhythm"
        s.mode = (json["mode"] as? String) ?? "exact"
        s.brand = (json["brand"] as? String) ?? "Inertia"
        if let nw = json["netWorth"] as? [String: Any] {
            s.nwShow = (nw["show"] as? Bool) ?? false
            s.nwLabel = (nw["label"] as? String) ?? ""
            s.nwText = (nw["text"] as? String) ?? ""
        }
        if let pace = json["pace"] as? [String: Any] {
            s.paceShow = (pace["show"] as? Bool) ?? false
            s.paceLabel = (pace["label"] as? String) ?? ""
            s.paceText = (pace["text"] as? String) ?? ""
        }
        if let rhythm = json["rhythm"] as? [String: Any] {
            s.rhythmShow = (rhythm["show"] as? Bool) ?? true
        }
        if let live = json["live"] as? [String: Any],
           let base = live["base"] as? Double,
           let at = live["at"] as? Double {
            s.liveBase = base
            s.livePerDay = (live["perDay"] as? Double) ?? 0
            s.liveAt = Date(timeIntervalSince1970: at / 1000)
        }
        if let rows = json["buckets"] as? [[String: Any]] {
            s.buckets = rows.prefix(4).compactMap { row in
                guard let label = row["label"] as? String, let text = row["text"] as? String else { return nil }
                return (label, text)
            }
        }
        if s.nwShow, let base = s.liveBase, let at = s.liveAt, s.mode == "exact" || s.mode == "rounded" {
            let days = min(paceCapDays, max(0, now.timeIntervalSince(at) / 86_400))
            let value = base + s.livePerDay * days
            s.nwText = formatLive(value, mode: s.mode, live: json["live"] as? [String: Any])
        }
        return s
    }
}

private func formatLive(_ value: Double, mode: String, live: [String: Any]?) -> String {
    let prefix = (live?["prefix"] as? String) ?? ""
    if mode == "rounded" {
        let unit = (live?["unit"] as? String) ?? ""
        if !unit.isEmpty {
            let wan = value / 10_000
            return prefix + String(format: "%.0f ", wan) + unit
        }
    }
    let n = Int(value.rounded())
    let fmt = NumberFormatter()
    fmt.numberStyle = .decimal
    fmt.maximumFractionDigits = 0
    return prefix + (fmt.string(from: NSNumber(value: n)) ?? "\(n)")
}

struct Entry: TimelineEntry {
    let date: Date
    let snap: Snapshot
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), snap: Snapshot())
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        let now = Date()
        completion(Entry(date: now, snap: Snapshot.load(now: now)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let now = Date()
        let cal = Calendar.current
        var entries: [Entry] = []
        for step in 0..<48 {
            guard let date = cal.date(byAdding: .minute, value: step * 30, to: now) else { continue }
            entries.append(Entry(date: date, snap: Snapshot.load(now: date)))
        }
        let next = cal.date(byAdding: .minute, value: 48 * 30, to: now) ?? now.addingTimeInterval(86_400)
        completion(Timeline(entries: entries, policy: .after(next)))
    }
}

struct InertiaEntryView: View {
    var entry: Entry
    @Environment(\.widgetFamily) private var family

    private var accent: Color {
        switch entry.snap.style {
        case "editorial": return Color(red: 0.764, green: 0.251, blue: 0.165)
        case "sediment": return Color(red: 0.604, green: 0.357, blue: 0.133)
        default: return Color(red: 0.180, green: 0.490, blue: 0.357)
        }
    }

    private var paper: Color {
        switch entry.snap.style {
        case "editorial": return Color(red: 0.969, green: 0.957, blue: 0.933)
        case "sediment": return Color(red: 0.969, green: 0.961, blue: 0.945)
        default: return Color(red: 0.957, green: 0.961, blue: 0.953)
        }
    }

    var body: some View {
        let small = family == .systemSmall
        VStack(alignment: .leading, spacing: 4) {
            if entry.snap.style == "rhythm" {
                Text(entry.snap.paceShow ? entry.snap.paceText : entry.snap.nwLabel)
                    .font(.system(size: small ? 22 : 26, weight: .semibold, design: .default))
                    .foregroundStyle(accent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                if entry.snap.nwShow {
                    Text(entry.snap.nwText)
                        .font(.system(size: 12, weight: .semibold).monospacedDigit())
                        .lineLimit(1)
                }
            } else {
                Text(entry.snap.nwLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(entry.snap.nwShow ? entry.snap.nwText : entry.snap.paceLabel)
                    .font(entry.snap.style == "editorial"
                          ? .system(size: small ? 28 : 34, weight: .regular, design: .serif)
                          : .system(size: small ? 26 : 32, weight: .semibold))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.45)
                if entry.snap.paceShow {
                    Text(entry.snap.paceText)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(accent)
                        .lineLimit(1)
                }
            }
            if !small {
                if entry.snap.style == "sediment" {
                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(Array(entry.snap.buckets.enumerated()), id: \.offset) { _, row in
                            HStack {
                                Text(row.0).foregroundStyle(.secondary)
                                Spacer()
                                Text(row.1).monospacedDigit()
                            }
                            .font(.caption2)
                        }
                    }
                } else {
                    TrendShape().stroke(accent, lineWidth: 1.4).frame(height: 36)
                }
            }
            Spacer(minLength: 0)
            if entry.snap.rhythmShow {
                MonthBeat(style: entry.snap.style, date: entry.date)
                    .frame(height: small && entry.snap.style == "rhythm" ? 44 : 22)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(12)
        .containerBackground(paper, for: .widget)
    }
}

private struct TrendShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let n = 12
        for i in 0..<n {
            let t = CGFloat(i) / CGFloat(n - 1)
            let x = rect.minX + t * rect.width
            let y = rect.maxY - (rect.height * 0.15 + rect.height * 0.7 * t)
            if i == 0 { p.move(to: CGPoint(x: x, y: y)) }
            else { p.addLine(to: CGPoint(x: x, y: y)) }
        }
        return p
    }
}

private struct MonthBeat: View {
    var style: String
    var date: Date

    var body: some View {
        let cal = Calendar.current
        let day = cal.component(.day, from: date)
        let dim = cal.range(of: .day, in: .month, for: date)?.count ?? 30
        let cols = style == "rhythm" ? 10 : min(dim, 31)
        let rows = style == "rhythm" ? 3 : (style == "editorial" || style == "sediment" ? 4 : 1)
        let count = style == "rhythm" ? min(dim, 30) : cols * rows
        let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: cols)
        LazyVGrid(columns: columns, spacing: 2) {
            ForEach(0..<count, id: \.self) { i in
                let on: Bool = {
                    if style == "rhythm" { return i + 1 <= day }
                    let col = i % cols
                    return col + 1 <= day
                }()
                Circle()
                    .fill(on ? Color.primary.opacity(0.85) : Color.primary.opacity(0.12))
                    .frame(width: style == "sediment" ? 3 : 5, height: style == "sediment" ? 3 : 5)
            }
        }
    }
}

@main
struct InertiaWidgetBundle: WidgetBundle {
    var body: some Widget { InertiaWidget() }
}
