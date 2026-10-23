// Publicly known P-256 scalar 1 / generator point: test-only, never a deployment key.
export const vapid={
 publicKey:Buffer.from('04'+'6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'+'4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5','hex').toString('base64url'),
 privateKey:Buffer.from('00'.repeat(31)+'01','hex').toString('base64url'),
};
