# Soy Gallardo - Sistema de Registro de Entradas

Sistema web completo para registrar entradas de ciudadanos con INE y selfie, construido con Next.js, AWS (DynamoDB, S3) y OpenAI.

## 🚀 Características

- **Análisis automático de INE**: Extracción de datos usando OpenAI GPT-4 Vision
- **Procesamiento de selfies**: Colocación sobre fondo blanco limpio
- **Gestión completa de entradas**: Crear, editar, ver y buscar registros
- **Generación de PDFs**: Plantillas con datos del formulario e imagen
- **Búsqueda avanzada**: Por folio o nombre completo
- **Almacenamiento en la nube**: DynamoDB para datos, S3 para imágenes

## 📋 Requisitos Previos

- Node.js 20.9.0 o superior
- Cuenta de AWS con acceso a DynamoDB y S3
- API Key de OpenAI (para análisis de INE con Vision API)
- npm o yarn

## 🛠️ Instalación

1. **Clonar el repositorio** (o usar el existente)

```bash
cd /path/to/soy-gallardo
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# OpenAI Configuration (for INE parsing with Vision API)
OPENAI_API_KEY=sk-your-openai-api-key-here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# DynamoDB Configuration
DYNAMO_TABLE_NAME=PRETZI_ENTRIES

# S3 Configuration
S3_BUCKET_NAME=pretzi-entries-selfies
S3_PUBLIC_BASE_URL=https://pretzi-entries-selfies.s3.amazonaws.com

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗄️ Configuración de AWS

### DynamoDB

Crea una tabla con la siguiente configuración:

- **Nombre de tabla**: `PRETZI_ENTRIES`
- **Partition Key (PK)**: String
- **Sort Key (SK)**: String

**Índices Secundarios Globales (GSI)**:

1. **GSI1** (para búsqueda por folio):
   - Partition Key: `GSI1PK` (String)
   - Sort Key: `SK` (String)
   
2. **GSI2** (para búsqueda por nombre):
   - Partition Key: `GSI2PK` (String)
   - Sort Key: `SK` (String)

**Comando CLI de AWS** (opcional):

```bash
aws dynamodb create-table \
  --table-name PRETZI_ENTRIES \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"GSI1\",
        \"KeySchema\": [{\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"SK\",\"KeyType\":\"RANGE\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"},
        \"ProvisionedThroughput\": {\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}
      },
      {
        \"IndexName\": \"GSI2\",
        \"KeySchema\": [{\"AttributeName\":\"GSI2PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"SK\",\"KeyType\":\"RANGE\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"},
        \"ProvisionedThroughput\": {\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}
      }
    ]" \
  --billing-mode PAY_PER_REQUEST
```

### S3

Crea un bucket de S3:

```bash
aws s3 mb s3://pretzi-entries-selfies
```

**Configuración de permisos** (opcional - para acceso público):

```bash
aws s3api put-bucket-acl --bucket pretzi-entries-selfies --acl public-read
```

O configura una política de bucket que permita lecturas públicas.

## 📊 Preparar Datos CSV

Coloca los siguientes archivos CSV en la carpeta `data/`:

- `entries-1.csv` - Primer conjunto de entradas
- `entries-2.csv` - Segundo conjunto de entradas
- `colonia-comunidad.csv` - Lista de localidades
- `secciones.csv` - Lista de secciones electorales

### Formato de CSV de Entradas

Los archivos `entries-1.csv` y `entries-2.csv` deben tener las siguientes columnas:

```csv
folio,nombre,segundoNombre,apellidos,telefono,metodoContacto,fechaNacimiento,seccionElectoral,zona,notasApoyos,localidad
```

**Ejemplo**:
```csv
folio,nombre,segundoNombre,apellidos,telefono,metodoContacto,fechaNacimiento,seccionElectoral,zona,localidad,notasApoyos
12345,Juan,Carlos,Pérez García,5551234567,telefono,1985-03-15,1001,Norte,Ciudad de México,Apoyo confirmado
```

### Formato de colonia-comunidad.csv

```csv
localidad
Ciudad de México
Guadalajara
Monterrey
```

### Formato de secciones.csv

```csv
seccion
1001
1002
1003
```

**Nota**: Ajusta los nombres de las columnas según tus archivos CSV. El script de seed intentará mapear automáticamente variaciones comunes de nombres de columnas.

## 🌱 Importar Datos Iniciales (Seed)

Una vez configurados AWS y los archivos CSV:

```bash
npm run seed
```

Este comando:
1. Lee los archivos CSV de la carpeta `data/`
2. Valida y mapea los datos al esquema de DynamoDB
3. Importa los registros en lotes (batch write)
4. Muestra estadísticas y errores si los hay

## 🚀 Ejecutar la Aplicación

### Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Modo Producción

```bash
npm run build
npm start
```

## 📱 Uso de la Aplicación

### Crear Nueva Entrada

1. Ve a `/entries` y haz clic en "Nueva Entrada"
2. **Paso 1**: Sube imagen de INE
   - El sistema extraerá automáticamente los datos
   - Puedes omitir y llenar manualmente
3. **Paso 2**: Completa/edita el formulario
4. **Paso 3**: Sube selfie (el fondo se eliminará automáticamente)
5. Guarda la entrada

### Buscar Entradas

- Usa la barra de búsqueda en `/entries`
- Busca por **folio exacto** o por **nombre** (incluye segundo nombre y apellidos)
- La búsqueda ignora acentos y mayúsculas

### Ver Detalles

- Haz clic en "Ver detalles" de cualquier entrada
- Visualiza todos los campos y la selfie
- Descarga el PDF generado

### Editar Entrada

- Desde la página de detalles, haz clic en "Editar"
- Modifica los campos necesarios
- Guarda los cambios

### Descargar PDF

- Desde la página de detalles, haz clic en "Descargar PDF"
- El PDF incluye todos los datos del formulario y la selfie

## 🏗️ Estructura del Proyecto

```
soy-gallardo/
├── app/
│   ├── api/
│   │   ├── entries/
│   │   │   ├── route.ts              # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET (detail), PUT (update)
│   │   │       └── pdf/
│   │   │           └── route.ts      # GET (download PDF)
│   │   ├── ine/
│   │   │   └── parse/
│   │   │       └── route.ts          # POST (parse INE image)
│   │   ├── options/
│   │   │   ├── localidades/
│   │   │   │   └── route.ts          # GET (list localidades)
│   │   │   └── secciones/
│   │   │       └── route.ts          # GET (list secciones)
│   │   ├── selfie/
│   │   │   └── upload/
│   │   │       └── route.ts          # POST (upload selfie)
│   │   └── search/
│   │       └── route.ts              # GET (search entries)
│   ├── entries/
│   │   ├── page.tsx                  # List entries
│   │   ├── new/
│   │   │   └── page.tsx              # Create new entry
│   │   └── [id]/
│   │       ├── page.tsx              # Entry detail
│   │       └── edit/
│   │           └── page.tsx          # Edit entry
│   └── page.tsx                      # Home (redirects to /entries)
├── components/
│   ├── forms/
│   │   └── EntryForm.tsx             # Main entry form component
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       └── Textarea.tsx
├── lib/
│   ├── aws/
│   │   ├── dynamo.ts                 # DynamoDB operations
│   │   └── s3.ts                     # S3 operations
│   ├── csv.ts                        # CSV reading utilities
│   ├── openai.ts                     # OpenAI INE parsing
│   ├── pdf.ts                        # PDF generation
│   └── validation.ts                 # Zod schemas & types
├── scripts/
│   └── seed-dynamo.ts                # CSV import script
├── data/                             # CSV files (create this folder)
│   ├── entries-1.csv
│   ├── entries-2.csv
│   ├── colonia-comunidad.csv
│   └── secciones.csv
└── package.json
```

## 🔌 API Endpoints

### Entries

- `POST /api/entries` - Crear entrada
- `GET /api/entries?limit=50&lastKey=...` - Listar entradas (paginado)
- `GET /api/entries/[id]` - Obtener entrada por ID
- `PUT /api/entries/[id]` - Actualizar entrada
- `GET /api/entries/[id]/pdf` - Descargar PDF de entrada

### INE

- `POST /api/ine/parse` - Analizar imagen INE con OpenAI
  - Body: `multipart/form-data` con campo `ine`
  - Response: JSON con campos extraídos

### Selfie

- `POST /api/selfie/upload` - Subir selfie (con eliminación de fondo)
  - Body: `multipart/form-data` con campo `selfie`
  - Response: `{ url, s3Key }`

### Options

- `GET /api/options/localidades` - Obtener lista de localidades
- `GET /api/options/secciones` - Obtener lista de secciones

### Search

- `GET /api/search?q=query` - Buscar por folio o nombre
  - Response: `{ entries: Entry[] }`

## 🧪 Testing

### Probar API con curl

```bash
# Listar entradas
curl http://localhost:3000/api/entries

# Buscar entrada
curl "http://localhost:3000/api/search?q=Juan"

# Obtener opciones
curl http://localhost:3000/api/options/localidades
curl http://localhost:3000/api/options/secciones
```

## 🔒 Seguridad

- Las credenciales de AWS nunca se exponen al cliente
- Las subidas de archivos tienen límites de tamaño (10MB)
- Validación de tipos de archivo (solo imágenes)
- Validación de datos con Zod en cliente y servidor
- Variables de entorno para información sensible

## 🐛 Troubleshooting

### Error: "Module not found"

Asegúrate de haber ejecutado `npm install`

### Error: "AWS credentials not found"

Verifica que las variables `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` estén en `.env.local`

### Error: "Table not found"

Asegúrate de haber creado la tabla de DynamoDB con el nombre correcto

### Error: "Background removal failed"

Si la eliminación de fondo falla, la aplicación usará la imagen original. Esto es normal si el paquete `@imgly/background-removal-node` tiene problemas de compatibilidad.

### CSV no encontrado

Asegúrate de que la carpeta `data/` exista en la raíz del proyecto con los archivos CSV necesarios.

## 📝 Notas Adicionales

### Personalización de Dropdowns

Los dropdowns de localidades y secciones se cargan desde los archivos CSV. Si tus CSVs tienen nombres de columna diferentes, ajusta `lib/csv.ts`:

```typescript
// En getLocalidades()
const localidades = records
  .map((record) => record.TU_NOMBRE_DE_COLUMNA)
  .filter(Boolean);
```

### Ajustar Mapeo de CSV en Seed

Si los nombres de las columnas en tus CSVs de entries son diferentes, ajusta la función `mapCSVToEntry` en `scripts/seed-dynamo.ts`.

### Costos de AWS

- DynamoDB: Modo PAY_PER_REQUEST cobra por operación
- S3: Cobra por almacenamiento y transferencia
- OpenAI: Cobra por tokens de API (GPT-4 Vision)

### Producción

Para producción, considera:
- Usar IAM roles en lugar de access keys
- Configurar CloudFront para S3
- Implementar autenticación/autorización
- Añadir logs y monitoring
- Configurar backups de DynamoDB

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Soporte

Para preguntas o problemas, contacta al equipo de desarrollo.
