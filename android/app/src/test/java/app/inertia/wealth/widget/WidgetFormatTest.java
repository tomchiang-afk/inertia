package app.inertia.wealth.widget;

import static org.junit.Assert.assertEquals;

import java.util.Calendar;
import org.junit.Test;

/** Native formatter must match src/format.js (fmtMoney / fmtCompact / fmtRounded). */
public class WidgetFormatTest {

    private static final long DAY = 86_400_000L;

    @Test
    public void exactMatchesFmtNT() {
        assertEquals("NT$16,470,000", WidgetFormat.exact(16_470_000));
        assertEquals("NT$16,471,720", WidgetFormat.exact(16_471_719.6));
        assertEquals("\u2212NT$3,200", WidgetFormat.exact(-3_200));
        assertEquals("NT$0", WidgetFormat.exact(0));
    }

    @Test
    public void compactMatchesFmtNTCompact() {
        assertEquals("NT$16M", WidgetFormat.compact(16_470_000));
        assertEquals("NT$2.5M", WidgetFormat.compact(2_450_000));
        assertEquals("NT$1.2M", WidgetFormat.compact(1_220_000));
        assertEquals("NT$3M", WidgetFormat.compact(3_000_000));
        assertEquals("NT$28.5k", WidgetFormat.compact(28_500));
        assertEquals("NT$186k", WidgetFormat.compact(186_000));
        assertEquals("NT$9,999", WidgetFormat.compact(9_999));
    }

    @Test
    public void wanMatchesFormatRoundedWan() {
        assertEquals("NT$1,647 萬", WidgetFormat.wan(16_470_000, "萬"));
        assertEquals("NT$5 萬", WidgetFormat.wan(51_600, "萬"));
    }

    @Test
    public void prefixedFormatsMatchJsForOtherBases() {
        // Same cases as tests/portfolio.test.mjs and tests/widgetSnapshotMulti.test.mjs
        assertEquals("US$506,800", WidgetFormat.exact(506_800, "US$"));
        assertEquals("US$507k", WidgetFormat.compact(506_800, "US$"));
        assertEquals("US$9,999", WidgetFormat.compact(9_999, "US$"));
        assertEquals("JP¥2.3B", WidgetFormat.compact(2_300_000_000.0, "JP¥"));
        assertEquals("US$507k", WidgetFormat.round(506_800, "US$"));
        assertEquals("US$1.2M", WidgetFormat.round(1_234_567, "US$"));
        assertEquals("JP¥74.5M", WidgetFormat.round(74_529_412, "JP¥"));
        assertEquals("€840", WidgetFormat.round(843, "€"));
        assertEquals("\u2212US$3k", WidgetFormat.round(-2_500, "US$"));
        assertEquals("NT$1,647 萬", WidgetFormat.wan(16_470_000, "萬", "NT$"));
        assertEquals("NT$0", WidgetFormat.exact(-0.2));
    }

    @Test
    public void extrapolatesQuietGrowthWithCap() {
        long at = 1_000_000_000_000L;
        assertEquals(1000.0, WidgetFormat.extrapolate(1000, 50, at, at), 1e-9);
        assertEquals(1050.0, WidgetFormat.extrapolate(1000, 50, at, at + DAY), 1e-9);
        assertEquals(1025.0, WidgetFormat.extrapolate(1000, 50, at, at + DAY / 2), 1e-9);
        // clock went backwards → no negative growth
        assertEquals(1000.0, WidgetFormat.extrapolate(1000, 50, at, at - DAY), 1e-9);
        // capped at MAX_EXTRAPOLATE_DAYS
        assertEquals(1000 + 50 * WidgetFormat.MAX_EXTRAPOLATE_DAYS,
                WidgetFormat.extrapolate(1000, 50, at, at + 400 * DAY), 1e-9);
    }

    /** v0.3.1: live.base/at are the rhythm anchor; mirrors tests/pace.test.mjs (same seed). */
    @Test
    public void anchoredExtrapolationMatchesJsPace() {
        long anchor = 1_790_000_000_000L;
        double perDay = 1720.59; // snapshot rounds quietDay to 2 decimals
        double tenDays = WidgetFormat.extrapolate(16_470_000, perDay, anchor, anchor + 10 * DAY);
        assertEquals("NT$16,487,206", WidgetFormat.exact(tenDays, "NT$"));
        // re-pushing a snapshot keeps the same anchor → value only moves forward with time
        double elevenDays = WidgetFormat.extrapolate(16_470_000, perDay, anchor, anchor + 11 * DAY);
        assertEquals(perDay, elevenDays - tenDays, 1e-6);
        // JS PACE_MAX_DAYS == 45
        assertEquals(45.0, WidgetFormat.MAX_EXTRAPOLATE_DAYS, 0);
    }

    @Test
    public void monthProgressMatchesJs() {
        Calendar c = Calendar.getInstance();
        c.set(2026, Calendar.SEPTEMBER, 15);
        assertEquals(50, WidgetFormat.monthProgressPct(c));
        c.set(2026, Calendar.SEPTEMBER, 27);
        assertEquals(90, WidgetFormat.monthProgressPct(c));
        c.set(2026, Calendar.FEBRUARY, 28);
        assertEquals(100, WidgetFormat.monthProgressPct(c));
    }
}
