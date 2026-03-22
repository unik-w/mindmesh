# MindMesh Backend API

## Running

```bash
uvicorn backend.main:app --reload
```

Docs available at `http://127.0.0.1:8000/docs`

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `JWT_SECRET` | Secret key for signing JWT tokens |

## Endpoints

### Auth

#### `POST /auth/login`

Authenticate with Google. Creates the user account on first login.

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `token` | string | yes | Google ID token from client-side Sign-In |

**Returns:** `{ "token": "<jwt>", "user": { ... } }`

---

#### `GET /auth/me`

Get the current authenticated user's profile.

**Headers:** `Authorization: Bearer <jwt>`

**Returns:** User object from the `users` table.

---

### User

All endpoints require `Authorization: Bearer <jwt>`.

#### `PUT /user/update_interests`

Update the authenticated user's interest topics.

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `interests` | string[] | yes | List of interest topics (e.g. `["Machine Learning", "Physics"]`) |

**Returns:** Updated user object.

---

#### `GET /user/likes`

Get all papers liked by the current user.

**Returns:** Array of paper objects (id, title, summary, authors, categories, links, published).

---

#### `GET /user/feed`

Get recommended papers based on the user's liked papers. Uses cosine similarity between the average embedding of liked papers and all other papers (pgvector).

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 20 | Number of results (1–100) |
| `offset` | int | 0 | Pagination offset |

**Returns:** Array of paper objects with a `similarity` score (0–1).

---

#### `POST /user/like`

Like a paper.

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `paper_id` | string | yes | ID of the paper to like |

**Returns:** The created like record.

---

#### `DELETE /user/dislike`

Remove a like from a paper.

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `paper_id` | string | yes | ID of the paper to unlike |

**Returns:** `{ "message": "Like removed" }`

---

### Paper

#### `GET /paper/search`

Search papers in the local database by title, summary, or authors.

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Search query (required) |
| `limit` | int | 20 | Number of results (1–100) |
| `offset` | int | 0 | Pagination offset |

**Returns:** Array of matching paper objects, ordered by publication date.

---

#### `GET /paper/list`

List all papers in the database.

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 20 | Number of results (1–100) |
| `offset` | int | 0 | Pagination offset |

**Returns:** Array of paper objects, ordered by publication date (newest first).

---

#### `POST /paper/insert`

Insert a paper into the database. Computes a SPECTER++ embedding (768-dim) from the title and summary, then upserts into the `papers` table.

**Headers:** `Authorization: Bearer <jwt>`

**Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique paper ID (e.g. arXiv URL) |
| `title` | string | yes | Paper title |
| `summary` | string | no | Abstract / summary |
| `authors` | string[] | no | List of author names |
| `categories` | string[] | no | List of categories |
| `links` | object | no | Links (e.g. `{"pdf": "..."}`) |
| `published` | string | no | Publication date (ISO 8601) |

**Returns:** The upserted paper record.

---

### arXiv

#### `GET /arxiv/search`

Search arXiv and automatically add results to the local database with computed embeddings.

**Headers:** `Authorization: Bearer <jwt>`

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Search query (required, searches all arXiv fields) |
| `start` | int | 0 | Pagination offset |
| `max_results` | int | 20 | Number of results (1–100) |

**Returns:**
```json
{
  "total_results": 1234,
  "start_index": 0,
  "items_per_page": 20,
  "papers": [ ... ]
}
```

Papers are upserted into the database with SPECTER++ embeddings as a side effect, enriching the recommendation system.
