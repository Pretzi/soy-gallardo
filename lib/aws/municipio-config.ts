import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from './dynamo';
import {
  type MunicipioConfig,
  DEFAULT_MUNICIPIO_CONFIG,
  mergeMunicipioConfig,
} from '../municipio-config';

const CONFIG_PK = 'CONFIG#MUNICIPIO';
const CONFIG_SK = 'METADATA';

export async function getMunicipioConfig(): Promise<MunicipioConfig> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: CONFIG_PK, SK: CONFIG_SK },
      })
    );

    if (!result.Item) return DEFAULT_MUNICIPIO_CONFIG;

    const { PK, SK, updatedAt, ...config } = result.Item;
    return mergeMunicipioConfig(config as Partial<MunicipioConfig>);
  } catch (error) {
    console.error('Error loading municipio config:', error);
    return DEFAULT_MUNICIPIO_CONFIG;
  }
}

export async function saveMunicipioConfig(config: MunicipioConfig): Promise<MunicipioConfig> {
  const merged = mergeMunicipioConfig(config);
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: CONFIG_PK,
        SK: CONFIG_SK,
        ...merged,
        updatedAt: now,
      },
    })
  );

  return merged;
}
