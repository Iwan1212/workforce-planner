"""Tests for the archive wind-down classification rules.

The rules are shared by project and employee archiving, and the boundary cases
(assignments starting or ending exactly today) are the ones most likely to
regress, so they are pinned explicitly.
"""

from datetime import date

from app.services.lifecycle_service import WindDownAction, classify_for_wind_down

TODAY = date(2026, 7, 18)


def classify(start: date, end: date) -> WindDownAction:
    return classify_for_wind_down(start, end, TODAY)


class TestPastAssignments:
    def test_finished_before_today_is_kept(self):
        assert (
            classify(date(2026, 6, 1), date(2026, 7, 10)) is WindDownAction.KEEP
        )

    def test_ended_yesterday_is_kept(self):
        assert (
            classify(date(2026, 6, 1), date(2026, 7, 17)) is WindDownAction.KEEP
        )

    def test_long_finished_is_kept(self):
        assert (
            classify(date(2020, 1, 1), date(2020, 12, 31)) is WindDownAction.KEEP
        )


class TestOngoingAssignments:
    def test_spanning_today_is_trimmed(self):
        assert (
            classify(date(2026, 7, 1), date(2026, 8, 31)) is WindDownAction.TRIM
        )

    def test_starting_today_is_ongoing_not_future(self):
        # Trimmed to a single day rather than deleted.
        assert (
            classify(TODAY, date(2026, 9, 30)) is WindDownAction.TRIM
        )

    def test_ending_today_needs_no_change(self):
        assert classify(date(2026, 7, 1), TODAY) is WindDownAction.KEEP

    def test_single_day_today_needs_no_change(self):
        assert classify(TODAY, TODAY) is WindDownAction.KEEP


class TestFutureAssignments:
    def test_starting_tomorrow_is_deleted(self):
        assert (
            classify(date(2026, 7, 19), date(2026, 8, 31))
            is WindDownAction.DELETE
        )

    def test_far_future_is_deleted(self):
        assert (
            classify(date(2026, 8, 1), date(2026, 9, 30))
            is WindDownAction.DELETE
        )


class TestIssueExample:
    """The worked example from issue #73, with today = 2026-07-18."""

    def test_finished_kept(self):
        assert (
            classify(date(2026, 6, 1), date(2026, 7, 10)) is WindDownAction.KEEP
        )

    def test_ongoing_trimmed(self):
        assert (
            classify(date(2026, 7, 1), date(2026, 8, 31)) is WindDownAction.TRIM
        )

    def test_future_deleted(self):
        assert (
            classify(date(2026, 8, 1), date(2026, 9, 30))
            is WindDownAction.DELETE
        )
