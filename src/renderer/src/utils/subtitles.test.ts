import { describe, expect, it } from 'vitest'
import { srtToVtt } from './subtitles'

const SRT = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,500 --> 00:00:07,250
Second line`

describe('srtToVtt', () => {
  it('adds a WEBVTT header', () => {
    expect(srtToVtt(SRT).startsWith('WEBVTT\n\n')).toBe(true)
  })

  it('converts comma timestamps to dots', () => {
    const vtt = srtToVtt(SRT)
    expect(vtt).toContain('00:00:01.000 --> 00:00:04.000')
    expect(vtt).toContain('00:00:05.500 --> 00:00:07.250')
    expect(vtt).not.toContain(',000')
  })

  it('normalizes Windows line endings and BOM', () => {
    const vtt = srtToVtt('﻿1\r\n00:00:01,000 --> 00:00:02,000\r\nHi')
    expect(vtt).toContain('00:00:01.000 --> 00:00:02.000\nHi')
    expect(vtt.includes('﻿')).toBe(false)
  })

  it('passes through existing WebVTT unchanged', () => {
    const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n'
    expect(srtToVtt(vtt)).toBe(vtt)
  })
})
