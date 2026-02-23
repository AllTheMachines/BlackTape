/**
 * QR code generation for Mercury embed URLs and collection URLs.
 * Uses qrcode npm package for SVG output — no canvas dependency.
 * Only called client-side (lazy import to avoid SSR issues).
 */

export async function generateQrSvg(url: string, dark = false): Promise<string> {
	// Dynamic import to avoid SSR bundling issues
	const QRCode = (await import('qrcode')).default;
	return QRCode.toString(url, {
		type: 'svg',
		margin: 2,
		color: {
			dark: dark ? '#ffffff' : '#000000',
			light: dark ? '#1a1a1a' : '#ffffff',
		},
	});
}
