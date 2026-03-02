import copy
import pytest
from fastapi.testclient import TestClient

from src import app as app_module

client = TestClient(app_module.app)

# keep a pristine copy of the in-memory activities so each test can start fresh
_original_activities = copy.deepcopy(app_module.activities)

@pytest.fixture(autouse=True)
def reset_activities():
    # restore activities dict before each test
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(_original_activities))
    yield
    # optionally clean up afterwards (not strictly necessary)
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(_original_activities))


def test_root_redirects_to_static_index():
    # disable automatic redirect following so we can inspect the response
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (301, 302, 307, 308)
    assert "/static/index.html" in resp.headers.get("location", "")


def test_get_activities_returns_all_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert resp.json() == _original_activities


def test_signup_success_adds_participant():
    activity = "Chess Club"
    email = "newstudent@mergington.edu"
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")
    assert email in app_module.activities[activity]["participants"]


def test_signup_nonexistent_activity_returns_404():
    resp = client.post("/activities/NotReal/signup?email=test@example.com")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Activity not found"


def test_signup_duplicate_email_returns_400():
    activity = "Chess Club"
    existing = app_module.activities[activity]["participants"][0]
    resp = client.post(f"/activities/{activity}/signup?email={existing}")
    assert resp.status_code == 400
    assert "already signed up" in resp.json()["detail"]


def test_signup_full_capacity_returns_400():
    # make an activity full
    activity = "Basketball Team"
    app_module.activities[activity]["participants"] = [f"user{i}@x.com" for i in range(app_module.activities[activity]["max_participants"])]
    resp = client.post(f"/activities/{activity}/signup?email=new@x.com")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Activity is at full capacity"


def test_email_normalization_on_signup():
    activity = "Chess Club"
    resp = client.post(f"/activities/{activity}/signup?email=  MIXED@Example.Com  ")
    assert resp.status_code == 200
    assert "mixed@example.com" in app_module.activities[activity]["participants"]


def test_remove_participant_success():
    activity = "Chess Club"
    to_remove = app_module.activities[activity]["participants"][0]
    resp = client.delete(f"/activities/{activity}/participants?email={to_remove}")
    assert resp.status_code == 200
    assert to_remove not in app_module.activities[activity]["participants"]


def test_remove_nonexistent_activity_returns_404():
    resp = client.delete("/activities/Nope/participants?email=test@x.com")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Activity not found"


def test_remove_nonexistent_participant_returns_404():
    activity = "Chess Club"
    resp = client.delete(f"/activities/{activity}/participants?email=not@there.com")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Participant not found"


def test_email_normalization_on_remove():
    activity = "Chess Club"
    existing = app_module.activities[activity]["participants"][0]
    mixed = "  " + existing.upper() + "  "
    resp = client.delete(f"/activities/{activity}/participants?email={mixed}")
    assert resp.status_code == 200
    assert existing not in app_module.activities[activity]["participants"]
