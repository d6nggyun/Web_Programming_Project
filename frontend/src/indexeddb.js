// DB 열기 및 objectStore 생성
function openDB() {
  return new Promise((resolve, reject) => {
    // DB 이름과 버전 지정
    const request = indexedDB.open('ImageAI_DB', 1);

    // 버전 변경 or 최초 생성 시 호출됨
    request.onupgradeneeded = function(event) {
      const db = event.target.result;

      // 'images'라는 Object Store가 없으면 새로 생성 (keyPath: id, 자동 증가)
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
      }
    };

    // DB 열기 성공 시 DB 인스턴스 반환
    request.onsuccess = () => resolve(request.result);

    // 에러 발생 시 reject
    request.onerror = () => reject(request.error);
  });
}

// 이미지 저장 (base64 또는 Blob)
export async function saveImageToIndexedDB(imageBase64, prompt) {
   // DB 열기
  const db = await openDB();

  // 읽기 / 쓰기 트랜잭션 시작
  const tx = db.transaction('images', 'readwrite');

  // Object Store 접근
  const store = tx.objectStore('images');

  // 이미지 데이터 저장
  store.add({ imageBase64, prompt, date: Date.now() });

  // 트랜잭션 완료 시점 반환
  return tx.complete;
}

// 저장된 이미지 전체 불러오기
export async function loadImagesFromIndexedDB() {
  // DB 열기
  const db = await openDB(); 

  // 읽기 전용 트랜잭션 시작
  const tx = db.transaction('images', 'readonly'); 

  // Object Store 접근
  const store = tx.objectStore('images'); 

  // 모든 이미지 데이터를 배열로 모아서 반환
  return new Promise((resolve) => {
    const images = [];

    // Cursor로 모든 레코드 순회
    const request = store.openCursor(); 

    request.onsuccess = function(event) {
      const cursor = event.target.result;
      if (cursor) {
         // 현재 레코드 추가
        images.push(cursor.value);

        // 다음 레코드로 이동
        cursor.continue();         
      } else {
        // 더 이상 없으면 결과 반환
        resolve(images);           
      }
    };
  });
}