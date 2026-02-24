---
title: BCA Detect Project
description: Breast cancer detection using CNNs and computer vision on cytology slide data from the GDC, in collaboration with NUS researchers.
github: https://github.com/Marcushadow/BCADetectProject
tags: [python, ml, jupyter, medical-imaging]
featured: true
permalink: /projects/bca-detect-project/
---

## Overview

A collaboration with SG Code Campus and NUS researchers to explore the use of convolutional neural networks for breast cancer detection. The project applies computer vision techniques to cytology slide images, working with real clinical data from the Genomic Data Commons (GDC) managed by the National Cancer Institute.

The aim is to support ongoing research into how machine learning can assist in medical cancer studies, starting with automated analysis of breast cancer tissue samples.

## Dataset

The project uses data from the **BRCA project** hosted on the [Genomic Data Commons (GDC)](https://portal.gdc.cancer.gov/). The raw data comes as zoomable whole-slide images (`.svs` format) which need to be converted to standard image formats (JPEG/PNG) before they can be fed into neural networks.

A custom data processing pipeline handles the conversion and tiling of these high-resolution pathology slides into model-ready inputs.

## Approach

- Whole-slide images (`.svs`) converted and tiled into standard image patches
- CNN-based classification pipeline built in Jupyter notebooks
- Models trained on labeled cytology data to distinguish cancerous vs. normal tissue
- Iterative experimentation with different architectures and hyperparameters

## Tech Stack

- **Language:** Python
- **Environment:** Jupyter Notebooks
- **Key Libraries:** PyTorch/TensorFlow, OpenSlide (for `.svs` processing), NumPy, Matplotlib
- **Data Source:** NCI Genomic Data Commons (GDC)

## What I Learned

*Reflect on what you learned building this project.*
