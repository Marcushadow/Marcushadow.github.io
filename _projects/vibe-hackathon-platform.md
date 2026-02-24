---
title: Vibe Hackathon Platform
description: A full-stack platform for running coding hackathons — spin up 1-100 cloud-based VS Code instances on AWS, each pre-configured with AI coding assistants.
github: https://github.com/marcuslowhuiyu/VibeHackathonPlatform
tags: [typescript, docker, aws, fullstack]
featured: true
permalink: /projects/vibe-hackathon-platform/
---

## Overview

A complete platform for running coding hackathons with cloud-based development environments. Organizers can spin up 1 to 100 isolated VS Code instances on AWS ECS, each pre-configured with AI coding assistants (Continue + AWS Bedrock with Claude). Participants just enter a 5-character access code and they're dropped into a fully ready IDE in their browser.

Built to remove the "setup your environment" friction from hackathons entirely.

## For Organizers (Admin Dashboard)

- **One-click AWS setup** — Automated infrastructure provisioning (VPC, ECS, ECR, security groups)
- **Bulk instance management** — Spin up 1-100 VS Code instances with a single click
- **Participant management** — Import from Excel/CSV, auto-generate login credentials
- **Orphaned instance scanner** — Find and clean up untracked AWS resources
- **Real-time monitoring** — Live instance status, CloudFront deployment progress, cost estimates
- **HTTPS by default** — Automatic CloudFront distribution for every instance

## For Participants

- Enter a 5-character access code on the landing page
- VS Code and a React dev server preview open automatically in new tabs
- No password, no setup, no installation — just start coding

## Each Instance Includes

- **VS Code Server** — Full IDE in the browser (port 8080)
- **React Dev Server** — Live preview of their app (port 3000)
- **Continue AI** — Pre-configured AI coding assistant powered by AWS Bedrock (Claude)
- **HTTPS** — Secured via CloudFront

## Architecture

The platform has two main surfaces: an admin dashboard for organizers and a participant entry page. Under the hood, each coding instance runs as an ECS Fargate task with its own CloudFront distribution for HTTPS access.

## Tech Stack

- **Frontend:** TypeScript (React)
- **Infrastructure:** AWS ECS Fargate, CloudFront, ECR, VPC
- **AI:** Continue extension + AWS Bedrock (Claude)
- **Containerization:** Docker
- **Deployment:** Automated via admin dashboard

## What I Learned

This project was a deep dive into AWS infrastructure automation. I learned how ECS Fargate, CloudFront, ECR, and VPC networking fit together to create isolated, scalable environments. Building the bulk instance management system taught me about handling concurrent AWS API calls, managing state across dozens of resources, and cleaning up gracefully when things go wrong. Integrating the Continue AI extension with Bedrock showed me how to pre-configure developer tools at the container level so participants get a zero-setup experience.
