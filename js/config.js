// ============================================================
// 광선교회 홈페이지 설정 (이 파일만 채우면 모든 기능이 켜집니다)
// ============================================================

// [1] Firebase 설정값 — Firebase 콘솔 > 프로젝트 설정 > 웹 앱에서 복사
//     "여기를_채우세요" 부분을 실제 값으로 교체
const firebaseConfig = {
  apiKey: "AIzaSyAvx0cbHRoYcE37sh9nBNRSEHatysgOlWQ",
  authDomain: "gwangsun-church-board.firebaseapp.com",
  projectId: "gwangsun-church-board",
  storageBucket: "gwangsun-church-board.firebasestorage.app",
  messagingSenderId: "415301434231",
  appId: "1:415301434231:web:0510cab0bf88d01b187f72",
};

// [2] 관리자 구글 계정 (이 이메일로 로그인하면 주보 업로드/글 관리 가능)
const ADMIN_EMAILS = [
  "jehohw92@gmail.com",
];

// [3] Cloudinary (사진·주보 저장소) — cloudinary.com 가입 후
const CLOUDINARY = {
  cloudName: "dcpvbjsel",     // Cloudinary Cloud name
  uploadPreset: "gwangsun",   // unsigned 업로드 프리셋 이름
};

// [4] 유튜브 (지금은 링크 방식 — 나중에 API 키 넣으면 자동 기능 켜짐)
const YOUTUBE = {
  handle: "@광선교회",
  channelUrl: "https://www.youtube.com/@광선교회",
  liveUrl: "https://www.youtube.com/@광선교회/live",
  uploadsPlaylist: "UUYR8zybgk-5pgnD9e8p5_Sg", // 채널 업로드 재생목록
  apiKey: "", // (선택) 넣으면 라이브 자동감지·최신 쇼츠 자동표시
  channelId: "UCYR8zybgk-5pgnD9e8p5_Sg",
};

// 교회 기본 정보
const CHURCH = {
  name: "광선교회",
  fullName: "기독교 한국침례회 광선교회",
  slogan: "복음, 하나님의 나라, 영혼구원의 교회",
  founded: "1983. 3. 21",
  pastor: "김인병 목사",
  address: "울산광역시 동구 양지3길 24 (화정동)",
  zipcode: "44074",
  tel: "052-235-5004",
  account: "농협 351-0986-0884-03",
};
