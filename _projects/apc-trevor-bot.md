---
title: APCTrevorBot
description: A voice-enabled AI assistant combining ASR, RAG pipelines, and AWS Bedrock for intelligent knowledge-base Q&A.
github: https://github.com/Marcushadow/APCTrevorBot
tags: [python, typescript, ai, aws]
featured: false
permalink: /projects/apc-trevor-bot/
---

## Overview

APCTrevorBot is an AI-powered assistant that combines automatic speech recognition (ASR) with retrieval-augmented generation (RAG) to answer questions from a knowledge base. It supports multiple backend configurations: a fully local RAG pipeline, a hybrid local-RAG-with-AWS-Bedrock setup, and a full AWS Knowledge Base integration.

The project features a web frontend built with TypeScript for user interaction, while the core AI pipeline runs on Python with PyTorch for speech-to-text processing.

## Architecture

The system offers three server modes depending on the use case:

- **Full Local RAG** (`server.py`) — Runs the entire retrieval and generation pipeline locally, no cloud dependencies
- **Local RAG + AWS Bedrock** (`aws_local_server.py`) — Uses local document retrieval with AWS Bedrock for LLM generation
- **AWS Knowledge Base + Bedrock** (`aws_kb_server.py`) — Fully cloud-based, leveraging AWS's managed knowledge base service

## Tech Stack

- **Backend:** Python (PyTorch, speech recognition, RAG pipeline)
- **Frontend:** TypeScript, JavaScript, HTML/CSS
- **AI Services:** AWS Bedrock, local LLM inference
- **Speech:** FFmpeg for audio processing, ASR models via PyTorch
- **Environment:** Conda (Python 3.12)

## What I Learned

Building APCTrevorBot gave me hands-on experience wiring together multiple AI services into a single coherent pipeline. Working with ASR models taught me about audio preprocessing and the quirks of real-time speech-to-text. Setting up the RAG pipeline — both locally and with AWS Bedrock — showed me the tradeoffs between latency, cost, and answer quality when choosing between local and cloud-based inference. The TypeScript frontend was a good exercise in building a responsive UI that handles streaming AI responses gracefully.
