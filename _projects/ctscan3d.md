---
title: Pulmonary Embolism Detection (CT Scan 3D)
description: Detecting pulmonary embolism in 3D CT scans using deep learning — comparing 3D CNNs, ViT-LSTM, and CNN-LSTM architectures.
github: https://github.com/Marcushadow/CT-Scan-3D-Binary-Classification
tags: [python, deep-learning, medical-imaging, aws]
featured: true
permalink: /projects/ctscan3d/
---

## Overview

A deep learning project for detecting pulmonary embolism (PE) in 3D CT scans. The core challenge is effectively modeling volumetric medical data — a CT scan is a stack of 2D slices forming a 3D volume, and the model needs to learn spatial patterns across all dimensions.

Multiple architectures were implemented and compared to find the best approach for this binary classification task.

## Architecture Search

Three different approaches were explored:

- **3D CNNs** — Process the volume directly using 3D convolutions. Conceptually straightforward but data-hungry and expensive to train.
- **ViT-LSTM** — Vision Transformers for spatial features combined with LSTMs for cross-slice temporal dependencies.
- **CNN-LSTM (Best)** — Treats the 3D volume as a sequence of 2D slices. Uses **EfficientNet-B0** (pretrained) to extract features from each slice, then a **bidirectional LSTM** to aggregate across the scan's depth.

The CNN-LSTM approach performed best, likely because transfer learning on 2D slices is more data-efficient than training 3D models from scratch on a limited dataset.

## Dataset

- **Source:** Private S3 bucket (`rsna-pulmonary-embolism`), based on RSNA competition data
- **Format:** 3D CT volumes processed via MONAI
- **Preprocessing:** Slice extraction, normalization, and augmentation

## Training Infrastructure

The project supports two training workflows:

- **Local training** — For development, debugging, and quick iteration
- **AWS SageMaker** — For large-scale runs using `ml.p3.2xlarge` GPU instances with FastFile mode (streams data directly from S3)

## Results

The CNN-LSTM achieved **70% validation accuracy** on a data subset. While modest, this was with limited data — additional data was still being processed at the time due to long preprocessing pipelines.

## Tech Stack

- **Language:** Python
- **Framework:** PyTorch, MONAI, Timm (EfficientNet-B0)
- **Infrastructure:** AWS SageMaker, S3
- **Models:** 3D CNN, ViT-LSTM, CNN-LSTM (bidirectional)

## What I Learned

*Reflect on what you learned building this project.*
