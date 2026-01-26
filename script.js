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
 store.createIndex('email', 'email', { unique: true }); // Email único para evitar
duplicados
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