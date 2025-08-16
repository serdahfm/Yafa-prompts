import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({})

export async function getSecretString(secretId: string): Promise<string | null> {
  try {
    const out = await client.send(new GetSecretValueCommand({ SecretId: secretId }))
    return out.SecretString ?? null
  } catch (e) {
    return null
  }
}



