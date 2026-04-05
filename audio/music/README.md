# Music Assets

Drop MP3 files here. The music player reads `data/audio/tracks.json` for the
manifest and resolves file paths relative to the site root.

## Expected filenames

- theme-main.mp3
- theme-dashboard.mp3
- faction-terran.mp3
- faction-shards.mp3
- faction-horde.mp3
- faction-revenant.mp3
- faction-accord.mp3
- faction-vorax.mp3
- faction-guardians.mp3

## Format requirements

- **Codec:** MP3
- **Bitrate:** 128-192 kbps recommended
- **Channels:** Stereo
- **Loudness:** Around -14 LUFS integrated (matches streaming platform targets)

## Looping

Tracks should loop cleanly -- the player sets `audio.loop = true` by default.
The manifest supports `loopStart` and `loopEnd` (in seconds) for mid-track loop
points. Set `loopEnd` to `null` for full-track looping.

## Naming convention

Lowercase, hyphenated. Match the track ID in `tracks.json` with an `.mp3`
extension. Examples: `faction-terran.mp3`, `theme-main.mp3`.
