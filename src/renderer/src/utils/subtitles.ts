/**
 * Convert SubRip (.srt) subtitle text to WebVTT so it can be used in a
 * <track> element. Handles BOMs, Windows line endings and comma timestamps.
 * Already-VTT input is passed through unchanged.
 */
export function srtToVtt(input: string): string {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  if (/^WEBVTT/.test(text.trimStart())) return text
  const converted = text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
  return `WEBVTT\n\n${converted.trim()}\n`
}
