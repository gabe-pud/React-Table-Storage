import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const initialForm = { name: '', email: '', department: '', status: 'Ativo' };

function App() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editedStatus, setEditedStatus] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadContacts() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/contacts`);
      if (!response.ok) throw new Error('Falha ao carregar os contatos.');
      setContacts(await response.json());
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Falha ao salvar o contato.');
      setContacts((current) => [body, ...current]);
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(id) {
    try {
      const response = await fetch(`${API_URL}/contacts/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Falha ao excluir o contato.');
      setContacts((current) => current.filter((contact) => contact.id !== id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function startStatusEdit(contact) {
    setEditingId(contact.id);
    setEditedStatus(contact.status);
    setError('');
  }

  function cancelStatusEdit() {
    setEditingId(null);
    setEditedStatus('');
  }

  async function saveStatus(contact) {
    setStatusSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contact, status: editedStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Falha ao atualizar o status.');
      setContacts((current) => current.map((item) => item.id === contact.id ? body : item));
      cancelStatusEdit();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">CL</div>
        <div>
          <p className="eyebrow">Azure Table Storage</p>
          <h1>Contact Ledger</h1>
        </div>
        <span className="connection-pill"><span className="status-dot" /> API conectada</span>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow accent">Diretório interno</p>
          <h2>Registros que permanecem <em>organizados.</em></h2>
          <p className="intro-copy">Cadastre contatos, equipes e responsabilidades em uma tabela leve e pronta para crescer.</p>
        </div>
        <div className="record-count"><strong>{String(contacts.length).padStart(2, '0')}</strong><span>registros<br />armazenados</span></div>
      </section>

      <section className="workspace">
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="panel-heading"><span className="step">01</span><div><p className="eyebrow">Novo registro</p><h3>Adicionar contato</h3></div></div>
          <label>Nome completo<input name="name" value={form.name} onChange={updateField} placeholder="Ex.: Ana Souza" required /></label>
          <label>E-mail<input type="email" name="email" value={form.email} onChange={updateField} placeholder="ana@empresa.com" required /></label>
          <div className="field-row">
            <label>Departamento<input name="department" value={form.department} onChange={updateField} placeholder="Produto" required /></label>
            <label>Status<select name="status" value={form.status} onChange={updateField}><option>Ativo</option><option>Em férias</option><option>Inativo</option></select></label>
          </div>
          <button className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar registro'} <span>↗</span></button>
          <p className="form-note">Os dados serão salvos no Azure Table Storage.</p>
        </form>

        <section className="list-panel">
          <div className="list-heading"><div><p className="eyebrow">Visão geral</p><h3>Contatos recentes</h3></div><button className="refresh-button" onClick={loadContacts} title="Atualizar lista">↻</button></div>
          {error && <div className="error-message">{error}</div>}
          {loading ? <div className="empty-state">Carregando registros...</div> : contacts.length === 0 ? <div className="empty-state"><span>∅</span><p>Nenhum contato por aqui.<br />O primeiro registro começa ao lado.</p></div> : <div className="contact-list">{contacts.map((contact) => <article className="contact-row" key={contact.id}><div className="avatar">{contact.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="contact-info"><strong>{contact.name}</strong><span>{contact.email}</span></div><div className="contact-meta"><span className="department">{contact.department}</span>{editingId === contact.id ? <select className="status-editor" value={editedStatus} onChange={(event) => setEditedStatus(event.target.value)} aria-label={`Status de ${contact.name}`}><option>Ativo</option><option>Em férias</option><option>Inativo</option></select> : <span className={`status status-${contact.status.toLowerCase().replaceAll(' ', '-')}`}>{contact.status}</span>}</div><div className="row-actions">{editingId === contact.id ? <><button className="action-button save-action" onClick={() => saveStatus(contact)} disabled={statusSaving} title="Salvar status">{statusSaving ? '...' : '✓'}</button><button className="action-button" onClick={cancelStatusEdit} disabled={statusSaving} title="Cancelar edição">×</button></> : <button className="action-button" onClick={() => startStatusEdit(contact)} title={`Alterar status de ${contact.name}`}>✎</button>}<button className="delete-button" onClick={() => removeContact(contact.id)} title={`Excluir ${contact.name}`}>×</button></div></article>)}</div>}
        </section>
      </section>
      <footer><span>CONTACT LEDGER / 2026</span><span>PARTITION: CONTACTS</span></footer>
    </main>
  );
}

export default App;
