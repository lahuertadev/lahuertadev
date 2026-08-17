from datetime import date, datetime, timedelta, timezone as dt_timezone
from types import SimpleNamespace

from django.utils import timezone

from autenticacion.utils import get_upcoming_celebrations, CELEBRATIONS_WINDOW_DAYS


def make_user(user_id, first_name='', last_name='', birth_date=None, date_joined=None):
    return SimpleNamespace(
        id=user_id,
        first_name=first_name,
        last_name=last_name,
        birth_date=birth_date,
        date_joined=date_joined,
    )


def date_with_offset(days, years_ago=0):
    """Fecha cuyo mes/día caen `days` días a partir de hoy, `years_ago` años antes."""
    target = timezone.localdate() + timedelta(days=days)
    return date(target.year - years_ago, target.month, target.day)


def datetime_with_offset(days, years_ago=0):
    d = date_with_offset(days, years_ago)
    return datetime(d.year, d.month, d.day, 12, 0, tzinfo=dt_timezone.utc)


#? ==================== CUMPLEAÑOS ====================

def test_birthday_today_is_included_with_zero_days():
    user = make_user(1, birth_date=date_with_offset(0, years_ago=30))

    celebrations = get_upcoming_celebrations([user])

    assert len(celebrations) == 1
    assert celebrations[0]['type'] == 'birthday'
    assert celebrations[0]['days_until'] == 0
    assert celebrations[0]['user_id'] == 1
    assert 'years' not in celebrations[0]

def test_birthday_within_window_is_included():
    user = make_user(2, birth_date=date_with_offset(3, years_ago=25))

    celebrations = get_upcoming_celebrations([user])

    assert len(celebrations) == 1
    assert celebrations[0]['days_until'] == 3

def test_birthday_beyond_window_is_excluded():
    user = make_user(3, birth_date=date_with_offset(CELEBRATIONS_WINDOW_DAYS + 1, years_ago=25))

    celebrations = get_upcoming_celebrations([user])

    assert celebrations == []

def test_user_without_birth_date_or_join_date_is_excluded():
    user = make_user(4)

    celebrations = get_upcoming_celebrations([user])

    assert celebrations == []

def test_leap_year_birthday_does_not_crash():
    user = make_user(5, birth_date=date(1996, 2, 29))

    celebrations = get_upcoming_celebrations([user])

    assert isinstance(celebrations, list)


#? ==================== ANIVERSARIO LABORAL ====================

def test_anniversary_today_after_years_is_included():
    user = make_user(6, date_joined=datetime_with_offset(0, years_ago=2))

    celebrations = get_upcoming_celebrations([user])

    assert len(celebrations) == 1
    assert celebrations[0]['type'] == 'anniversary'
    assert celebrations[0]['days_until'] == 0
    assert celebrations[0]['years'] == 2

def test_anniversary_before_first_year_is_excluded():
    user = make_user(7, date_joined=datetime_with_offset(0, years_ago=0))

    celebrations = get_upcoming_celebrations([user])

    assert celebrations == []


#? ==================== COMBINADO / ORDEN ====================

def test_user_can_have_both_birthday_and_anniversary():
    user = make_user(
        8,
        birth_date=date_with_offset(1, years_ago=30),
        date_joined=datetime_with_offset(1, years_ago=1),
    )

    celebrations = get_upcoming_celebrations([user])

    types = {c['type'] for c in celebrations}
    assert types == {'birthday', 'anniversary'}

def test_results_are_sorted_by_days_until():
    user_far = make_user(9, birth_date=date_with_offset(5, years_ago=20))
    user_near = make_user(10, birth_date=date_with_offset(1, years_ago=20))

    celebrations = get_upcoming_celebrations([user_far, user_near])

    assert [c['user_id'] for c in celebrations] == [10, 9]
