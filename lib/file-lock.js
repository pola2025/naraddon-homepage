/**
 * file-lock.js
 *
 * 파일 기반 통신을 위한 안전한 읽기/쓰기 유틸리티
 * Race Condition 방지, Checksum 검증, 상태 머신 관리
 *
 * @author Claude A (PM/Developer)
 * @version 1.0.0
 * @date 2025-10-06
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * 상태 정의
 * - writing: 파일 쓰기 중 (읽기 금지)
 * - ready: 읽기 가능 상태
 * - processing: 처리 중 (중복 처리 방지)
 * - completed: 처리 완료 (삭제 가능)
 */
const FILE_STATUS = {
  WRITING: 'writing',
  READY: 'ready',
  PROCESSING: 'processing',
  COMPLETED: 'completed'
};

/**
 * 안전한 파일 쓰기 (상태 플래그 포함)
 *
 * @param {string} filePath - 파일 경로 (.claude/shared/*.json)
 * @param {object} data - 저장할 데이터
 * @param {object} metadata - 메타데이터
 * @param {string} metadata.from - 발신자 (claude-a | claude-b | claude-c)
 * @param {string} metadata.to - 수신자
 * @param {string} [metadata.taskId] - 작업 ID (자동 생성 가능)
 * @param {string} [metadata.replyTo] - 응답 대상 작업 ID
 * @returns {Promise<string>} taskId
 *
 * @example
 * const taskId = await safeWriteJSON('.claude/shared/task-from-a.json', {
 *   title: 'VideoForm 컴포넌트 분리',
 *   files: [...]
 * }, {
 *   from: 'claude-a',
 *   to: 'claude-b'
 * });
 */
async function safeWriteJSON(filePath, data, metadata) {
  validatePath(filePath);

  const tempPath = filePath + '.tmp';
  const taskId = metadata.taskId || generateTaskId();

  // 1. 페이로드 구성 (status: writing)
  const payload = {
    taskId,
    timestamp: new Date().toISOString(),
    from: metadata.from,
    to: metadata.to,
    status: FILE_STATUS.WRITING,
    version: '1.0.0',
    checksum: '',  // 나중에 계산
    content: data
  };

  // replyTo 필드 추가 (선택)
  if (metadata.replyTo) {
    payload.replyTo = metadata.replyTo;
  }

  // 2. Checksum 계산 (content만 해시)
  payload.checksum = calculateChecksum(payload.content);

  // 3. 임시 파일에 먼저 쓰기 (원자성 보장)
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');

  // 4. 상태를 "ready"로 변경
  payload.status = FILE_STATUS.READY;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');

  // 5. 원자적 이동 (rename은 원자적 연산)
  fs.renameSync(tempPath, filePath);

  console.log(`✅ 파일 안전 생성: ${filePath}`);
  console.log(`📋 작업 ID: ${taskId}`);

  return taskId;
}

/**
 * 안전한 파일 읽기 (상태 확인 포함)
 *
 * @param {string} filePath - 파일 경로
 * @param {number} [timeout=30000] - 최대 대기 시간 (ms)
 * @returns {Promise<object>} 파일 내용
 *
 * @throws {Error} Timeout 초과
 * @throws {Error} Checksum 불일치
 * @throws {Error} 잘못된 상태
 *
 * @example
 * const task = await safeReadJSON('.claude/shared/task-from-a.json');
 * console.log(task.content.title);  // "VideoForm 컴포넌트 분리"
 */
async function safeReadJSON(filePath, timeout = 30000) {
  validatePath(filePath);

  const startTime = Date.now();
  const pollInterval = 500;  // 0.5초마다 확인

  while (Date.now() - startTime < timeout) {
    // 1. 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      console.log(`⏳ 파일 대기 중: ${filePath}`);
      await sleep(pollInterval);
      continue;
    }

    // 2. 파일 읽기
    let payload;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      payload = JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️ JSON 파싱 오류 (재시도): ${error.message}`);
      await sleep(pollInterval);
      continue;
    }

    // 3. 상태 확인
    if (payload.status === FILE_STATUS.WRITING) {
      console.log(`⏳ 파일 쓰기 중 - 대기... (${Math.floor((Date.now() - startTime) / 1000)}초)`);
      await sleep(pollInterval);
      continue;
    }

    if (payload.status === FILE_STATUS.PROCESSING) {
      throw new Error('파일이 이미 처리 중입니다 (중복 처리 방지)');
    }

    if (payload.status === FILE_STATUS.COMPLETED) {
      throw new Error('파일이 이미 처리 완료되었습니다');
    }

    if (payload.status !== FILE_STATUS.READY) {
      throw new Error(`파일 상태 오류: ${payload.status}`);
    }

    // 4. Checksum 검증
    const expectedChecksum = calculateChecksum(payload.content);
    if (payload.checksum !== expectedChecksum) {
      throw new Error(`Checksum 불일치 - 데이터 손상 가능성\n예상: ${expectedChecksum}\n실제: ${payload.checksum}`);
    }

    // 5. 상태를 "processing"으로 변경 (중복 처리 방지)
    payload.status = FILE_STATUS.PROCESSING;
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    console.log(`✅ 파일 안전 읽기: ${filePath}`);
    console.log(`📋 작업 ID: ${payload.taskId}`);

    return payload;
  }

  // Timeout 초과
  throw new Error(`Timeout: 파일을 ${timeout}ms 내에 읽을 수 없음 (${filePath})`);
}

/**
 * 파일 처리 완료 표시
 *
 * @param {string} filePath - 파일 경로
 * @returns {Promise<void>}
 *
 * @example
 * await markAsCompleted('.claude/shared/task-from-a.json');
 */
async function markAsCompleted(filePath) {
  validatePath(filePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`파일이 존재하지 않습니다: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(content);

  payload.status = FILE_STATUS.COMPLETED;
  payload.completedAt = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`✅ 파일 처리 완료: ${filePath}`);
}

/**
 * 파일 삭제 (completed 상태일 때만)
 *
 * @param {string} filePath - 파일 경로
 * @returns {Promise<boolean>} 삭제 성공 여부
 *
 * @example
 * const deleted = await safeDelete('.claude/shared/task-from-a.json');
 * if (deleted) console.log('파일 삭제됨');
 */
async function safeDelete(filePath) {
  validatePath(filePath);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ 파일이 존재하지 않음: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(content);

  if (payload.status !== FILE_STATUS.COMPLETED) {
    console.warn(`⚠️ 파일 삭제 실패: 아직 처리 중 (status: ${payload.status})`);
    return false;
  }

  fs.unlinkSync(filePath);
  console.log(`🗑️ 파일 삭제: ${filePath}`);

  return true;
}

/**
 * Checksum 계산 (SHA-256)
 *
 * @param {object} content - 해시할 객체
 * @returns {string} 16자리 해시 (앞부분만)
 */
function calculateChecksum(content) {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');

  return hash.substring(0, 16);  // 16자리만 사용
}

/**
 * 작업 ID 생성
 *
 * @returns {string} TASK-{timestamp}-{random} 형식
 *
 * @example
 * const id = generateTaskId();  // "TASK-1728234567890-AB3DE"
 */
function generateTaskId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();

  return `TASK-${timestamp}-${random}`;
}

/**
 * 경로 검증 (보안)
 *
 * @param {string} filePath - 검증할 경로
 * @throws {Error} 허용되지 않은 경로
 */
function validatePath(filePath) {
  const allowedPaths = [
    '.claude/shared/',
    'logs/'
  ];

  const resolvedPath = path.resolve(filePath);

  const isAllowed = allowedPaths.some(p => {
    const allowedFullPath = path.resolve(p);
    return resolvedPath.startsWith(allowedFullPath);
  });

  if (!isAllowed) {
    throw new Error(`허용되지 않은 경로: ${filePath}\n허용 경로: ${allowedPaths.join(', ')}`);
  }
}

/**
 * Sleep 유틸리티
 *
 * @param {number} ms - 대기 시간 (ms)
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 파일 상태 확인 (디버깅용)
 *
 * @param {string} filePath - 파일 경로
 * @returns {object|null} 상태 정보
 *
 * @example
 * const status = getFileStatus('.claude/shared/task-from-a.json');
 * console.log(status.status);  // "ready"
 */
function getFileStatus(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(content);

    return {
      taskId: payload.taskId,
      status: payload.status,
      from: payload.from,
      to: payload.to,
      replyTo: payload.replyTo,
      timestamp: payload.timestamp,
      hasChecksum: !!payload.checksum
    };
  } catch (error) {
    return {
      error: error.message,
      readable: false
    };
  }
}

module.exports = {
  safeWriteJSON,
  safeReadJSON,
  markAsCompleted,
  safeDelete,
  calculateChecksum,
  generateTaskId,
  getFileStatus,
  FILE_STATUS
};
