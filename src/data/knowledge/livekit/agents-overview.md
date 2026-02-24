# LiveKit Agents Framework

Realtime framework for voice, video, and physical AI agents.

## Overview

The Agents framework lets you add any Python or Node.js program to LiveKit rooms as full realtime participants. The framework provides tools and abstractions for feeding realtime media and data through an AI pipeline that works with any provider, and publishing realtime results back to the room.

## Use Cases
- Robotics: Cloud-based robot brains with access to powerful models
- NPCs: Lifelike NPCs backed by language models
- Realtime translation
- Call center: AI customer service with inbound/outbound call support
- Telehealth: AI in realtime telemedicine consultations
- Multimodal assistant: Talk, text, or screen share with AI

## Framework Features
- Open source (Apache 2.0)
- Production ready: agent server orchestration, load balancing, Kubernetes compatibility
- State-of-the-art turn detection for lifelike conversation flow
- Extensive integrations with LLM, STT, TTS providers
- Multi-agent handoff for complex workflows
- Tool use compatible with any LLM, including frontend tool calls
- Voice, video, and text multimodality

## How Agents Connect
Agent code registers with a LiveKit server as an "agent server" process. It waits for dispatch requests, then boots a "job" subprocess which joins the room. Communication uses LiveKit WebRTC for reliable, fast realtime communication. Full telephony support via SIP.

## Key Concepts
- **Multimodality**: Speech/audio, text/transcriptions, and vision
- **Agent Sessions**: Stateful sessions managing agent lifecycle
- **Pipeline**: STT-LLM-TTS pipeline with streaming, turn detection, interruption handling
- **Tools**: LLM-compatible tool definitions, frontend tool forwarding
- **Agent Server**: Manages dispatch, job execution, scaling, load balancing
- **Models**: LLMs, STT, TTS, realtime APIs, virtual avatars via plugins

## Voice Pipeline (STT-LLM-TTS)
Default recommended stack:
- STT: Deepgram Nova-3
- LLM: OpenAI GPT-4.1 mini
- TTS: Cartesia Sonic-3

Alternative: OpenAI Realtime API for direct speech-to-speech.

## Python Agent Example
```python
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

class Assistant(Agent):
    def __init__(self):
        super().__init__(instructions="You are a helpful voice AI assistant.")

server = AgentServer()

@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx):
    session = AgentSession(
        stt="deepgram/nova-3:multi",
        llm="openai/gpt-4.1-mini",
        tts="cartesia/sonic-3",
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )
    await session.start(room=ctx.room, agent=Assistant())
    await session.generate_reply(instructions="Greet the user.")
```

## Deployment
- LiveKit Cloud: managed deployment with observability, transcripts, traces
- Custom environments with Docker/Kubernetes
- CLI: `lk agent create` for cloud deployment
