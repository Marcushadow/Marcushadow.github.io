---
title: DistributedMacInference
description: Distributed LLM inference across multiple Mac machines using llama.cpp's RPC backend to pool Apple Silicon compute.
github: https://github.com/Marcushadow/DistributedMacInference
tags: [python, ml, distributed-systems, llm]
featured: true
permalink: /projects/distributed-mac-inference/
---

## Overview

A setup for running distributed large language model inference across multiple Mac machines. Built on top of [llama.cpp's RPC backend](https://github.com/ggml-org/llama.cpp/tree/master/examples/rpc), this project automates the installation and configuration needed to pool Apple Silicon compute from several Macs into a single inference cluster.

The idea is simple: one Mac isn't enough to run a large model efficiently, but a few Macs networked together can split the workload across their combined memory and compute.

## How It Works

The project uses llama.cpp's RPC (Remote Procedure Call) feature, which allows tensor operations to be offloaded to remote machines over the network. Each Mac in the cluster runs an RPC server, and the main node coordinates inference by distributing layer computations across all available machines.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Marcushadow/DistributedMacInference.git

# Make the setup script executable
chmod +x setup_llama.sh

# Run the installer
./install_llama.sh
```

## Tech Stack

- **Runtime:** llama.cpp (C/C++ with RPC backend)
- **Hardware:** Apple Silicon (M-series) Macs
- **Setup:** Bash scripts for automated installation
- **Protocol:** RPC for inter-machine tensor offloading

## What I Learned

This project taught me about the networking side of ML inference — how tensor operations can be serialized and sent over RPC, and how latency between machines affects throughput. I learned to work with llama.cpp's internals and gained an appreciation for how much optimization goes into making LLM inference fast. The practical lesson was that pooling consumer hardware can be a viable alternative to expensive cloud GPU instances for certain workloads.
