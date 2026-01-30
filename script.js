// ================== CONFIG DB ==================
const dbName = 'ContactosDB';
const dbVersion = 1;
let db;

// ================== OPEN DB ==================
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            if (!db.objectStoreNames.contains('contactos')) {
                const store = db.createObjectStore('contactos', { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('email', 'email', { unique: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => reject(event.target.error);
    });
}

// ================== CRUD ==================
function addContact(contact) {
    return new Promise((resolve) => {
        const tx = db.transaction(['contactos'], 'readwrite');
        tx.objectStore('contactos').add(contact);
        tx.oncomplete = () => {
            loadContacts();
            resolve();
        };
    });
}

function updateContact(contact) {
    return new Promise((resolve) => {
        const tx = db.transaction(['contactos'], 'readwrite');
        tx.objectStore('contactos').put(contact);
        tx.oncomplete = () => {
            loadContacts();
            resolve();
        };
    });
}

function deleteContact(id) {
    const tx = db.transaction(['contactos'], 'readwrite');
    tx.objectStore('contactos').delete(id);
    tx.oncomplete = loadContacts;
}

function getAllContacts() {
    return new Promise((resolve) => {
        const tx = db.transaction(['contactos'], 'readonly');
        const request = tx.objectStore('contactos').getAll();
        request.onsuccess = () => resolve(request.result);
    });
}

// ================== RENDER ==================
function renderList(contacts) {
    const list = document.getElementById('contactList');
    list.innerHTML = '';

    if (contacts.length === 0) {
        list.innerHTML = '<li>No se encontraron contactos.</li>';
        return;
    }

    contacts.forEach(contact => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${contact.name} - ${contact.email} - ${contact.phone}</span>`;

        const btnContainer = document.createElement('div');

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.classList.add('edit');
        editBtn.onclick = () => {
            contactId.value = contact.id;
            name.value = contact.name;
            email.value = contact.email;
            phone.value = contact.phone;
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = () => deleteContact(contact.id);

        btnContainer.append(editBtn, deleteBtn);
        li.appendChild(btnContainer);
        list.appendChild(li);
    });
}

function loadContacts() {
    getAllContacts().then(renderList);
}

// ================== SEARCH ==================
function searchByName(query) {
    if (!query.trim()) {
        loadContacts();
        return;
    }

    const lower = query.toLowerCase();
    const tx = db.transaction(['contactos'], 'readonly');
    const store = tx.objectStore('contactos');
    const index = store.index('name');
    const request = index.getAll();

    request.onsuccess = () => {
        const filtered = request.result.filter(c =>
            c.name.toLowerCase().includes(lower)
        );
        renderList(filtered);
    };
}

// ================== EXPORT ==================
async function exportContacts() {
    const contacts = await getAllContacts();
    const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'contactos_backup.json';
    a.click();

    URL.revokeObjectURL(a.href);
}

// ================== IMPORT ==================
async function importContacts(file) {
    const text = await file.text();
    const data = JSON.parse(text);

    const tx = db.transaction(['contactos'], 'readwrite');
    const store = tx.objectStore('contactos');
    const indexEmail = store.index('email');

    for (const contact of data) {
        await new Promise(resolve => {
            const req = indexEmail.get(contact.email);
            req.onsuccess = () => {
                if (!req.result) store.add(contact);
                resolve();
            };
        });
    }

    tx.oncomplete = () => {
        loadContacts();
        alert('Importación completada');
    };
}

// ================== INIT ==================
document.addEventListener('DOMContentLoaded', async () => {
    await openDB();
    loadContacts();

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const contact = {
            name: name.value,
            email: email.value,
            phone: phone.value
        };

        if (contactId.value) {
            contact.id = parseInt(contactId.value);
            await updateContact(contact);
        } else {
            await addContact(contact);
        }

        contactForm.reset();
        contactId.value = '';
        searchInput.value = '';
    });

    searchInput.addEventListener('input', e => {
        searchByName(e.target.value);
    });

    clearSearchBtn.onclick = () => {
        searchInput.value = '';
        loadContacts();
    };

    exportar.onclick = exportContacts;

    importar.onclick = () => fileInput.click();

    fileInput.onchange = e => {
        if (e.target.files.length) {
            importContacts(e.target.files[0]);
        }
    };
});