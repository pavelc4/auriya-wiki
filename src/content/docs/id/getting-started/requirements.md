---
title: "Persyaratan Sistem"
---
Sebelum menginstal Auriya, pastikan perangkat Anda memenuhi persyaratan berikut:

## Persyaratan Perangkat Keras & Perangkat Lunak

1. **Arsitektur CPU**: `arm64` (aarch64). Auriya hanya dikompilasi untuk Android 64-bit.
2. **Versi Android**: Android 11 ke atas (`minSdk = 30`).
3. **Akses Root**:
   - Magisk v24+
   - KernelSU v0.6+
   - APatch v10.7+
4. **Kernel Linux**:
   - Kernel 4.19+ untuk fungsionalitas dasar dan telemetri FPS berbasis sysfs.
   - Kernel 5.8+ (direkomendasikan 5.10+) dengan dukungan uprobe dan BPF ring-buffer untuk Frame-Aware Scheduling (FAS) berbasis eBPF Kala.

## Kompatibilitas SoC / Chipset

- **Snapdragon (Qualcomm)**: Didukung penuh (hook KGSL, memlat, dan cpufreq).
- **MediaTek**: Didukung penuh (hook PPM, FPSGO, dan perfmgr).
- **Chipset Lain (Exynos, Tensor, Unisoc)**: Fungsionalitas dasar governor CPU, memori, dan scheduler didukung; fitur khusus vendor dinonaktifkan secara otomatis.
