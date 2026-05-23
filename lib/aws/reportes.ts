import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from './dynamo';

export type ReporteEstado = 'pendiente' | 'en_proceso' | 'resuelto' | 'cancelado';

export type Reporte = {
  id: string;
  folio: string;
  /** @deprecated Legacy field — use categoria/subcategoria for new reportes */
  tipo?: string;
  categoria?: string;
  subcategoria?: string;
  descripcion: string;
  nombre: string;
  telefono?: string;
  email?: string;
  calle: string;
  colonia?: string;
  referencia?: string;
  estado: ReporteEstado;
  fotosUrls: string[];
  fotosS3Keys: string[];
  notasAdmin?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReporteCreate = Omit<Reporte, 'id' | 'folio' | 'estado' | 'createdAt' | 'updatedAt'>;
export type ReporteUpdate = Partial<Pick<Reporte, 'estado' | 'notasAdmin'>>;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateFolio(): string {
  // REP- followed by 6 base-36 chars
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = 'REP-';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result.toUpperCase();
}

export async function createReporte(data: ReporteCreate): Promise<Reporte> {
  const id = generateId();
  const folio = generateFolio();
  const now = new Date().toISOString();

  const reporte: Reporte = {
    ...data,
    id,
    folio,
    estado: 'pendiente',
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `REPORTE#${id}`,
        SK: 'METADATA',
        ...reporte,
      },
    })
  );

  return reporte;
}

export async function getReporte(id: string): Promise<Reporte | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `REPORTE#${id}`,
        SK: 'METADATA',
      },
    })
  );

  if (!result.Item) return null;

  const { PK, SK, ...reporte } = result.Item;
  return reporte as Reporte;
}

export async function updateReporte(id: string, data: ReporteUpdate): Promise<Reporte | null> {
  const existing = await getReporte(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: Reporte = { ...existing, ...data, updatedAt: now };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `REPORTE#${id}`,
        SK: 'METADATA',
        ...updated,
      },
    })
  );

  return updated;
}

export async function getReporteByFolio(folio: string): Promise<Reporte | null> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND folio = :folio',
      ExpressionAttributeValues: { ':prefix': 'REPORTE#', ':folio': folio.toUpperCase() },
    })
  );

  if (!result.Items || result.Items.length === 0) return null;
  const { PK, SK, ...reporte } = result.Items[0];
  return reporte as Reporte;
}

export async function listReportes(options?: {
  tipo?: string;
  categoria?: string;
  estado?: string;
}): Promise<Reporte[]> {
  const allItems: Reporte[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const filterParts: string[] = ['begins_with(PK, :prefix)'];
    const exprValues: Record<string, unknown> = { ':prefix': 'REPORTE#' };

    if (options?.categoria) {
      filterParts.push('categoria = :categoria');
      exprValues[':categoria'] = options.categoria;
    } else if (options?.tipo) {
      filterParts.push('tipo = :tipo');
      exprValues[':tipo'] = options.tipo;
    }
    if (options?.estado) {
      filterParts.push('estado = :estado');
      exprValues[':estado'] = options.estado;
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterParts.join(' AND '),
        ExpressionAttributeValues: exprValues,
        ExclusiveStartKey: lastKey,
      })
    );

    if (result.Items) {
      for (const item of result.Items) {
        const { PK, SK, ...reporte } = item;
        allItems.push(reporte as Reporte);
      }
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // Sort by createdAt descending
  allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return allItems;
}
