import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 3001);
const tableName = process.env.AZURE_TABLE_NAME || 'Contacts';
const partitionKey = 'contacts';
const memoryContacts = [];
const configuredOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: configuredOrigins.length
    ? (origin, callback) => callback(null, !origin || configuredOrigins.includes(origin))
    : true,
};

const client = createTableClient();

function createTableClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) return null;

  return TableClient.fromConnectionString(connectionString, tableName);
}

async function ensureTable() {
  if (!client) return;
  try {
    await client.createTable();
  } catch (error) {
    if (error.statusCode !== 409) throw error;
  }
}

function toContact(entity) {
  return {
    id: entity.rowKey,
    name: entity.name,
    email: entity.email,
    department: entity.department,
    status: entity.status,
    createdAt: entity.createdAt,
  };
}

function validateContact(body) {
  const fields = ['name', 'email', 'department', 'status'];
  const missing = fields.filter((field) => !String(body[field] || '').trim());
  return missing;
}

async function listContacts() {
  if (!client) return [...memoryContacts].reverse();

  const contacts = [];
  for await (const entity of client.listEntities()) contacts.push(toContact(entity));
  return contacts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ storage: client ? 'azure-table' : 'memory' });
});

app.get('/api/contacts', async (_request, response) => {
  try {
    response.json(await listContacts());
  } catch (error) {
    response.status(500).json({ error: 'Nao foi possivel consultar os contatos.', detail: error.message });
  }
});

app.post('/api/contacts', async (request, response) => {
  const missing = validateContact(request.body);
  if (missing.length) {
    return response.status(400).json({ error: `Preencha: ${missing.join(', ')}.` });
  }

  const contact = {
    id: randomUUID(),
    name: String(request.body.name).trim(),
    email: String(request.body.email).trim(),
    department: String(request.body.department).trim(),
    status: String(request.body.status).trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    if (client) {
      await client.createEntity({
        partitionKey,
        rowKey: contact.id,
        name: contact.name,
        email: contact.email,
        department: contact.department,
        status: contact.status,
        createdAt: contact.createdAt,
      });
    } else {
      memoryContacts.push(contact);
    }
    response.status(201).json(contact);
  } catch (error) {
    response.status(500).json({ error: 'Nao foi possivel salvar o contato.', detail: error.message });
  }
});

app.put('/api/contacts/:id', async (request, response) => {
  const missing = validateContact(request.body);
  if (missing.length) return response.status(400).json({ error: `Preencha: ${missing.join(', ')}.` });

  const contact = {
    id: request.params.id,
    name: String(request.body.name).trim(),
    email: String(request.body.email).trim(),
    department: String(request.body.department).trim(),
    status: String(request.body.status).trim(),
    createdAt: request.body.createdAt || new Date().toISOString(),
  };

  try {
    if (client) {
      await client.updateEntity({
        partitionKey,
        rowKey: contact.id,
        name: contact.name,
        email: contact.email,
        department: contact.department,
        status: contact.status,
        createdAt: contact.createdAt,
      }, 'Replace');
    } else {
      const index = memoryContacts.findIndex((item) => item.id === contact.id);
      if (index === -1) return response.status(404).json({ error: 'Contato nao encontrado.' });
      memoryContacts[index] = contact;
    }
    response.json(contact);
  } catch (error) {
    response.status(500).json({ error: 'Nao foi possivel atualizar o contato.', detail: error.message });
  }
});

app.delete('/api/contacts/:id', async (request, response) => {
  try {
    if (client) {
      await client.deleteEntity(partitionKey, request.params.id);
    } else {
      const index = memoryContacts.findIndex((item) => item.id === request.params.id);
      if (index === -1) return response.status(404).json({ error: 'Contato nao encontrado.' });
      memoryContacts.splice(index, 1);
    }
    response.status(204).end();
  } catch (error) {
    response.status(500).json({ error: 'Nao foi possivel excluir o contato.', detail: error.message });
  }
});

ensureTable()
  .then(() => app.listen(port, () => console.log(`API disponivel em http://localhost:${port}`)))
  .catch((error) => {
    console.error('Falha ao preparar a tabela do Azure:', error.message);
    process.exit(1);
  });
