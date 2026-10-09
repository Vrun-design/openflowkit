// Every aws icon's URL; loaded as one module on first use (providerIconUrls.ts).
export default import.meta.glob<string>('../../../../assets/third-party-icons/aws/processed/**/*.svg', { query: '?url', import: 'default', eager: true });
