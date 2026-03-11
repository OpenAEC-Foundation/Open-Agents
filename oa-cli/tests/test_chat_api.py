"""Tests for the /api/chat endpoints in bridge.py (issue #63).

Covers:
- GET /api/chat/models — lists Claude + Ollama models
- POST /api/chat — non-streaming completion
- POST /api/chat/stream — SSE streaming
"""

from __future__ import annotations

import json
import pytest


@pytest.fixture()
def bridge(monkeypatch):
    """Flask test client for bridge app with isolated state."""
    import open_agents.state as state_module
    import open_agents.bridge as bridge_module

    # Prevent actual network/tmux calls in bridge startup.
    monkeypatch.setattr(bridge_module, "_kill_port", lambda port: None, raising=False)

    from open_agents.bridge import app
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client, monkeypatch


class TestChatModels:
    def test_returns_list(self, bridge):
        client, monkeypatch = bridge
        # No API key, no Ollama — expect empty list.
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

        resp = client.get("/api/chat/models")
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)

    def test_includes_claude_when_api_key_set(self, bridge):
        client, monkeypatch = bridge
        monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key")

        resp = client.get("/api/chat/models")
        models = resp.get_json()
        claude_ids = [m["id"] for m in models if m["provider"] == "claude"]
        assert len(claude_ids) >= 1, "Expected at least one claude model"

    def test_claude_models_have_required_fields(self, bridge):
        client, monkeypatch = bridge
        monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key")

        resp = client.get("/api/chat/models")
        for m in resp.get_json():
            if m["provider"] == "claude":
                assert "id" in m
                assert "provider" in m
                assert "name" in m
                assert m["id"].startswith("claude/")


class TestChatComplete:
    def test_missing_messages_returns_400(self, bridge):
        client, _ = bridge
        resp = client.post("/api/chat", json={})
        assert resp.status_code == 400
        assert "error" in resp.get_json()

    def test_ollama_success(self, bridge):
        client, monkeypatch = bridge

        # Mock _stream_ollama to return a simple response.
        import open_agents.bridge as bridge_module
        monkeypatch.setattr(bridge_module, "_stream_ollama", lambda model, msgs, sys: iter(["Hello!"]))

        resp = client.post("/api/chat", json={
            "model": "ollama/llama3.2",
            "messages": [{"role": "user", "content": "Hi"}],
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["content"] == "Hello!"
        assert data["role"] == "assistant"
        assert "model" in data

    def test_claude_success(self, bridge):
        client, monkeypatch = bridge
        import open_agents.bridge as bridge_module
        monkeypatch.setattr(bridge_module, "_stream_claude", lambda model, msgs, sys: iter(["Hi from Claude"]))

        resp = client.post("/api/chat", json={
            "model": "claude/claude-sonnet-4-6",
            "messages": [{"role": "user", "content": "Hello"}],
        })
        assert resp.status_code == 200
        assert resp.get_json()["content"] == "Hi from Claude"

    def test_unknown_provider_returns_500(self, bridge):
        client, _ = bridge
        resp = client.post("/api/chat", json={
            "model": "openai/gpt-4",
            "messages": [{"role": "user", "content": "Hi"}],
        })
        assert resp.status_code == 500
        assert "Unknown model prefix" in resp.get_json()["error"]

    def test_multi_chunk_concatenation(self, bridge):
        client, monkeypatch = bridge
        import open_agents.bridge as bridge_module
        monkeypatch.setattr(bridge_module, "_stream_ollama",
                            lambda model, msgs, sys: iter(["Hello", " ", "World!"]))

        resp = client.post("/api/chat", json={
            "model": "ollama/llama3.2",
            "messages": [{"role": "user", "content": "Hi"}],
        })
        assert resp.get_json()["content"] == "Hello World!"


class TestChatStream:
    def test_missing_messages_returns_400(self, bridge):
        client, _ = bridge
        resp = client.post("/api/chat/stream", json={})
        assert resp.status_code == 400

    def test_streams_sse_events(self, bridge):
        client, monkeypatch = bridge
        import open_agents.bridge as bridge_module
        monkeypatch.setattr(bridge_module, "_stream_ollama",
                            lambda model, msgs, sys: iter(["chunk1", "chunk2"]))

        resp = client.post("/api/chat/stream", json={
            "model": "ollama/llama3.2",
            "messages": [{"role": "user", "content": "Hi"}],
        })
        assert resp.status_code == 200
        assert "text/event-stream" in resp.content_type

        # Parse SSE events.
        events = []
        for line in resp.data.decode().splitlines():
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))

        deltas = [e["delta"] for e in events if "delta" in e]
        done_events = [e for e in events if e.get("done")]

        assert deltas == ["chunk1", "chunk2"]
        assert len(done_events) == 1

    def test_stream_error_sends_error_event(self, bridge):
        client, monkeypatch = bridge
        import open_agents.bridge as bridge_module

        def raise_error(model, msgs, sys):
            raise RuntimeError("Ollama down")
            yield  # make it a generator

        monkeypatch.setattr(bridge_module, "_stream_ollama", raise_error)

        resp = client.post("/api/chat/stream", json={
            "model": "ollama/llama3.2",
            "messages": [{"role": "user", "content": "Hi"}],
        })
        # SSE responses always return 200 (stream was opened).
        assert resp.status_code == 200

        events = []
        for line in resp.data.decode().splitlines():
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))

        error_events = [e for e in events if "error" in e]
        assert len(error_events) == 1
        assert "Ollama down" in error_events[0]["error"]


class TestStreamHelpers:
    """Unit tests for _stream_claude and _stream_ollama dispatch."""

    def test_dispatch_to_claude(self, bridge):
        _, monkeypatch = bridge
        import open_agents.bridge as bridge_module
        called = []
        monkeypatch.setattr(bridge_module, "_stream_claude",
                            lambda m, msgs, sys: called.append(m) or iter([]))
        list(bridge_module._chat_stream("claude/sonnet", [], ""))
        assert called == ["sonnet"]

    def test_dispatch_to_ollama(self, bridge):
        _, monkeypatch = bridge
        import open_agents.bridge as bridge_module
        called = []
        monkeypatch.setattr(bridge_module, "_stream_ollama",
                            lambda m, msgs, sys: called.append(m) or iter([]))
        list(bridge_module._chat_stream("ollama/llama3.2", [], ""))
        assert called == ["llama3.2"]

    def test_unknown_prefix_raises(self, bridge):
        _, _ = bridge
        import open_agents.bridge as bridge_module
        with pytest.raises(RuntimeError, match="Unknown model prefix"):
            list(bridge_module._chat_stream("openai/gpt-4", [], ""))
