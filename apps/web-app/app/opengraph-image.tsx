import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Split-It — Free Bill Splitter App for Friends & Groups';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1B998B 0%, #0e6b61 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background circle blobs */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 28,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 36,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ color: 'white', fontSize: 52, fontWeight: 900, lineHeight: 1 }}>S</span>
        </div>

        {/* App name */}
        <div
          style={{
            color: 'white',
            fontSize: 72,
            fontWeight: 900,
            margin: 0,
            marginBottom: 20,
            letterSpacing: '-2px',
            display: 'flex',
          }}
        >
          Split-It
        </div>

        {/* Tagline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.88)',
            fontSize: 30,
            margin: 0,
            marginBottom: 12,
            textAlign: 'center',
            maxWidth: 760,
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          Free bill splitter app for friends &amp; groups
        </div>

        {/* Sub-label */}
        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 22,
            marginTop: 8,
            display: 'flex',
            gap: 28,
          }}
        >
          <span>No ads</span>
          <span>·</span>
          <span>No subscriptions</span>
          <span>·</span>
          <span>Forever free</span>
        </div>

        {/* Domain badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 56,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 20,
            display: 'flex',
          }}
        >
          split-it.xyz
        </div>
      </div>
    ),
    { ...size }
  );
}
