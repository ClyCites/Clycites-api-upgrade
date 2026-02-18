
const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const idParam = { $ref: '#/components/parameters/mongoIdPath' };
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const mediaPaths: Record<string, unknown> = {

  '/api/v1/media/public/{key}': {
    get: {
      tags: ['Media'],
      summary: 'Serve public file',
      description: 'Streams a publicly accessible file. No authentication required.',
      operationId: 'servePublicFile',
      parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' }, description: 'S3 / storage key path (may contain slashes).' }],
      responses: {
        200: { description: 'File content.', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } }, 'image/*': { schema: { type: 'string', format: 'binary' } } } },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/media/serve/{key}': {
    get: {
      tags: ['Media'],
      summary: 'Generate signed URL / proxy serve',
      description: 'Returns a time-limited signed URL for accessing private files. Requires authentication.',
      operationId: 'serveSignedFile',
      security: auth,
      parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }, { name: 'download', in: 'query', schema: { type: 'boolean', default: false }, description: 'Force download disposition.' }],
      responses: {
        200: { description: 'Signed URL.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'object', properties: { url: { type: 'string', format: 'uri' }, expiresAt: { type: 'string', format: 'date-time' } } } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/media': {
    post: {
      tags: ['Media'],
      summary: 'Upload file',
      description: 'Upload a single file. Supports images, documents, and audio.',
      operationId: 'uploadMedia',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary' },
                folder: { type: 'string', description: 'Logical folder name (e.g., "avatars", "products").', example: 'products' },
                isPublic: { type: 'boolean', default: false },
                linkedModel: { type: 'string', enum: ['Product', 'FarmerProfile', 'Organization', 'PestDiseaseReport', 'KnowledgeArticle', 'User', 'Order'] },
                linkedId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
                altText: { type: 'string' },
                caption: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'File uploaded.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/MediaFile' } } }] } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        413: { description: 'Payload too large.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
    get: {
      tags: ['Media'],
      summary: 'List my uploaded files',
      operationId: 'listMyMedia',
      security: auth,
      parameters: [
        pageParam, limitParam,
        { name: 'folder', in: 'query', schema: { type: 'string' } },
        { name: 'mimeType', in: 'query', schema: { type: 'string' }, description: 'Filter by MIME type prefix, e.g. "image/".' },
        { name: 'isPublic', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: {
        200: { description: 'File list.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/MediaFile' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/media/{id}': {
    get: {
      tags: ['Media'],
      summary: 'Get file metadata by ID',
      operationId: 'getMedia',
      security: auth,
      parameters: [idParam],
      responses: {
        200: { description: 'File metadata.', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/MediaFile' } } }] } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Media'],
      summary: 'Update file metadata',
      operationId: 'updateMedia',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', properties: { altText: { type: 'string' }, caption: { type: 'string' }, isPublic: { type: 'boolean' }, folder: { type: 'string' } } }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
    delete: {
      tags: ['Media'],
      summary: 'Delete file',
      operationId: 'deleteMedia',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/media/{id}/signed-url': {
    get: {
      tags: ['Media'],
      summary: 'Get signed download URL',
      operationId: 'getMediaSignedUrl',
      security: auth,
      parameters: [idParam, { name: 'expiresIn', in: 'query', schema: { type: 'integer', default: 3600 }, description: 'Expiry in seconds.' }],
      responses: {
        200: { description: 'Signed URL.', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', format: 'uri' }, expiresAt: { type: 'string', format: 'date-time' } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/media/linked/{model}/{id}': {
    get: {
      tags: ['Media'],
      summary: 'Get all files linked to an entity',
      operationId: 'getLinkedMedia',
      security: auth,
      parameters: [
        { name: 'model', in: 'path', required: true, schema: { type: 'string', enum: ['Product', 'FarmerProfile', 'Organization', 'PestDiseaseReport', 'KnowledgeArticle', 'User', 'Order'] } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
      ],
      responses: { 200: { description: 'Linked files.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/media/{id}/link': {
    post: {
      tags: ['Media'],
      summary: 'Link file to an entity',
      operationId: 'linkMedia',
      security: auth,
      parameters: [idParam],
      requestBody: r({ type: 'object', required: ['linkedModel', 'linkedId'], properties: { linkedModel: { type: 'string', enum: ['Product', 'FarmerProfile', 'Organization', 'PestDiseaseReport', 'KnowledgeArticle', 'User', 'Order'] }, linkedId: { type: 'string', pattern: '^[a-f0-9]{24}$' } } }),
      responses: { 200: { description: 'Linked.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};
