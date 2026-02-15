# Live Streaming the Mercury Build Log

Step-by-step guide to stream the live build log to YouTube via OBS.

---

## Part 1 — Start the Build Log Viewer

1. Open a terminal
2. Navigate to the viewer:
   ```
   cd D:\Projects\Mercury\tools\build-log-viewer
   ```
3. Install dependencies (first time only):
   ```
   npm install
   ```
4. Start the server:
   ```
   npm run dev
   ```
5. You should see:
   ```
   Build Log Viewer
   Watching: D:\Projects\Mercury\BUILD-LOG.md
   Server:   http://localhost:18800
   ```
6. Open `http://localhost:18800` in your browser to verify it works — you should see the full build log rendered in a dark theme with a green "Live" dot in the top right
7. **Leave this terminal running.** Don't close it. The server needs to stay alive for the entire stream.

---

## Part 2 — Set Up OBS Studio

### Install OBS (skip if already installed)

1. Go to https://obsproject.com
2. Download OBS Studio for Windows
3. Install it, launch it

### Create a New Scene

1. In the bottom-left panel labeled **Scenes**, click the **+** button
2. Name it `Mercury Build Log` (or whatever you want)
3. Click **OK**

### Add the Build Log Viewer as a Source

1. In the **Sources** panel (next to Scenes), click the **+** button
2. Select **Browser**
3. Name it `Build Log` and click **OK**
4. In the properties window that opens, set:
   - **URL:** `http://localhost:18800`
   - **Width:** `1920`
   - **Height:** `1080`
   - **Custom CSS:** leave empty (the page has its own styling)
   - **Shutdown source when not visible:** checked
   - **Refresh browser when scene becomes active:** checked
5. Click **OK**

### Resize to Fill the Screen

1. The browser source should now appear in the preview
2. Right-click on it in the preview → **Transform** → **Fit to screen**
3. Or just drag the red corner handles to resize it manually

### Optional: Add a Webcam

1. Click **+** in Sources
2. Select **Video Capture Device**
3. Name it `Webcam`, click **OK**
4. Select your webcam from the dropdown, click **OK**
5. Resize it to a small corner (drag the handles to make it small)
6. Drag it to the bottom-right corner
7. Right-click → **Order** → **Move to Top** (so it's above the build log)

### Optional: Add Audio

1. Click **+** in Sources
2. Select **Audio Output Capture** (captures your desktop audio — music, system sounds)
3. Click **OK**, select your audio device
4. Also add **Audio Input Capture** if you want your microphone

---

## Part 3 — Connect OBS to YouTube

### Get Your YouTube Stream Key

1. Go to https://studio.youtube.com
2. Click **Create** (top right, the camera icon with a +)
3. Select **Go live**
4. If this is your first time:
   - YouTube requires you to **enable live streaming** on your account
   - This can take **up to 24 hours** to activate
   - You need a verified account (phone number verification)
5. Once live streaming is enabled, you'll see the **YouTube Studio Live Dashboard**
6. On the left sidebar, click **Stream** (not "Webcam" or "Manage")
7. Fill in your stream details:
   - **Title:** whatever you want (e.g., "Building Mercury — Live")
   - **Description:** optional
   - **Category:** Science & Technology
   - **Visibility:** Public, Unlisted, or Private (your choice — Unlisted is good for testing)
   - **No, it's not made for kids**
8. Look for the **Stream key** section on the page — click **Copy** next to the stream key

### Configure OBS

1. In OBS, go to **Settings** (bottom-right button)
2. Click **Stream** in the left sidebar
3. Set:
   - **Service:** YouTube - RTMPS
   - **Server:** Primary YouTube ingest server (default)
   - **Stream Key:** paste the key you copied from YouTube
4. Click **Apply**

### Configure Output Quality

1. Still in Settings, click **Output** in the left sidebar
2. Set **Output Mode** to **Simple**
3. Set:
   - **Video Bitrate:** `2500` Kbps (good for 1080p text — doesn't need high bitrate since it's mostly static)
   - **Encoder:** use hardware encoder if available (NVENC, QuickSync), otherwise x264
   - **Audio Bitrate:** `128` (or `160`)
4. Click **Video** in the left sidebar
5. Set:
   - **Base (Canvas) Resolution:** `1920x1080`
   - **Output (Scaled) Resolution:** `1920x1080`
   - **FPS:** `30` (text doesn't need 60fps)
6. Click **Apply**, then **OK**

---

## Part 4 — Go Live

1. Make sure the build log viewer server is still running (check your terminal)
2. In OBS, verify your preview shows the build log correctly
3. Click **Start Streaming** (bottom-right in OBS)
4. Go back to YouTube Studio — you should see the stream preview appear after a few seconds
5. YouTube will show "Live" status once the stream is active

---

## Part 5 — The Actual Stream

### What Viewers See

- The full build log rendered in a dark terminal-style theme
- New entries appear in real-time as you work and commit
- Steve's quotes highlighted with gold borders
- Commit messages styled with gold accents

### How to Make Content Appear

Every change to `BUILD-LOG.md` shows up automatically. This happens when:

- **Claude writes to BUILD-LOG.md** during a session (new entries, decisions, progress)
- **Git commits** trigger the post-commit hook which appends to BUILD-LOG.md
- **You edit BUILD-LOG.md manually** in any editor

Just work normally. The log updates itself.

### Tips for a Good Stream

- **Keep a second monitor** with the stream preview so you can see what viewers see
- **Don't worry about gaps** — the log updates when there's something to update, silence is fine
- **The sensitive content filter** automatically strips any passwords, tokens, or API keys before they reach the browser — but don't put secrets in BUILD-LOG.md regardless

---

## Part 6 — End the Stream

1. In OBS, click **Stop Streaming**
2. Go back to YouTube Studio — the stream will end and become a video on your channel
3. In your terminal, press `Ctrl+C` to stop the build log viewer server

---

## Troubleshooting

### Build log viewer shows "Connecting..."

- Make sure the server is running (`npm run dev` in the terminal)
- Check that port 18800 isn't blocked by a firewall
- Try refreshing: right-click the Browser source in OBS → **Properties** → **Refresh cache of current page**

### OBS shows black screen for browser source

- Verify `http://localhost:18800` works in your regular browser first
- Try checking **Hardware Acceleration** in OBS browser source properties (toggle it on/off)
- Restart OBS after making changes

### YouTube says "No data" or stream isn't connecting

- Double-check the stream key (copy it fresh from YouTube Studio)
- Make sure you selected **YouTube - RTMPS** (not RTMP) in OBS settings
- Check your internet connection — YouTube needs a stable upload of at least 3 Mbps

### Changes to BUILD-LOG.md don't appear

- The watcher waits 300ms for the file write to finish before pushing updates
- If using git, the post-commit hook writes are detected automatically
- Try making a manual edit to the file and saving — it should appear within 1 second

### Stream is laggy or choppy

- Lower the bitrate to `1500` Kbps in OBS Output settings
- Make sure no other heavy applications are competing for bandwidth
- Text streaming doesn't need high bitrate — `2500` Kbps at 1080p30 is plenty

---

## Quick Reference

| What | Command / URL |
|------|---------------|
| Start viewer | `cd tools/build-log-viewer && npm run dev` |
| Viewer URL | `http://localhost:18800` |
| OBS Browser Source URL | `http://localhost:18800` |
| YouTube Studio | `https://studio.youtube.com` |
| Stop viewer | `Ctrl+C` in the terminal |
| Stop stream | Click "Stop Streaming" in OBS |
