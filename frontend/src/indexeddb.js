// DB 열기 및 objectStore 생성
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ImageAI_DB', 1);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 이미지 저장 (base64 또는 Blob)
export async function saveImageToIndexedDB(imageBase64, prompt) {
  const db = await openDB();
  const tx = db.transaction('images', 'readwrite');
  const store = tx.objectStore('images');
  store.add({ imageBase64, prompt, date: Date.now() });
  return tx.complete;
}

// 이미지 전체 불러오기
export async function loadImagesFromIndexedDB() {
  const db = await openDB();
  const tx = db.transaction('images', 'readonly');
  const store = tx.objectStore('images');
  return new Promise((resolve) => {
    const images = [];
    store.openCursor().onsuccess = function(event) {
      const cursor = event.target.result;
      if (cursor) {
        images.push(cursor.value);
        cursor.continue();
      } else {
        resolve(images);
      }
    };
  });
}
