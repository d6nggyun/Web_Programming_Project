import React, { useRef, useState, useEffect } from 'react';

// IndexedDB 유틸 함수 (동일 파일 내에 선언하거나 별도 파일에서 import)
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

async function saveImageToIndexedDB(imageBase64, prompt) {
  const db = await openDB();
  const tx = db.transaction('images', 'readwrite');
  const store = tx.objectStore('images');
  store.add({ imageBase64, prompt, date: Date.now() });
  return tx.complete;
}

async function loadImagesFromIndexedDB() {
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

function ImageAI() {
  // 테마 관리(localStorage)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : true;
  });

  // 프롬프트 관리(localStorage)
  const [prompt, setPrompt] = useState(() => {
    return localStorage.getItem('lastPrompt') || '';
  });

  // 상태 및 ref
  const [status, setStatus] = useState("준비 됨.");
  const [savedImages, setSavedImages] = useState([]);
  const canvasRef = useRef(null);
  const spinnerRef = useRef(null);

  // 테마 적용
  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // 이미지 보관함 불러오기
  useEffect(() => {
    loadImagesFromIndexedDB().then(setSavedImages);
  }, []);

  // 프롬프트 입력 핸들러
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
    localStorage.setItem('lastPrompt', e.target.value);
  };

  // 테마 토글
  const handleThemeToggle = () => {
    setIsDarkMode((prev) => !prev);
  };

  // 이미지 생성
  const generateImage = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return alert("키워드를 입력해주세요.");
    setStatus("이미지 생성 중...");
    spinnerRef.current.style.display = "block";

    try {
      const response = await fetch("/api/generate", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });
      const data = await response.json();
      if (data.imageBase64) {
        // 캔버스에 그림
        const img = new window.Image();
        img.onload = async () => {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0);
          setStatus("이미지 생성 완료!");

          // IndexedDB에 저장
          await saveImageToIndexedDB(data.imageBase64, trimmedPrompt);
          const images = await loadImagesFromIndexedDB();
          setSavedImages(images);
        };
        img.src = "data:image/png;base64," + data.imageBase64;
      } else {
        throw new Error("이미지 생성 실패.");
      }
    } catch (error) {
      console.error(error);
      alert("서버 오류: " + error.message);
      setStatus("오류 발생.");
    } finally {
      spinnerRef.current.style.display = "none";
    }
  };

  // 이미지 다운로드
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas.width === 0 || canvas.height === 0) return alert("저장할 결과 이미지가 없습니다.");
    const link = document.createElement('a');
    link.download = `result-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <>
      <div id="header">
        <div className="header-left">
          <img src="image.png" alt="Build with AI 로고" className="logo-img" />
          <div className="header-actions">
            <button id="themeToggleBtn" onClick={handleThemeToggle}>
              {isDarkMode ? "☀️ 라이트 모드" : "🌙 다크 모드"}
            </button>
            <span id="status">{status}</span>
          </div>
        </div>
        <h1 className="main-title">⌨️ 키워드 기반 이미지 생성 서비스 ⌨️</h1>
      </div>

      <div id="container">
        <div id="left-panel">
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            placeholder="생성할 이미지의 키워드를 작성하세요"
          />
          <div id="button-group">
            <button className="genbtn" onClick={generateImage}>프롬프트로 이미지 생성</button>
            <button onClick={handleDownload}>결과 저장</button>
          </div>
          {/* 이미지 보관함 */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>내 이미지 보관함</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {savedImages.length === 0 && <div style={{ color: "#aaa" }}>저장된 이미지가 없습니다.</div>}
              {savedImages.map(img =>
                <div key={img.id}>
                  <img
                    src={`data:image/png;base64,${img.imageBase64}`}
                    alt={img.prompt}
                    width={120}
                    style={{ borderRadius: 8, border: "1px solid #ddd" }}
                  />
                  <div style={{ fontSize: 12, color: "#888", maxWidth:120, wordBreak:"break-all" }}>{img.prompt}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="right-panel">
          <canvas ref={canvasRef}></canvas>
          <div ref={spinnerRef} id="spinner" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'none'
          }}></div>
        </div>
      </div>
    </>
  );
}

export default ImageAI;
