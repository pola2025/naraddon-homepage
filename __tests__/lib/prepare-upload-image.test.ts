/**
 * 업로드 전 이미지 용량 강제 조정 테스트
 *
 * @context 2026-10-16 심사관 로고 업로드가 Vercel 요청 한도(4.5MB)에 걸려
 *          "Request Entity Too Large" 문구를 JSON 으로 읽다가 실패함
 * @decision 권장 용량(3MB)을 넘는 파일은 품질·해상도를 단계적으로 낮춰 권장 범위 안으로 맞춘다
 */
import {
  prepareUploadImage,
  compressionNotice,
  uploadErrorMessage,
  UPLOAD_RECOMMENDED_MB,
  UPLOAD_ORIGINAL_MAX_MB,
} from '../../src/lib/image/prepareUploadImage';
import { compressImage } from '../../src/lib/image/imageCompressor';

jest.mock('../../src/lib/image/imageCompressor', () => ({
  compressImage: jest.fn(),
}));

const MB = 1024 * 1024;
const mockedCompress = compressImage as jest.MockedFunction<typeof compressImage>;

// 실제 바이트를 만들지 않고 size 만 흉내 낸 File
function fakeFile(sizeBytes: number, type = 'image/jpeg', name = 'photo.jpg'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

function compressedTo(sizeBytes: number, type = 'image/jpeg') {
  const out = fakeFile(sizeBytes, type);
  return { file: out, originalSize: 0, compressedSize: sizeBytes, compressionRatio: 0 };
}

beforeEach(() => {
  mockedCompress.mockReset();
});

describe('prepareUploadImage', () => {
  it('권장 용량 이하 파일은 압축하지 않고 그대로 돌려준다', async () => {
    const file = fakeFile(2 * MB);
    const result = await prepareUploadImage(file, {
      maxWidthOrHeight: 1600,
      fileType: 'image/jpeg',
    });

    expect(result.file).toBe(file);
    expect(result.compressed).toBe(false);
    expect(mockedCompress).not.toHaveBeenCalled();
  });

  it('권장 용량을 넘으면 압축해서 권장 범위 안으로 맞춘다', async () => {
    mockedCompress.mockResolvedValueOnce(compressedTo(1.2 * MB));
    const file = fakeFile(8 * MB);

    const result = await prepareUploadImage(file, {
      maxWidthOrHeight: 1600,
      fileType: 'image/jpeg',
    });

    expect(result.compressed).toBe(true);
    expect(result.file.size).toBeLessThanOrEqual(UPLOAD_RECOMMENDED_MB * MB);
    expect(result.originalSize).toBe(8 * MB);
    expect(mockedCompress).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        maxSizeMB: UPLOAD_RECOMMENDED_MB,
        maxWidthOrHeight: 1600,
        fileType: 'image/jpeg',
      })
    );
  });

  it('한 번에 줄지 않으면 품질과 해상도를 더 낮춰 다시 시도한다', async () => {
    mockedCompress
      .mockResolvedValueOnce(compressedTo(4 * MB))
      .mockResolvedValueOnce(compressedTo(3.5 * MB))
      .mockResolvedValueOnce(compressedTo(2 * MB));

    const result = await prepareUploadImage(fakeFile(15 * MB), {
      maxWidthOrHeight: 1600,
      fileType: 'image/jpeg',
    });

    expect(result.file.size).toBe(2 * MB);
    expect(mockedCompress).toHaveBeenCalledTimes(3);
    const thirdCall = mockedCompress.mock.calls[2][1]!;
    expect(thirdCall.maxWidthOrHeight).toBeLessThan(1600);
  });

  it('모든 단계를 거쳐도 권장 용량을 넘으면 업로드를 막는다', async () => {
    mockedCompress.mockResolvedValue(compressedTo(5 * MB));

    await expect(
      prepareUploadImage(fakeFile(15 * MB), { maxWidthOrHeight: 1600, fileType: 'image/jpeg' })
    ).rejects.toThrow(`${UPLOAD_RECOMMENDED_MB}MB`);
  });

  it('원본 최대 용량을 넘는 파일은 압축 전에 거부한다', async () => {
    await expect(
      prepareUploadImage(fakeFile((UPLOAD_ORIGINAL_MAX_MB + 1) * MB), {
        maxWidthOrHeight: 1600,
        fileType: 'image/jpeg',
      })
    ).rejects.toThrow(`${UPLOAD_ORIGINAL_MAX_MB}MB`);
    expect(mockedCompress).not.toHaveBeenCalled();
  });

  it('이미지가 아닌 파일은 거부한다', async () => {
    await expect(
      prepareUploadImage(fakeFile(1 * MB, 'application/pdf', 'doc.pdf'), {
        maxWidthOrHeight: 1600,
        fileType: 'image/jpeg',
      })
    ).rejects.toThrow('이미지');
  });
});

describe('compressionNotice', () => {
  it('압축했을 때만 원본·결과 용량과 화질 안내를 돌려준다', () => {
    const notice = compressionNotice({
      file: fakeFile(1.4 * MB),
      compressed: true,
      originalSize: 8.2 * MB,
      finalSize: 1.4 * MB,
    });
    expect(notice).toContain('8.2MB');
    expect(notice).toContain('1.4MB');
    expect(notice).toContain('화질');

    expect(
      compressionNotice({
        file: fakeFile(1 * MB),
        compressed: false,
        originalSize: MB,
        finalSize: MB,
      })
    ).toBe('');
  });
});

describe('uploadErrorMessage', () => {
  it('413 응답이면 용량 안내 문구를 돌려준다', () => {
    expect(uploadErrorMessage(413, '업로드 실패')).toContain(`${UPLOAD_RECOMMENDED_MB}MB`);
  });

  it('그 밖의 상태는 기본 문구를 돌려준다', () => {
    expect(uploadErrorMessage(500, '업로드 실패')).toBe('업로드 실패');
  });
});
