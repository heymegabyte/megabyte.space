"""Unit tests for the Langfuse observability wiring."""

import importlib

import pytest


@pytest.fixture
def lf():
    """Fresh import of the module with its one-shot guard reset."""
    import interpreter.core.llm.langfuse_setup as module

    module = importlib.reload(module)
    module._configured = False
    return module


def _clear_keys(monkeypatch):
    for key in (
        "LANGFUSE_PUBLIC_KEY",
        "LANGFUSE_SECRET_KEY",
        "LANGFUSE_REDACT_IO",
        "LANGFUSE_HOST",
    ):
        monkeypatch.delenv(key, raising=False)


def test_disabled_without_keys(lf, monkeypatch):
    _clear_keys(monkeypatch)
    assert lf.langfuse_enabled() is False
    assert lf.configure_langfuse() is False
    assert lf.build_trace_metadata("gpt-4o", "sess-1") == {}


def test_enabled_with_keys(lf, monkeypatch):
    _clear_keys(monkeypatch)
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    assert lf.langfuse_enabled() is True


def test_metadata_shape(lf, monkeypatch):
    _clear_keys(monkeypatch)
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")

    meta = lf.build_trace_metadata("gpt-4o", "sess-1", version="0.4.3")

    assert meta["trace_name"] == "open-interpreter"
    assert meta["generation_name"] == "open-interpreter:gpt-4o"
    assert meta["session_id"] == "sess-1"
    assert meta["trace_version"] == "0.4.3"
    assert "open-interpreter" in meta["tags"]
    assert "gpt-4o" in meta["tags"]


def test_configure_is_idempotent(lf, monkeypatch):
    _clear_keys(monkeypatch)
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")

    litellm = pytest.importorskip("litellm")
    litellm.success_callback = []
    litellm.failure_callback = []

    # langfuse package may be absent in CI; configure returns False then and
    # leaves callbacks untouched. Only assert idempotency when it activates.
    if lf.configure_langfuse():
        assert litellm.success_callback.count("langfuse") == 1
        assert litellm.failure_callback.count("langfuse") == 1
        # Second call must not duplicate the callback.
        lf.configure_langfuse()
        assert litellm.success_callback.count("langfuse") == 1
