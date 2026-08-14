import { del, get, patch, post, put } from '@/services/http';

/**
 * Serialize list/filter options into flat query params for named REST routes.
 * Arrays become comma-separated values (backend ResourceController expands them).
 */
export function toQueryParams(filter = {}, { sort, limit, skip, fields } = {}) {
  const params = {};

  for (const [key, value] of Object.entries(filter || {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      params[key] = value.join(',');
    } else if (value !== null && typeof value === 'object') {
      params[key] = JSON.stringify(value);
    } else {
      params[key] = value;
    }
  }

  if (sort !== undefined && sort !== null) params.sort = sort;
  if (limit !== undefined && limit !== null) params.limit = limit;
  if (skip !== undefined && skip !== null) params.skip = skip;
  if (fields !== undefined && fields !== null) {
    params.fields = Array.isArray(fields) ? fields.join(',') : fields;
  }

  return params;
}

/**
 * @param {string} collectionPath e.g. "tournaments" → /api/tournaments
 */
export function createResourceApi(collectionPath) {
  const base = `/api/${collectionPath}`;

  return {
    /** GET /api/{resource}?filters… → bare array */
    list(filter = {}, options = {}) {
      return get(base, { params: toQueryParams(filter, options), signal: options.signal });
    },

    /** Alias used during migration from entities.X.filter */
    filter(query = {}, sort, limit, skip, fields) {
      return this.list(query, { sort, limit, skip, fields });
    },

    /** GET /api/{resource}/:id → bare object */
    get(id, options = {}) {
      return get(`${base}/${encodeURIComponent(id)}`, { signal: options.signal });
    },

    /** POST /api/{resource} → created object (201) */
    create(body, options = {}) {
      return post(base, body, { signal: options.signal });
    },

    /** PATCH /api/{resource}/:id */
    update(id, body, options = {}) {
      return patch(`${base}/${encodeURIComponent(id)}`, body, { signal: options.signal });
    },

    /** DELETE /api/{resource}/:id */
    remove(id, options = {}) {
      return del(`${base}/${encodeURIComponent(id)}`, { signal: options.signal });
    },

    /** POST /api/{resource}/bulk */
    bulkCreate(rows, options = {}) {
      return post(`${base}/bulk`, rows, { signal: options.signal });
    },

    /** PUT /api/{resource}/bulk */
    bulkUpdate(rows, options = {}) {
      return put(`${base}/bulk`, rows, { signal: options.signal });
    },
  };
}
