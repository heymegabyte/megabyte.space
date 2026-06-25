"""
Langfuse observability for Open Interpreter.

Open Interpreter routes every model call through LiteLLM, so the
best-practice integration is LiteLLM's native Langfuse callback rather than
hand-rolled spans. The callback automatically captures the model name, token
usage (and therefore cost), latency, and errors for each generation.

Tracing is OFF unless both `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are
present in the environment, so importing this module is always safe.

Environment variables
---------------------
- LANGFUSE_PUBLIC_KEY   (required to enable)  e.g. "pk-lf-..."
- LANGFUSE_SECRET_KEY   (required to enable)  e.g. "sk-lf-..."
- LANGFUSE_HOST         (optional)            defaults to https://cloud.langfuse.com
                                              (use https://us.cloud.langfuse.com for US,
                                               or your self-hosted URL)
- LANGFUSE_REDACT_IO    (optional)            "1"/"true" masks all prompt and
                                              completion content before it leaves
                                              the machine. Open Interpreter can see
                                              sensitive local data, so set this when
                                              traces must not contain message bodies.

Docs: https://langfuse.com/docs/integrations/litellm
"""

import logging
import os

logger = logging.getLogger("LiteLLM")

# Reserved-ish callback marker LiteLLM understands.
_LANGFUSE_CALLBACK = "langfuse"

# Module-level guard so we only mutate LiteLLM's global callback lists once,
# even though Llm() may be instantiated many times in one process.
_configured = False


def langfuse_enabled():
    """True when both Langfuse keys are present in the environment."""
    return bool(
        os.environ.get("LANGFUSE_PUBLIC_KEY")
        and os.environ.get("LANGFUSE_SECRET_KEY")
    )


def _truthy(value):
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def configure_langfuse():
    """
    Wire LiteLLM's Langfuse success/failure callbacks, idempotently.

    Returns True if Langfuse tracing is active after this call, False otherwise.
    Safe to call repeatedly and safe to call when keys are absent.
    """
    global _configured

    if not langfuse_enabled():
        return False

    if _configured:
        return True

    try:
        import litellm
    except Exception:  # pragma: no cover - litellm is a hard dependency
        return False

    # The `langfuse` package must be importable for the callback to emit traces.
    # Fail soft with a one-line hint instead of crashing the interpreter.
    try:
        import langfuse  # noqa: F401
    except Exception:
        logger.warning(
            "Langfuse keys detected but the `langfuse` package is not installed. "
            "Run `pip install langfuse` to enable tracing."
        )
        return False

    def _add(attr):
        existing = getattr(litellm, attr, None) or []
        if _LANGFUSE_CALLBACK not in existing:
            existing.append(_LANGFUSE_CALLBACK)
        setattr(litellm, attr, existing)

    _add("success_callback")
    _add("failure_callback")

    # Privacy switch: redact all prompt/completion bodies across callbacks.
    if _truthy(os.environ.get("LANGFUSE_REDACT_IO", "")):
        litellm.turn_off_message_logging = True

    _configured = True
    logger.info(
        "Langfuse tracing enabled via LiteLLM callback (host: %s).",
        os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com"),
    )
    return True


def build_trace_metadata(model, session_id, version=None, extra_tags=None):
    """
    Build the per-request `metadata` dict the LiteLLM Langfuse callback reads.

    Only keys the callback recognizes are set; anything else would silently
    become generation metadata. See the LiteLLM Langfuse docs for the reserved
    key list.

    Args:
        model:      the model string for this call (used in name + tags).
        session_id: groups all calls from one interpreter conversation.
        version:    optional app/version string (e.g. Open Interpreter version).
        extra_tags: optional iterable of additional tags.

    Returns:
        A metadata dict, or {} when tracing is disabled.
    """
    if not langfuse_enabled():
        return {}

    tags = ["open-interpreter"]
    if model:
        tags.append(str(model))
    if extra_tags:
        tags.extend(str(t) for t in extra_tags)

    metadata = {
        "trace_name": "open-interpreter",
        "generation_name": f"open-interpreter:{model}" if model else "open-interpreter",
        "tags": tags,
    }
    if session_id:
        metadata["session_id"] = str(session_id)
    if version:
        metadata["trace_version"] = str(version)

    return metadata
