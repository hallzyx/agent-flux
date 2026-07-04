# Gemma on-device models

Place a Gemma `.task` (MediaPipe web) model here to enable auto-load without a
file picker. The `litert-community` HuggingFace repos are **gated** (downloads
return HTTP 401 without an authenticated token), so the reliable offline path is
to serve the model locally from this folder.

## Recommended model

`gemma3-270m-it-q4_0-web.task` (~small, fast, WebGPU) from
[litert-community/gemma-3-270m-it](https://huggingface.co/litert-community/gemma-3-270m-it).

## How to obtain it

1. Log in to HuggingFace and accept the Gemma license on the model page.
2. Download `gemma3-270m-it-q4_0-web.task`.
3. Drop it in this folder as `gemma3-270m-it-q4_0-web.task`.

The app auto-loads `/models/gemma3-270m-it-q4_0-web.task` by default. Override
with `NEXT_PUBLIC_GEMMA_MODEL_URL`, or authenticate an HF URL with
`NEXT_PUBLIC_HF_TOKEN`.

## No file? Use the UI

If no model is served here, the app stays on regex and shows a
**"Load Gemma model (.task)"** control when WebGPU is available — pick the file
from disk to run Gemma fully offline.

> Model files are large and gitignored; do not commit them.
