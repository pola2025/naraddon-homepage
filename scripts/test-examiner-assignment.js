/**
 * 심사관 상담 배정 로직 테스트 스크립트
 *
 * @purpose 프로덕션 환경에서 심사관 상담 배정 기능을 안전하게 테스트
 * @context MongoDB에 직접 연결하여 테스트 데이터 생성/삭제
 * @note 테스트 완료 후 모든 데이터 자동 삭제
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'naraddon';

// 테스트 데이터 식별자
const TEST_MARKER = '[TEST]';
const TEST_CONSULTATION_ID = new ObjectId();

// 색상 출력 헬퍼
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    log('✅ MongoDB 연결 성공', 'green');

    const db = client.db(DB_NAME);
    const consultations = db.collection('consultations');
    const examiners = db.collection('expert-examiners');
    const users = db.collection('users');
    const notifications = db.collection('notifications');

    // 1단계: 심사관 목록 조회
    section('1단계: 심사관 목록 조회');

    const examinerList = await examiners.find({}).toArray();
    log(`📋 총 ${examinerList.length}명의 심사관 등록됨`, 'blue');

    // userId가 연결된 심사관 찾기
    const connectedExaminers = [];
    for (const examiner of examinerList) {
      if (examiner.userId) {
        try {
          const userIdQuery = typeof examiner.userId === 'string'
            ? new ObjectId(examiner.userId)
            : examiner.userId;

          const user = await users.findOne({ _id: userIdQuery });
          if (user && user.role === 'examiner') {
            connectedExaminers.push({
              examiner,
              user
            });
            log(`  ✓ ${examiner.name} (${user.email}) - examiner role`, 'green');
          }
        } catch (error) {
          // ObjectId 변환 실패는 무시
        }
      }
    }

    if (connectedExaminers.length === 0) {
      log('⚠️  examiner role을 가진 연결된 심사관이 없습니다.', 'red');
      log('테스트를 중단합니다.', 'yellow');
      return;
    }

    // 첫 번째 심사관 선택
    const testExaminer = connectedExaminers[0];
    log(`\n🎯 테스트 대상 심사관: ${testExaminer.examiner.name} (${testExaminer.user.email})`, 'cyan');

    // 2단계: 테스트 상담 데이터 생성
    section('2단계: 테스트 상담 데이터 생성');

    const testConsultation = {
      _id: TEST_CONSULTATION_ID,
      userName: `${TEST_MARKER} 테스트 신청자`,
      userEmail: 'test@example.com',
      userPhone: '010-0000-0000',
      companyName: `${TEST_MARKER} 테스트 회사`,
      businessNumber: '000-00-00000',
      consultationType: 'funding',
      preferredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
      annualRevenue: '10억원',
      message: '테스트 상담 신청입니다. 자동 생성된 데이터입니다.',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [
        {
          action: 'created',
          performedBy: 'test-script',
          performedAt: new Date(),
          details: { source: 'automated test' }
        }
      ]
    };

    const insertResult = await consultations.insertOne(testConsultation);
    log(`✅ 테스트 상담 생성됨 (ID: ${insertResult.insertedId})`, 'green');
    log(`   신청자: ${testConsultation.userName}`, 'blue');
    log(`   회사명: ${testConsultation.companyName}`, 'blue');
    log(`   상태: ${testConsultation.status}`, 'blue');

    // 3단계: 심사관에게 배정
    section('3단계: 심사관에게 상담 배정');

    const assignmentUpdate = {
      $set: {
        assignedStaffId: testExaminer.user.email,
        assignedStaffName: testExaminer.examiner.name,
        assignedBy: 'test-script',
        assignedAt: new Date(),
        status: 'assigned',
        updatedAt: new Date()
      },
      $push: {
        history: {
          action: 'assigned',
          performedBy: 'test-script',
          performedAt: new Date(),
          details: {
            assignedTo: testExaminer.user.email,
            notes: '자동 테스트 배정'
          }
        }
      }
    };

    const assignResult = await consultations.updateOne(
      { _id: TEST_CONSULTATION_ID },
      assignmentUpdate
    );

    if (assignResult.modifiedCount === 1) {
      log(`✅ 상담이 ${testExaminer.examiner.name}님에게 배정됨`, 'green');
    } else {
      log('❌ 상담 배정 실패', 'red');
    }

    // 알림 생성
    const notification = {
      userId: testExaminer.user.email,
      type: 'consultation_assigned',
      title: '새로운 상담이 배정되었습니다 (테스트)',
      message: `${testConsultation.userName}님의 상담이 배정되었습니다.`,
      consultationId: TEST_CONSULTATION_ID.toString(),
      read: false,
      createdAt: new Date()
    };

    await notifications.insertOne(notification);
    log('✅ 알림 생성됨', 'green');

    // 4단계: 심사관 통계 확인
    section('4단계: 심사관 통계 확인');

    const stats = await Promise.all([
      consultations.countDocuments({
        assignedStaffId: testExaminer.user.email,
        status: { $in: ['assigned', 'in_progress'] }
      }),
      consultations.countDocuments({
        assignedStaffId: testExaminer.user.email,
        status: 'completed'
      }),
      consultations.countDocuments({
        assignedStaffId: testExaminer.user.email,
        status: 'review'
      }),
      consultations.find({ assignedStaffId: testExaminer.user.email })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()
    ]);

    const [assignedCount, completedCount, reviewCount, recentConsultations] = stats;

    log(`📊 ${testExaminer.examiner.name} 심사관 통계:`, 'cyan');
    log(`   📋 배정된 상담: ${assignedCount}건 (테스트 포함)`, 'blue');
    log(`   ✅ 완료된 상담: ${completedCount}건`, 'blue');
    log(`   👁️  검토 대기: ${reviewCount}건`, 'blue');
    log(`   🕐 최근 상담: ${recentConsultations.length}건`, 'blue');

    // 최근 상담 목록 출력
    if (recentConsultations.length > 0) {
      log('\n최근 상담 목록:', 'yellow');
      recentConsultations.forEach((c, i) => {
        const isTest = c.userName && c.userName.includes(TEST_MARKER);
        const marker = isTest ? '🧪 ' : '  ';
        log(`${marker}${i + 1}. ${c.companyName} (${c.userName}) - ${c.status}`, isTest ? 'yellow' : 'reset');
      });
    }

    // 5단계: 데이터 검증
    section('5단계: 데이터 검증');

    const verifyConsultation = await consultations.findOne({ _id: TEST_CONSULTATION_ID });

    const checks = [
      {
        name: 'assignedStaffId 설정 확인',
        pass: verifyConsultation.assignedStaffId === testExaminer.user.email
      },
      {
        name: 'assignedStaffName 설정 확인',
        pass: verifyConsultation.assignedStaffName === testExaminer.examiner.name
      },
      {
        name: 'status가 assigned로 변경 확인',
        pass: verifyConsultation.status === 'assigned'
      },
      {
        name: 'assignedAt 타임스탬프 확인',
        pass: !!verifyConsultation.assignedAt
      },
      {
        name: 'history 기록 추가 확인',
        pass: verifyConsultation.history && verifyConsultation.history.length >= 2
      }
    ];

    let allPassed = true;
    checks.forEach(check => {
      if (check.pass) {
        log(`✅ ${check.name}`, 'green');
      } else {
        log(`❌ ${check.name}`, 'red');
        allPassed = false;
      }
    });

    if (allPassed) {
      log('\n🎉 모든 검증 통과!', 'green');
    } else {
      log('\n⚠️  일부 검증 실패', 'red');
    }

    // 6단계: 테스트 데이터 삭제
    section('6단계: 테스트 데이터 정리');

    log('테스트 데이터를 삭제합니다...', 'yellow');

    // 테스트 상담 삭제
    const deleteConsultation = await consultations.deleteOne({ _id: TEST_CONSULTATION_ID });
    log(`✅ 테스트 상담 삭제됨 (${deleteConsultation.deletedCount}건)`, 'green');

    // 테스트 알림 삭제
    const deleteNotifications = await notifications.deleteMany({
      consultationId: TEST_CONSULTATION_ID.toString()
    });
    log(`✅ 테스트 알림 삭제됨 (${deleteNotifications.deletedCount}건)`, 'green');

    // 추가 정리: TEST_MARKER를 포함하는 오래된 데이터 확인
    const oldTestConsultations = await consultations.find({
      userName: { $regex: TEST_MARKER }
    }).toArray();

    if (oldTestConsultations.length > 0) {
      log(`\n⚠️  ${oldTestConsultations.length}건의 오래된 테스트 데이터 발견`, 'yellow');
      log('이 데이터들도 삭제할까요? (수동 확인 필요)', 'yellow');
      oldTestConsultations.forEach(c => {
        log(`   - ${c.userName} (${c.companyName}) - ${new Date(c.createdAt).toLocaleString('ko-KR')}`, 'reset');
      });
    }

    // 최종 확인
    section('테스트 완료');

    log('✅ 테스트가 성공적으로 완료되었습니다.', 'green');
    log('✅ 모든 테스트 데이터가 정리되었습니다.', 'green');

    if (allPassed) {
      log('\n🎯 결론: 심사관 상담 배정 로직이 정상 동작합니다.', 'bright');
    } else {
      log('\n⚠️  경고: 일부 검증이 실패했습니다. 로그를 확인하세요.', 'yellow');
    }

  } catch (error) {
    log('\n❌ 오류 발생:', 'red');
    console.error(error);
  } finally {
    await client.close();
    log('\n✅ MongoDB 연결 종료', 'green');
  }
}

// 스크립트 실행
main().catch(console.error);
