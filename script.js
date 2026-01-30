// Variables globales
const dbName = 'ContactosDB'; // Nombre de la base de datos
const dbVersion = 1; // Versión (incrementa si cambias la estructura)
let db; // Referencia a la DB abierta
// Función para abrir/conectar a la DB (Paso clave de IndexedDB)
function openDB() {
 return new Promise((resolve, reject) => {
 const request = indexedDB.open(dbName, dbVersion);
 // Evento: Si la DB no existe o versión cambia, crea la estructura
 request.onupgradeneeded = (event) => {
 db = event.target.result;
 if (!db.objectStoreNames.contains('contactos')) {
 const store = db.createObjectStore('contactos', { keyPath: 'id', autoIncrement:
true });
 store.createIndex('name', 'name', { unique: false });
 store.createIndex('email', 'email', { unique: true }); // Email único para evitar duplicados
 }
 };
 // Evento: Éxito al abrir
 request.onsuccess = (event) => {
 db = event.target.result;
 resolve(db);
 };
 // Evento: Error
 request.onerror = (event) => reject(event.target.error);
 });
}
// Función para añadir un contacto (ALTA/Create)
async function addContact(contact) {
 const transaction = db.transaction(['contactos'], 'readwrite');
 const store = transaction.objectStore('contactos');
 await store.add(contact);
 transaction.oncomplete = () => loadContacts(); // Recarga la lista después
}
// Función para obtener todos los contactos (LECTURA/Read)
async function getAllContacts() {
 return new Promise((resolve) => {
 const transaction = db.transaction(['contactos'], 'readonly');
 const store = transaction.objectStore('contactos');
 const request = store.getAll();
 request.onsuccess = () => resolve(request.result);
 });
}
// Función para actualizar un contacto (MODIFICACIÓN/Update)
async function updateContact(contact) {
 const transaction = db.transaction(['contactos'], 'readwrite');
 const store = transaction.objectStore('contactos');
 await store.put(contact); // Put actualiza si el ID existe
 transaction.oncomplete = () => loadContacts();
}
// Función para eliminar un contacto (BAJA/Delete)
async function deleteContact(id) {
 const transaction = db.transaction(['contactos'], 'readwrite');
 const store = transaction.objectStore('contactos');
 await store.delete(id);
 transaction.oncomplete = () => loadContacts();
}
// Función para cargar y mostrar contactos en la lista
async function loadContacts() {
 const contacts = await getAllContacts();
 const list = document.getElementById('contactList');
 list.innerHTML = ''; // Limpia la lista
 contacts.forEach(contact => {
 const li = document.createElement('li');
 li.innerHTML = `${contact.name} - ${contact.email} - ${contact.phone}`;
 // Botón Editar
 const editBtn = document.createElement('button');
 editBtn.textContent = 'Editar';
 editBtn.classList.add('edit');
 editBtn.onclick = () => {
 document.getElementById('contactId').value = contact.id;
 document.getElementById('name').value = contact.name;
 document.getElementById('email').value = contact.email;
 document.getElementById('phone').value = contact.phone;
 };
 li.appendChild(editBtn);
 // Botón Eliminar
 const deleteBtn = document.createElement('button');
 deleteBtn.textContent = 'Eliminar';
 deleteBtn.onclick = () => deleteContact(contact.id);
 li.appendChild(deleteBtn);
 list.appendChild(li);
 });
}
// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
 await openDB();
 loadContacts();
 // Evento del formulario (Añadir o Editar)
 document.getElementById('contactForm').addEventListener('submit', async (e) => {
 e.preventDefault();
 const id = document.getElementById('contactId').value;
 const contact = {
 name: document.getElementById('name').value,
 email: document.getElementById('email').value,
 phone: document.getElementById('phone').value
 };
 if (id) {
 contact.id = parseInt(id); // Convierte a número
 await updateContact(contact);
 } else {
 await addContact(contact);
 }
 // Limpia el formulario
 document.getElementById('contactForm').reset();
 document.getElementById('contactId').value = '';
 });
});

function renderList(contacts) {
    const list = document.getElementById('contactList');
    list.innerHTML = ''; // Limpia la lista

    if (contacts.length === 0) {
        list.innerHTML = '<li>No se encontraron contactos.</li>';
        return;
    }

    contacts.forEach(function(contact) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${contact.name} - ${contact.email} - ${contact.phone}</span>`;
        
        // Contenedor de botones
        const btnContainer = document.createElement('div');

        // Botón Editar
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.classList.add('edit');
        editBtn.onclick = function() {
            document.getElementById('contactId').value = contact.id;
            document.getElementById('name').value = contact.name;
            document.getElementById('email').value = contact.email;
            document.getElementById('phone').value = contact.phone;
        };

        // Botón Eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = function() {
            deleteContact(contact.id);
        };

        btnContainer.appendChild(editBtn);
        btnContainer.appendChild(deleteBtn);
        li.appendChild(btnContainer);
        list.appendChild(li);
    });
}

// Modificamos loadContacts para usar renderList con .then()
function loadContacts() {
    // getAllContacts devuelve una promesa, usamos .then en lugar de await
    getAllContacts().then(function(contacts) {
        renderList(contacts);
    });
}


function searchByName(query) {
    // Si la búsqueda está vacía, cargamos todo
    if (!query.trim()) {
        loadContacts();
        return;
    }

    const lowerQuery = query.toLowerCase();

    const transaction = db.transaction(['contactos'], 'readonly');
    const store = transaction.objectStore('contactos');
    const index = store.index('name'); // Usamos el índice 'name'
    
    // Obtenemos todos los registros
    const request = index.getAll();

    request.onsuccess = function() {
        const allContacts = request.result;
        // Filtramos en memoria
        const filtered = allContacts.filter(function(c) {
            return c.name.toLowerCase().includes(lowerQuery);
        });
        renderList(filtered);
    };

    request.onerror = function(e) {
        console.error("Error buscando:", e);
    };
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // openDB devuelve promesa, encadenamos con .then
    openDB().then(function() {
        loadContacts();
    });

    document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const id = document.getElementById('contactId').value;
        const contact = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value
        };

        let actionPromise;

        if (id) {
            contact.id = parseInt(id);
            actionPromise = updateContact(contact);
        } else {
            actionPromise = addContact(contact);
        }

        // Se espera a que termine la acción (add o update) para limpiar
        actionPromise.then(function() {
            document.getElementById('contactForm').reset();
            document.getElementById('contactId').value = '';
            
            // Limpiamos el buscador para evitar inconsistencias visuales
            document.getElementById('searchInput').value = '';
        });
    });
    
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    // Buscar mientras se escribe
    searchInput.addEventListener('input', function(e) {
        searchByName(e.target.value);
    });

    // Botón Limpiar
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        loadContacts(); 
    });
});